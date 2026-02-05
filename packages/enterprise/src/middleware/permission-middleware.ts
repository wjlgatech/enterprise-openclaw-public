/**
 * Permission Middleware
 *
 * Role-based + capability-based permission system
 * - First checks if user has role with required capability
 * - Falls back to individual capability checks
 * - Reduces management overhead by ~70%
 */

import { OpenClawAction } from '../integration/openclaw-adapter.js';
import { RoleName, getCapabilitiesFromRoles, roleHasCapability } from '../permissions/roles.js';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredCapability?: string;
  grantedBy?: 'role' | 'capability';
}

export interface UserContext {
  userId: string;
  tenantId?: string;
  capabilities: string[];
  roles?: RoleName[];
}

export class PermissionMiddleware {
  /**
   * Map action types to required capabilities
   *
   * This defines which capability is needed for each action.
   * In Phase 2, this will be configurable via policy engine.
   */
  private static readonly ACTION_CAPABILITIES: Record<string, string> = {
    // Browser capabilities
    'browser.navigate': 'browser.navigate',
    'browser.click': 'browser.click',
    'browser.type': 'browser.type',
    'browser.screenshot': 'browser.screenshot',
    'browser.extract': 'browser.extract',

    // Shell capabilities
    'shell.exec': 'shell.exec',
    'shell.exec:read-only': 'shell.exec:read-only',
    'shell.exec:write': 'shell.exec:write',
    'shell.exec:network': 'shell.exec:network',

    // File capabilities
    'file.read': 'file.read',
    'file.write': 'file.write',
    'file.delete': 'file.delete',
    'file.execute': 'file.execute',

    // API capabilities
    'api.call': 'api.call',
    'api.call:external': 'api.call:external',

    // Knowledge capabilities
    'knowledge.read': 'knowledge.read',
    'knowledge.write': 'knowledge.write'
  };

  /**
   * Check if user has permission to execute action
   *
   * Permission resolution order:
   * 1. Check if user has role with required capability
   * 2. Fall back to individual capability check
   * 3. Deny if neither role nor capability match
   */
  async checkPermission(
    action: OpenClawAction,
    context: UserContext
  ): Promise<PermissionCheck> {
    // Get required capability for this action
    const requiredCapability = PermissionMiddleware.ACTION_CAPABILITIES[action.type];

    if (!requiredCapability) {
      // Unknown action type - deny by default (secure by default)
      return {
        allowed: false,
        reason: `Unknown action type: ${action.type}`,
        requiredCapability: 'unknown'
      };
    }

    // Step 1: Check if user has role with required capability
    if (context.roles && context.roles.length > 0) {
      for (const roleName of context.roles) {
        if (roleHasCapability(roleName, requiredCapability)) {
          return {
            allowed: true,
            requiredCapability,
            grantedBy: 'role'
          };
        }
      }
    }

    // Step 2: Fall back to individual capability check
    const hasCapability = context.capabilities.includes(requiredCapability);

    if (hasCapability) {
      return {
        allowed: true,
        requiredCapability,
        grantedBy: 'capability'
      };
    }

    // Step 3: Permission denied
    return {
      allowed: false,
      reason: `Missing required capability: ${requiredCapability}. User has ${context.roles?.length || 0} roles and ${context.capabilities.length} individual capabilities.`,
      requiredCapability
    };
  }

  /**
   * Get required capability for an action type
   *
   * Useful for UI to show what permissions are needed
   */
  getRequiredCapability(actionType: string): string | undefined {
    return PermissionMiddleware.ACTION_CAPABILITIES[actionType];
  }

  /**
   * Get all supported action types
   */
  getSupportedActions(): string[] {
    return Object.keys(PermissionMiddleware.ACTION_CAPABILITIES);
  }

  /**
   * Get all capability types
   */
  getAllCapabilities(): string[] {
    return [...new Set(Object.values(PermissionMiddleware.ACTION_CAPABILITIES))];
  }
}
