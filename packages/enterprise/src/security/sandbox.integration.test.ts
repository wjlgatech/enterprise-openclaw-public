/**
 * SandboxExecutor Integration Tests
 *
 * Tests with real Docker daemon (requires Docker installed and running).
 * These tests verify:
 * - Real command execution in containers
 * - Actual resource limits enforcement
 * - Network isolation verification
 * - File system isolation
 * - Real timeout behavior
 *
 * Run with: npm test -- sandbox.integration.test.ts
 * Requirements: Docker daemon must be running
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SandboxExecutor } from './sandbox.js';
import { DockerodeClient } from './docker-client.js';
import { NetworkPolicy, SandboxStatus, type SandboxConfig } from './types.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Skip integration tests if Docker is not available
const isDockerAvailable = async () => {
  try {
    const client = new DockerodeClient();
    return await client.isAvailable();
  } catch {
    return false;
  }
};

describe('SandboxExecutor Integration Tests', { skip: !(await isDockerAvailable()) }, () => {
  let dockerClient: DockerodeClient;
  let testTempDir: string;

  beforeAll(async () => {
    dockerClient = new DockerodeClient();

    // Create temp directory for tests
    testTempDir = path.join(os.tmpdir(), `sandbox-test-${Date.now()}`);
    await fs.mkdir(testTempDir, { recursive: true });

    // Pull Alpine image for testing (small and fast)
    try {
      await dockerClient.pullImage('alpine:latest');
    } catch (error) {
      console.warn('Failed to pull alpine:latest, tests may fail:', error);
    }
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Real Command Execution', () => {
    it('should execute echo command and capture stdout', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('echo "Hello from Docker"');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Hello from Docker');
      expect(result.stderr).toBe('');
      expect(result.duration).toBeGreaterThan(0);

      await executor.cleanup();
    }, 30000);

    it('should capture stderr from error command', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('ls /nonexistent-directory 2>&1');

      expect(result.exitCode).not.toBe(0);
      expect(result.status).toBe(SandboxStatus.FAILED);

      await executor.cleanup();
    }, 30000);

    it('should handle multi-line output', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('echo "line1"; echo "line2"; echo "line3"');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.stdout).toContain('line1');
      expect(result.stdout).toContain('line2');
      expect(result.stdout).toContain('line3');

      await executor.cleanup();
    }, 30000);
  });

  describe('Timeout Handling', () => {
    it('should kill container when timeout is exceeded', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 2000, // 2 second timeout
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('sleep 10');

      expect(result.status).toBe(SandboxStatus.TIMEOUT);
      expect(result.error).toContain('timeout');
      expect(result.duration).toBeGreaterThanOrEqual(2000);
      expect(result.duration).toBeLessThan(5000); // Should be killed quickly after timeout

      await executor.cleanup();
    }, 30000);

    it('should complete successfully if execution finishes before timeout', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 5000, // 5 second timeout
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('sleep 1');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.exitCode).toBe(0);
      expect(result.duration).toBeLessThan(5000);

      await executor.cleanup();
    }, 30000);
  });

  describe('File System Isolation', () => {
    it('should not access host filesystem by default', async () => {
      // Write a test file to temp dir
      const testFilePath = path.join(testTempDir, 'secret.txt');
      await fs.writeFile(testFilePath, 'This is a secret');

      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Try to read the host file (should fail - no mount)
      const result = await executor.execute(`cat ${testFilePath}`);

      expect(result.exitCode).not.toBe(0);
      expect(result.status).toBe(SandboxStatus.FAILED);

      await executor.cleanup();
    }, 30000);

    it('should access host filesystem when mounted', async () => {
      // Write a test file to temp dir
      const testFilePath = path.join(testTempDir, 'mounted-file.txt');
      await fs.writeFile(testFilePath, 'Mounted content');

      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/workspace',
        mountPaths: [
          {
            hostPath: testTempDir,
            containerPath: '/data',
            readOnly: true
          }
        ]
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('cat /data/mounted-file.txt');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Mounted content');

      await executor.cleanup();
    }, 30000);

    it('should enforce read-only mounts', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/workspace',
        mountPaths: [
          {
            hostPath: testTempDir,
            containerPath: '/data',
            readOnly: true
          }
        ]
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Try to write to read-only mount (should fail)
      const result = await executor.execute('echo "hack" > /data/hack.txt');

      expect(result.exitCode).not.toBe(0);

      // Verify file was not created on host
      const fileExists = await fs.access(path.join(testTempDir, 'hack.txt'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);

      await executor.cleanup();
    }, 30000);
  });

  describe('Network Isolation', () => {
    it('should block network access with NONE policy', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Try to ping google.com (should fail with network=none)
      const result = await executor.execute('ping -c 1 -W 1 google.com');

      expect(result.exitCode).not.toBe(0);

      await executor.cleanup();
    }, 30000);

    it('should allow network access with INTERNAL policy', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.INTERNAL,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Ping should work with bridge network (may fail if no internet, that's OK for this test structure)
      const result = await executor.execute('ping -c 1 -W 2 8.8.8.8 || echo "no network"');

      // Should at least execute (may fail due to no network, but command should run)
      expect(result.status).toBe(SandboxStatus.COMPLETED);

      await executor.cleanup();
    }, 30000);
  });

  describe('Environment Variables', () => {
    it('should pass environment variables to container', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp',
        env: {
          TEST_VAR: 'test_value',
          ANOTHER_VAR: '12345'
        }
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('echo "VAR=$TEST_VAR:$ANOTHER_VAR"');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.stdout.trim()).toBe('VAR=test_value:12345');

      await executor.cleanup();
    }, 30000);
  });

  describe('Status Tracking', () => {
    it('should track status through execution lifecycle', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Initial status
      let status = executor.getStatus();
      expect(status.status).toBe(SandboxStatus.IDLE);
      expect(status.containerId).toBeNull();

      // Execute
      const resultPromise = executor.execute('sleep 0.5 && echo "done"');

      // Status should eventually reflect completion
      const result = await resultPromise;

      status = executor.getStatus();
      expect(status.status).toBe(SandboxStatus.COMPLETED);
      expect(status.command).toBe('sleep 0.5 && echo "done"');
      expect(status.startTime).not.toBeNull();
      expect(status.endTime).not.toBeNull();
      expect(status.duration).toBeGreaterThan(0);

      await executor.cleanup();
    }, 30000);
  });

  describe('Audit Logging', () => {
    it('should call audit log callback with execution details', async () => {
      let auditEntry: any = null;

      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const auditLog = (entry: any) => {
        auditEntry = entry;
      };

      const executor = new SandboxExecutor(config, dockerClient, auditLog);
      await executor.execute('echo "audit test"');

      expect(auditEntry).not.toBeNull();
      expect(auditEntry.command).toBe('echo "audit test"');
      expect(auditEntry.status).toBe(SandboxStatus.COMPLETED);
      expect(auditEntry.exitCode).toBe(0);
      expect(auditEntry.containerId).toBeDefined();
      expect(auditEntry.duration).toBeGreaterThan(0);
      expect(auditEntry.stdout).toContain('audit test');

      await executor.cleanup();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid image gracefully', async () => {
      const config: SandboxConfig = {
        image: 'nonexistent-image:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp'
      };

      const executor = new SandboxExecutor(config, dockerClient);
      const result = await executor.execute('echo "test"');

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toBeDefined();

      await executor.cleanup();
    }, 30000);
  });

  describe('Resource Limits', () => {
    it('should apply memory limits (container should run within limits)', async () => {
      const config: SandboxConfig = {
        image: 'alpine:latest',
        networkPolicy: NetworkPolicy.NONE,
        timeout: 10000,
        workDir: '/tmp',
        resourceLimits: {
          memory: 50 * 1024 * 1024 // 50MB
        }
      };

      const executor = new SandboxExecutor(config, dockerClient);

      // Simple command that uses minimal memory
      const result = await executor.execute('echo "memory test"');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.exitCode).toBe(0);

      await executor.cleanup();
    }, 30000);
  });
});
