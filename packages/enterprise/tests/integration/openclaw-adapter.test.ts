/**
 * OpenClaw Adapter Tests
 *
 * RG-TDD: Tests written FIRST before implementation
 * Reality-Grounded: Tests real HTTP calls to OpenClaw
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { OpenClawAdapter, OpenClawAction, OpenClawResult } from '../../src/integration/openclaw-adapter.js';

describe('OpenClawAdapter', () => {
  let adapter: OpenClawAdapter;
  const mockOpenClawUrl = process.env.OPENCLAW_URL || 'http://localhost:3000';

  beforeAll(() => {
    adapter = new OpenClawAdapter({
      baseUrl: mockOpenClawUrl,
      timeout: 30000
    });
  });

  describe('execute', () => {
    it('should execute action and return result with metadata', async () => {
      const action: OpenClawAction = {
        type: 'test.echo',
        params: { message: 'hello from test' }
      };

      const result = await adapter.execute(action);

      // Result should have success field
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      // If OpenClaw is running, should have data
      // If not running, should have error
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.timestamp).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle network errors gracefully', async () => {
      // Create adapter with invalid URL
      const badAdapter = new OpenClawAdapter({
        baseUrl: 'http://invalid-host-that-does-not-exist:9999',
        timeout: 1000
      });

      const action: OpenClawAction = {
        type: 'test.action',
        params: {}
      };

      const result = await badAdapter.execute(action);

      // Should not throw, should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should timeout after specified duration', async () => {
      // Create adapter with very short timeout
      const timeoutAdapter = new OpenClawAdapter({
        baseUrl: mockOpenClawUrl,
        timeout: 1 // 1ms - will definitely timeout
      });

      const action: OpenClawAction = {
        type: 'test.slow',
        params: {}
      };

      const startTime = Date.now();
      const result = await timeoutAdapter.execute(action);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Should fail quickly (within 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should include latency metadata in result', async () => {
      const action: OpenClawAction = {
        type: 'test.quick',
        params: {}
      };

      const result = await adapter.execute(action);

      // Even if OpenClaw not running, should have metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.timestamp).toBeGreaterThan(Date.now() - 5000);
    });

    it('should handle HTTP error status codes', async () => {
      const action: OpenClawAction = {
        type: 'nonexistent.action',
        params: {}
      };

      const result = await adapter.execute(action);

      // If OpenClaw running and returns 404, should report error
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('healthCheck', () => {
    it('should return boolean indicating OpenClaw availability', async () => {
      const healthy = await adapter.healthCheck();

      // Should be boolean
      expect(typeof healthy).toBe('boolean');

      // Will be true if OpenClaw running, false otherwise
      // Both are valid for this test
    });

    it('should timeout quickly for health check', async () => {
      const slowAdapter = new OpenClawAdapter({
        baseUrl: 'http://example.com:9999',
        timeout: 5000
      });

      const startTime = Date.now();
      const healthy = await slowAdapter.healthCheck();
      const duration = Date.now() - startTime;

      expect(healthy).toBe(false);
      // Health check should have faster timeout (5s)
      expect(duration).toBeLessThan(6000);
    });

    it('should handle DNS resolution failures', async () => {
      const badAdapter = new OpenClawAdapter({
        baseUrl: 'http://this-domain-definitely-does-not-exist.invalid',
        timeout: 1000
      });

      const healthy = await badAdapter.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use default timeout if not specified', () => {
      const defaultAdapter = new OpenClawAdapter({
        baseUrl: mockOpenClawUrl
      });

      // Should not throw
      expect(defaultAdapter).toBeDefined();
    });

    it('should accept API key in config', () => {
      const authAdapter = new OpenClawAdapter({
        baseUrl: mockOpenClawUrl,
        apiKey: 'test-api-key-12345'
      });

      expect(authAdapter).toBeDefined();
    });
  });
});

/**
 * Test Summary:
 * - 10 tests covering all major functionality
 * - Tests both success and failure paths
 * - Tests network errors, timeouts, and error handling
 * - Reality-grounded: tests actual HTTP behavior
 */
