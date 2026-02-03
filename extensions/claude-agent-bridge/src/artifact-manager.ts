/**
 * Artifact Manager
 * Stores and versions Claude-generated artifacts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Artifact } from './types';

export interface ArtifactFilters {
  type?: string;
  language?: string;
  fromDate?: Date;
  toDate?: Date;
}

export class ArtifactManager {
  private storageDir: string;
  private artifacts: Map<string, Artifact> = new Map();
  private versions: Map<string, Artifact[]> = new Map();

  constructor(storageDir = './data/artifacts') {
    this.storageDir = storageDir;
  }

  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await this.loadArtifacts();
  }

  /**
   * Store a new artifact
   */
  async store(artifact: Artifact): Promise<string> {
    // Store in memory
    this.artifacts.set(artifact.id, artifact);

    // Store to disk
    const filename = `${artifact.id}.json`;
    const filepath = path.join(this.storageDir, filename);
    await fs.writeFile(filepath, JSON.stringify(artifact, null, 2));

    return artifact.id;
  }

  /**
   * Retrieve artifact by ID
   */
  async get(artifactId: string): Promise<Artifact | null> {
    // Check memory first
    if (this.artifacts.has(artifactId)) {
      return this.artifacts.get(artifactId)!;
    }

    // Try loading from disk
    const filepath = path.join(this.storageDir, `${artifactId}.json`);
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const artifact = JSON.parse(content) as Artifact;
      // Restore Date objects
      artifact.createdAt = new Date(artifact.createdAt);
      this.artifacts.set(artifactId, artifact);
      return artifact;
    } catch (error) {
      return null;
    }
  }

  /**
   * List artifacts with optional filters
   */
  async list(filters: ArtifactFilters = {}): Promise<Artifact[]> {
    let results = Array.from(this.artifacts.values());

    // Apply filters
    if (filters.type) {
      results = results.filter((a) => a.type === filters.type);
    }
    if (filters.language) {
      results = results.filter((a) => a.language === filters.language);
    }
    if (filters.fromDate) {
      results = results.filter((a) => a.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      results = results.filter((a) => a.createdAt <= filters.toDate!);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  /**
   * Create new version of artifact
   */
  async version(artifactId: string, content: string): Promise<string> {
    const original = await this.get(artifactId);
    if (!original) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    // Create new version
    const newVersion: Artifact = {
      ...original,
      id: `${artifactId}-v${original.version + 1}`,
      content,
      version: original.version + 1,
      createdAt: new Date(),
    };

    // Track versions
    if (!this.versions.has(artifactId)) {
      this.versions.set(artifactId, [original]);
    }
    this.versions.get(artifactId)!.push(newVersion);

    // Store new version
    await this.store(newVersion);

    return newVersion.id;
  }

  /**
   * Get all versions of an artifact
   */
  getVersions(artifactId: string): Artifact[] {
    return this.versions.get(artifactId) || [];
  }

  /**
   * Delete artifact
   */
  async delete(artifactId: string): Promise<boolean> {
    // Remove from memory
    this.artifacts.delete(artifactId);
    this.versions.delete(artifactId);

    // Remove from disk
    const filepath = path.join(this.storageDir, `${artifactId}.json`);
    try {
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load all artifacts from disk
   */
  private async loadArtifacts(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filepath = path.join(this.storageDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const artifact = JSON.parse(content) as Artifact;
        // Restore Date objects
        artifact.createdAt = new Date(artifact.createdAt);
        this.artifacts.set(artifact.id, artifact);
      }
    } catch (error) {
      // Directory doesn't exist yet, will be created on first store
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byLanguage: Record<string, number>;
  } {
    const artifacts = Array.from(this.artifacts.values());
    const byType: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};

    artifacts.forEach((a) => {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.language) {
        byLanguage[a.language] = (byLanguage[a.language] || 0) + 1;
      }
    });

    return {
      total: artifacts.length,
      byType,
      byLanguage,
    };
  }
}
