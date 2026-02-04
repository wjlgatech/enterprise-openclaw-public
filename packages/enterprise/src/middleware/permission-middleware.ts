/**
 * Permission Middleware
 *
 * Simple capability-based permission system (Phase 1)
 * In Phase 2, we'll add full policy engine
 */

import { OpenClawAction } from '../integration/openclaw-adapter.js';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredCapability?: string;
}

export interface UserContext {
  userId: string;
  tenantId?: string;
  capabilities: string[];
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

    // Check if user has capability
    const hasCapability = context.capabilities.includes(requiredCapability);

    if (!hasCapability) {
      return {
        allowed: false,
        reason: `Missing required capability: ${requiredCapability}`,
        requiredCapability
      };
    }

    // Permission granted!
    return {
      allowed: true,
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
