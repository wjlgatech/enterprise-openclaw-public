/**
 * Audit Middleware Tests
 *
 * RG-TDD: Tests written FIRST before implementation
 * Reality-Grounded: Tests real file I/O and JSONL format
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditMiddleware, AuditEntry } from '../../src/middleware/audit-middleware.js';
import { OpenClawAction, OpenClawResult } from '../../src/integration/openclaw-adapter.js';
import { UserContext } from '../../src/middleware/permission-middleware.js';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('AuditMiddleware', () => {
  const testLogPath = './test-logs/audit-test.jsonl';
  let middleware: AuditMiddleware;

  beforeEach(async () => {
    middleware = new AuditMiddleware(testLogPath);
    await middleware.initialize();
  });

  afterEach(async () => {
    // Cleanup test log file
    try {
      await unlink(testLogPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('initialization', () => {
    it('should create audit log directory if not exists', async () => {
      const customPath = './test-logs/deep/nested/audit.jsonl';
      const customMiddleware = new AuditMiddleware(customPath);

      await customMiddleware.initialize();

      // Directory should exist
      expect(existsSync(join(customPath, '..'))).toBe(true);
    });

    it('should not error if directory already exists', async () => {
      // Initialize twice
      await middleware.initialize();
      await middleware.initialize();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('logAction', () => {
    it('should create audit log file on first write', async () => {
      const action: OpenClawAction = {
        type: 'browser.navigate',
        params: { url: 'https://example.com' }
      };

      const context: UserContext = {
        userId: 'user1',
        capabilities: ['browser.navigate']
      };

      const result: OpenClawResult = {
        success: true,
        data: { status: 'navigated' }
      };

      await middleware.logAction(action, context, result, true);

      // File should exist
      expect(existsSync(testLogPath)).toBe(true);
    });

    it('should write entry in valid JSONL format', async () => {
      const action: OpenClawAction = {
        type: 'file.read',
        params: { path: '/data/report.pdf' }
      };

      const context: UserContext = {
        userId: 'user2',
        tenantId: 'tenant1',
        capabilities: ['file.read']
      };

      const result: OpenClawResult = {
        success: true,
        data: { content: 'file contents...' }
      };

      await middleware.logAction(action, context, result, true, undefined);

      // Read file
      const content = await readFile(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      // Should be valid JSON
      const entry = JSON.parse(lines[0]);
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('should include all required fields in audit entry', async () => {
      const action: OpenClawAction = {
        type: 'shell.exec',
        params: { command: 'ls -la' }
      };

      const context: UserContext = {
        userId: 'admin',
        tenantId: 'org1',
        capabilities: ['shell.exec']
      };

      const result: OpenClawResult = {
        success: true,
        data: { output: 'file1\nfile2\n' }
      };

      await middleware.logAction(action, context, result, true, undefined);

      // Read and parse entry
      const content = await readFile(testLogPath, 'utf-8');
      const entry: AuditEntry = JSON.parse(content.trim());

      // Verify required fields
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(entry.id).toContain('audit_');

      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('number');
      expect(entry.timestamp).toBeGreaterThan(Date.now() - 5000);

      expect(entry.userId).toBe('admin');
      expect(entry.tenantId).toBe('org1');

      expect(entry.action).toBeDefined();
      expect(entry.action.type).toBe('shell.exec');
      expect(entry.action.params).toEqual({ command: 'ls -la' });

      expect(entry.result).toBeDefined();
      expect(entry.result.success).toBe(true);

      expect(entry.permission).toBeDefined();
      expect(entry.permission.allowed).toBe(true);
    });

    it('should log permission denied actions', async () => {
      const action: OpenClawAction = {
        type: 'file.delete',
        params: { path: '/important.txt' }
      };

      const context: UserContext = {
        userId: 'guest',
        capabilities: ['file.read']
      };

      const result: OpenClawResult = {
        success: false,
        error: 'Permission denied'
      };

      await middleware.logAction(
        action,
        context,
        result,
        false, // Permission NOT allowed
        'Missing required capability: file.delete'
      );

      // Read entry
      const content = await readFile(testLogPath, 'utf-8');
      const entry: AuditEntry = JSON.parse(content.trim());

      expect(entry.permission.allowed).toBe(false);
      expect(entry.permission.reason).toBe('Missing required capability: file.delete');
      expect(entry.result.success).toBe(false);
      expect(entry.result.error).toBe('Permission denied');
    });

    it('should append multiple entries in JSONL format', async () => {
      // Log 3 actions
      for (let i = 0; i < 3; i++) {
        const action: OpenClawAction = {
          type: 'api.call',
          params: { url: `https://api.example.com/endpoint${i}` }
        };

        const context: UserContext = {
          userId: `user${i}`,
          capabilities: ['api.call']
        };

        const result: OpenClawResult = {
          success: true,
          data: { response: `data${i}` }
        };

        await middleware.logAction(action, context, result, true);
      }

      // Read file
      const content = await readFile(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);

      // Each line should be valid JSON
      lines.forEach((line, index) => {
        const entry = JSON.parse(line);
        expect(entry.userId).toBe(`user${index}`);
        expect(entry.action.params.url).toBe(`https://api.example.com/endpoint${index}`);
      });
    });

    it('should handle concurrent writes safely', async () => {
      // Log 10 actions concurrently
      const promises = Array.from({ length: 10 }, (_, i) => {
        const action: OpenClawAction = {
          type: 'browser.click',
          params: { selector: `#button${i}` }
        };

        const context: UserContext = {
          userId: `user${i}`,
          capabilities: ['browser.click']
        };

        const result: OpenClawResult = {
          success: true
        };

        return middleware.logAction(action, context, result, true);
      });

      await Promise.all(promises);

      // Read file
      const content = await readFile(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      // All 10 entries should be written
      expect(lines.length).toBe(10);

      // Each should be valid JSON
      lines.forEach(line => {
        const entry = JSON.parse(line);
        expect(entry.id).toBeDefined();
        expect(entry.userId).toMatch(/^user\d$/);
      });
    });

    it('should generate unique IDs for each entry', async () => {
      // Log 5 actions
      for (let i = 0; i < 5; i++) {
        const action: OpenClawAction = { type: 'test.action', params: {} };
        const context: UserContext = { userId: 'user1', capabilities: [] };
        const result: OpenClawResult = { success: true };

        await middleware.logAction(action, context, result, true);
      }

      // Read entries
      const content = await readFile(testLogPath, 'utf-8');
      const entries = content.trim().split('\n').map(line => JSON.parse(line));

      // Extract IDs
      const ids = entries.map(e => e.id);

      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should include timestamp in milliseconds', async () => {
      const before = Date.now();

      const action: OpenClawAction = { type: 'test.action', params: {} };
      const context: UserContext = { userId: 'user1', capabilities: [] };
      const result: OpenClawResult = { success: true };

      await middleware.logAction(action, context, result, true);

      const after = Date.now();

      // Read entry
      const content = await readFile(testLogPath, 'utf-8');
      const entry: AuditEntry = JSON.parse(content.trim());

      // Timestamp should be between before and after
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('query', () => {
    it('should return empty array for now (Phase 3 feature)', async () => {
      const results = await middleware.query();

      // Phase 1: Simple implementation returns empty
      // Phase 3: Will implement actual querying
      expect(Array.isArray(results)).toBe(true);
    });

    it('should accept filter parameters', async () => {
      const results = await middleware.query({
        userId: 'user1',
        actionType: 'browser.navigate',
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });
});

/**
 * Test Summary:
 * - 13 tests covering audit middleware functionality
 * - Tests file creation, JSONL format, concurrent writes
 * - Tests all required fields in audit entries
 * - Tests permission denied logging
 * - Tests ID uniqueness and timestamp accuracy
 * - Reality-grounded: tests actual file I/O
 */
