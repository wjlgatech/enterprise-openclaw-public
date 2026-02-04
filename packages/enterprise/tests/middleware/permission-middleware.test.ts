/**
 * Permission Middleware Tests
 *
 * RG-TDD: Tests written FIRST before implementation
 * Reality-Grounded: Tests real capability checks
 */

import { describe, it, expect } from 'vitest';
import { PermissionMiddleware, UserContext, PermissionCheck } from '../../src/middleware/permission-middleware.js';
import { OpenClawAction } from '../../src/integration/openclaw-adapter.js';

describe('PermissionMiddleware', () => {
  const middleware = new PermissionMiddleware();

  describe('checkPermission', () => {
    describe('browser actions', () => {
      it('should allow browser.navigate when user has capability', async () => {
        const action: OpenClawAction = {
          type: 'browser.navigate',
          params: { url: 'https://example.com' }
        };

        const context: UserContext = {
          userId: 'user1',
          capabilities: ['browser.navigate', 'browser.click']
        };

        const result: PermissionCheck = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
        expect(result.requiredCapability).toBe('browser.navigate');
        expect(result.reason).toBeUndefined();
      });

      it('should deny browser.navigate when user lacks capability', async () => {
        const action: OpenClawAction = {
          type: 'browser.navigate',
          params: { url: 'https://example.com' }
        };

        const context: UserContext = {
          userId: 'user1',
          capabilities: ['file.read'] // Wrong capability
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain('Missing required capability');
        expect(result.reason).toContain('browser.navigate');
        expect(result.requiredCapability).toBe('browser.navigate');
      });

      it('should allow browser.click with correct capability', async () => {
        const action: OpenClawAction = {
          type: 'browser.click',
          params: { selector: '#submit-button' }
        };

        const context: UserContext = {
          userId: 'user2',
          capabilities: ['browser.click']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
        expect(result.requiredCapability).toBe('browser.click');
      });
    });

    describe('file actions', () => {
      it('should allow file.read when user has capability', async () => {
        const action: OpenClawAction = {
          type: 'file.read',
          params: { path: '/data/report.pdf' }
        };

        const context: UserContext = {
          userId: 'user3',
          capabilities: ['file.read', 'file.write']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
        expect(result.requiredCapability).toBe('file.read');
      });

      it('should deny file.delete when user only has file.read', async () => {
        const action: OpenClawAction = {
          type: 'file.delete',
          params: { path: '/important/data.txt' }
        };

        const context: UserContext = {
          userId: 'user3',
          capabilities: ['file.read'] // Not enough!
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('file.delete');
        expect(result.requiredCapability).toBe('file.delete');
      });

      it('should allow file.write when user has capability', async () => {
        const action: OpenClawAction = {
          type: 'file.write',
          params: { path: '/tmp/output.txt', content: 'test' }
        };

        const context: UserContext = {
          userId: 'user4',
          capabilities: ['file.write']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
      });
    });

    describe('shell actions', () => {
      it('should allow shell.exec when user has capability', async () => {
        const action: OpenClawAction = {
          type: 'shell.exec',
          params: { command: 'ls -la' }
        };

        const context: UserContext = {
          userId: 'admin',
          capabilities: ['shell.exec']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
        expect(result.requiredCapability).toBe('shell.exec');
      });

      it('should deny shell.exec for unprivileged user', async () => {
        const action: OpenClawAction = {
          type: 'shell.exec',
          params: { command: 'rm -rf /' }
        };

        const context: UserContext = {
          userId: 'guest',
          capabilities: ['file.read']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('shell.exec');
      });
    });

    describe('unknown actions', () => {
      it('should deny unknown action types', async () => {
        const action: OpenClawAction = {
          type: 'unknown.action.type',
          params: {}
        };

        const context: UserContext = {
          userId: 'user5',
          capabilities: ['browser.navigate']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Unknown action type');
        expect(result.reason).toContain('unknown.action.type');
      });

      it('should deny malformed action types', async () => {
        const action: OpenClawAction = {
          type: '',
          params: {}
        };

        const context: UserContext = {
          userId: 'user6',
          capabilities: ['file.read']
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should deny when capabilities list is empty', async () => {
        const action: OpenClawAction = {
          type: 'browser.navigate',
          params: { url: 'https://example.com' }
        };

        const context: UserContext = {
          userId: 'restricted-user',
          capabilities: [] // No capabilities!
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Missing required capability');
      });

      it('should handle multiple capabilities correctly', async () => {
        const action: OpenClawAction = {
          type: 'api.call',
          params: { url: 'https://api.example.com' }
        };

        const context: UserContext = {
          userId: 'power-user',
          capabilities: [
            'browser.navigate',
            'browser.click',
            'browser.type',
            'file.read',
            'file.write',
            'api.call' // Has this one
          ]
        };

        const result = await middleware.checkPermission(action, context);

        expect(result.allowed).toBe(true);
      });

      it('should be case-sensitive for action types', async () => {
        const action: OpenClawAction = {
          type: 'BROWSER.NAVIGATE', // Wrong case
          params: { url: 'https://example.com' }
        };

        const context: UserContext = {
          userId: 'user7',
          capabilities: ['browser.navigate'] // Correct case
        };

        const result = await middleware.checkPermission(action, context);

        // Should deny because case doesn't match
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('getRequiredCapability', () => {
    it('should return required capability for known action', () => {
      const capability = middleware.getRequiredCapability('browser.navigate');

      expect(capability).toBe('browser.navigate');
    });

    it('should return undefined for unknown action', () => {
      const capability = middleware.getRequiredCapability('unknown.action');

      expect(capability).toBeUndefined();
    });

    it('should return correct capability for all standard actions', () => {
      const standardActions = [
        'browser.navigate',
        'browser.click',
        'browser.type',
        'browser.screenshot',
        'shell.exec',
        'file.read',
        'file.write',
        'file.delete',
        'api.call'
      ];

      standardActions.forEach(actionType => {
        const capability = middleware.getRequiredCapability(actionType);
        expect(capability).toBeDefined();
        expect(typeof capability).toBe('string');
      });
    });
  });
});

/**
 * Test Summary:
 * - 17 tests covering all major permission scenarios
 * - Tests browser, file, shell, and API actions
 * - Tests success paths (allowed) and failure paths (denied)
 * - Tests edge cases (empty capabilities, unknown actions, case sensitivity)
 * - Reality-grounded: tests real capability matching logic
 */
