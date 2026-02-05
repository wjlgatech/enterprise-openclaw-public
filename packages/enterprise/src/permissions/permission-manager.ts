/**
 * Permission Manager
 *
 * Manages user capabilities and role assignments.
 * In production, this would interact with a real database.
 * For now, we use in-memory storage with file persistence.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface UserPermissions {
  userId: string;
  capabilities: string[];
  roles: string[];
  updatedAt: number;
}

export interface RoleDefinition {
  name: string;
  capabilities: string[];
  description: string;
}

export interface PermissionChange {
  type: 'grant_capability' | 'revoke_capability' | 'assign_role' | 'remove_role';
  userId: string;
  capability?: string;
  role?: string;
  timestamp: number;
  reason?: string;
}

export class PermissionManager {
  private permissionsFile: string;
  private userPermissions: Map<string, UserPermissions> = new Map();
  private roles: Map<string, RoleDefinition> = new Map();
  private changeHistory: PermissionChange[] = [];

  constructor(permissionsFile: string = './data/permissions.json') {
    this.permissionsFile = permissionsFile;

    // Initialize default roles
    this.initializeRoles();
  }

  /**
   * Initialize default role definitions
   */
  private initializeRoles(): void {
    this.roles.set('Developer', {
      name: 'Developer',
      capabilities: ['file.read', 'file.write', 'shell.exec', 'browser.navigate', 'api.call'],
      description: 'Full development access including file operations and shell execution'
    });

    this.roles.set('Analyst', {
      name: 'Analyst',
      capabilities: ['file.read', 'browser.navigate', 'api.call', 'browser.extract'],
      description: 'Read-only access for data analysis and research'
    });

    this.roles.set('Admin', {
      name: 'Admin',
      capabilities: ['file.read', 'file.write', 'file.delete', 'shell.exec', 'browser.navigate', 'api.call', 'browser.click', 'browser.type'],
      description: 'Full administrative access to all capabilities'
    });
  }

  /**
   * Load permissions from file
   */
  async load(): Promise<void> {
    try {
      if (existsSync(this.permissionsFile)) {
        const content = await readFile(this.permissionsFile, 'utf-8');
        const data = JSON.parse(content);

        this.userPermissions.clear();
        if (data.users) {
          Object.entries(data.users).forEach(([userId, perms]: [string, any]) => {
            this.userPermissions.set(userId, perms);
          });
        }

        if (data.changeHistory) {
          this.changeHistory = data.changeHistory;
        }

        logger.info({ userCount: this.userPermissions.size }, 'Permissions loaded from file');
      } else {
        logger.info('No permissions file found, starting with empty permissions');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to load permissions file');
      throw error;
    }
  }

  /**
   * Save permissions to file
   */
  async save(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(this.permissionsFile);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      const data = {
        users: Object.fromEntries(this.userPermissions),
        changeHistory: this.changeHistory.slice(-100), // Keep last 100 changes
        lastUpdated: Date.now()
      };

      await writeFile(this.permissionsFile, JSON.stringify(data, null, 2));
      logger.debug('Permissions saved to file');
    } catch (error) {
      logger.error({ error }, 'Failed to save permissions file');
      throw error;
    }
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): UserPermissions {
    if (!this.userPermissions.has(userId)) {
      // Return default permissions for new users
      return {
        userId,
        capabilities: ['browser.navigate', 'api.call', 'file.read'], // Safe defaults
        roles: [],
        updatedAt: Date.now()
      };
    }

    return this.userPermissions.get(userId)!;
  }

  /**
   * Get all user capabilities (including from roles)
   */
  getUserCapabilities(userId: string): string[] {
    const perms = this.getUserPermissions(userId);
    const capabilities = new Set(perms.capabilities);

    // Add capabilities from roles
    perms.roles.forEach(roleName => {
      const role = this.roles.get(roleName);
      if (role) {
        role.capabilities.forEach(cap => capabilities.add(cap));
      }
    });

    return Array.from(capabilities);
  }

  /**
   * Grant capability to user
   */
  async grantCapability(userId: string, capability: string, reason?: string): Promise<void> {
    const perms = this.getUserPermissions(userId);

    if (!perms.capabilities.includes(capability)) {
      perms.capabilities.push(capability);
      perms.updatedAt = Date.now();

      this.userPermissions.set(userId, perms);

      // Record change
      this.changeHistory.push({
        type: 'grant_capability',
        userId,
        capability,
        timestamp: Date.now(),
        reason
      });

      await this.save();

      logger.info({ userId, capability, reason }, 'Capability granted');
    }
  }

  /**
   * Revoke capability from user
   */
  async revokeCapability(userId: string, capability: string, reason?: string): Promise<void> {
    const perms = this.getUserPermissions(userId);

    const index = perms.capabilities.indexOf(capability);
    if (index !== -1) {
      perms.capabilities.splice(index, 1);
      perms.updatedAt = Date.now();

      this.userPermissions.set(userId, perms);

      // Record change
      this.changeHistory.push({
        type: 'revoke_capability',
        userId,
        capability,
        timestamp: Date.now(),
        reason
      });

      await this.save();

      logger.info({ userId, capability, reason }, 'Capability revoked');
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleName: string, reason?: string): Promise<void> {
    const role = this.roles.get(roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const perms = this.getUserPermissions(userId);

    if (!perms.roles.includes(roleName)) {
      perms.roles.push(roleName);
      perms.updatedAt = Date.now();

      this.userPermissions.set(userId, perms);

      // Record change
      this.changeHistory.push({
        type: 'assign_role',
        userId,
        role: roleName,
        timestamp: Date.now(),
        reason
      });

      await this.save();

      logger.info({ userId, role: roleName, reason }, 'Role assigned');
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleName: string, reason?: string): Promise<void> {
    const perms = this.getUserPermissions(userId);

    const index = perms.roles.indexOf(roleName);
    if (index !== -1) {
      perms.roles.splice(index, 1);
      perms.updatedAt = Date.now();

      this.userPermissions.set(userId, perms);

      // Record change
      this.changeHistory.push({
        type: 'remove_role',
        userId,
        role: roleName,
        timestamp: Date.now(),
        reason
      });

      await this.save();

      logger.info({ userId, role: roleName, reason }, 'Role removed');
    }
  }

  /**
   * Get role definition
   */
  getRole(roleName: string): RoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Get all roles
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get change history
   */
  getChangeHistory(limit: number = 50): PermissionChange[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Check if user has capability (including from roles)
   */
  hasCapability(userId: string, capability: string): boolean {
    const capabilities = this.getUserCapabilities(userId);
    return capabilities.includes(capability);
  }

  /**
   * Get all users
   */
  getAllUsers(): UserPermissions[] {
    return Array.from(this.userPermissions.values());
  }
}
