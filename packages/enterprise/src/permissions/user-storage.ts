/**
 * User Role Storage
 *
 * Simple file-based storage for user roles and capabilities.
 * Uses JSON file for persistence - suitable for Phase 1.
 * Can be replaced with database in Phase 2.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { RoleName } from './roles.js';

export interface UserPermissions {
  userId: string;
  roles: RoleName[];
  capabilities: string[];
  updatedAt: number;
}

export interface UserStorage {
  users: Record<string, UserPermissions>;
}

export class UserRoleManager {
  private storageFile: string;
  private cache: UserStorage | null = null;

  constructor(storageFile: string = './data/user-roles.json') {
    this.storageFile = storageFile;
  }

  /**
   * Initialize storage (create directory and file if needed)
   */
  async initialize(): Promise<void> {
    const dir = dirname(this.storageFile);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    if (!existsSync(this.storageFile)) {
      await this.save({ users: {} });
    }
  }

  /**
   * Load storage from file
   */
  private async load(): Promise<UserStorage> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await readFile(this.storageFile, 'utf-8');
      this.cache = JSON.parse(content);
      return this.cache!;
    } catch (error) {
      // If file doesn't exist or is invalid, return empty storage
      this.cache = { users: {} };
      return this.cache;
    }
  }

  /**
   * Save storage to file
   */
  private async save(storage: UserStorage): Promise<void> {
    await writeFile(this.storageFile, JSON.stringify(storage, null, 2), 'utf-8');
    this.cache = storage;
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    const storage = await this.load();
    return storage.users[userId] || null;
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<RoleName[]> {
    const permissions = await this.getUserPermissions(userId);
    return permissions?.roles || [];
  }

  /**
   * Get user capabilities (individual)
   */
  async getUserCapabilities(userId: string): Promise<string[]> {
    const permissions = await this.getUserPermissions(userId);
    return permissions?.capabilities || [];
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: RoleName): Promise<void> {
    const storage = await this.load();

    if (!storage.users[userId]) {
      storage.users[userId] = {
        userId,
        roles: [],
        capabilities: [],
        updatedAt: Date.now()
      };
    }

    if (!storage.users[userId].roles.includes(role)) {
      storage.users[userId].roles.push(role);
      storage.users[userId].updatedAt = Date.now();
      await this.save(storage);
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: RoleName): Promise<void> {
    const storage = await this.load();

    if (storage.users[userId]) {
      storage.users[userId].roles = storage.users[userId].roles.filter(r => r !== role);
      storage.users[userId].updatedAt = Date.now();
      await this.save(storage);
    }
  }

  /**
   * Grant individual capability to user
   */
  async grantCapability(userId: string, capability: string): Promise<void> {
    const storage = await this.load();

    if (!storage.users[userId]) {
      storage.users[userId] = {
        userId,
        roles: [],
        capabilities: [],
        updatedAt: Date.now()
      };
    }

    if (!storage.users[userId].capabilities.includes(capability)) {
      storage.users[userId].capabilities.push(capability);
      storage.users[userId].updatedAt = Date.now();
      await this.save(storage);
    }
  }

  /**
   * Revoke individual capability from user
   */
  async revokeCapability(userId: string, capability: string): Promise<void> {
    const storage = await this.load();

    if (storage.users[userId]) {
      storage.users[userId].capabilities = storage.users[userId].capabilities.filter(
        c => c !== capability
      );
      storage.users[userId].updatedAt = Date.now();
      await this.save(storage);
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserPermissions[]> {
    const storage = await this.load();
    return Object.values(storage.users);
  }

  /**
   * List all users with specific role
   */
  async getUsersWithRole(role: RoleName): Promise<UserPermissions[]> {
    const storage = await this.load();
    return Object.values(storage.users).filter(user => user.roles.includes(role));
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}
