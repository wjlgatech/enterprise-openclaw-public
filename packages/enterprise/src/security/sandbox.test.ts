/**
 * SandboxExecutor Tests (RG-TDD)
 *
 * Comprehensive test suite covering:
 * - Basic command execution
 * - Resource limits (CPU, memory, pids)
 * - Network isolation policies
 * - File system isolation
 * - Timeout handling
 * - Container cleanup
 * - Status reporting
 * - Error handling
 * - Audit logging
 *
 * Written FIRST before implementation (~25 tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxExecutor } from './sandbox.js';
import { NetworkPolicy, SandboxStatus, type SandboxConfig, type ExecutionResult } from './types.js';
import type { DockerClient } from './docker-client.js';

// Mock Docker client
const createMockDockerClient = (): DockerClient => {
  return {
    createContainer: vi.fn().mockResolvedValue({
      id: 'test-container-id',
      start: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
      logs: vi.fn().mockResolvedValue({
        stdout: 'test output',
        stderr: ''
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      inspect: vi.fn().mockResolvedValue({
        State: {
          Running: false,
          ExitCode: 0,
          StartedAt: new Date().toISOString(),
          FinishedAt: new Date().toISOString()
        }
      })
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    pullImage: vi.fn().mockResolvedValue(undefined),
    removeContainer: vi.fn().mockResolvedValue(undefined),
    killContainer: vi.fn().mockResolvedValue(undefined)
  } as any;
};

describe('SandboxExecutor', () => {
  let executor: SandboxExecutor;
  let mockDockerClient: DockerClient;
  let defaultConfig: SandboxConfig;

  beforeEach(() => {
    mockDockerClient = createMockDockerClient();
    defaultConfig = {
      image: 'openclaw-sandbox:latest',
      networkPolicy: NetworkPolicy.NONE,
      timeout: 30000,
      workDir: '/workspace',
      resourceLimits: {
        memory: 512 * 1024 * 1024, // 512MB
        cpuQuota: 50000,
        cpuPeriod: 100000
      }
    };
    executor = new SandboxExecutor(defaultConfig, mockDockerClient);
  });

  afterEach(async () => {
    await executor.cleanup();
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create SandboxExecutor with valid config', () => {
      expect(executor).toBeDefined();
      expect(executor.getStatus().status).toBe(SandboxStatus.IDLE);
    });

    it('should reject invalid config (negative timeout)', () => {
      const invalidConfig = { ...defaultConfig, timeout: -1000 };
      expect(() => new SandboxExecutor(invalidConfig, mockDockerClient)).toThrow();
    });

    it('should reject invalid config (negative memory limit)', () => {
      const invalidConfig = {
        ...defaultConfig,
        resourceLimits: { memory: -512 }
      };
      expect(() => new SandboxExecutor(invalidConfig, mockDockerClient)).toThrow();
    });

    it('should use default config values when not provided', () => {
      const minimalConfig = {} as SandboxConfig;
      const exec = new SandboxExecutor(minimalConfig, mockDockerClient);
      const status = exec.getStatus();
      expect(status.status).toBe(SandboxStatus.IDLE);
    });
  });

  describe('Basic Command Execution', () => {
    it('should execute simple command successfully', async () => {
      const result = await executor.execute('echo "hello world"');

      expect(result.status).toBe(SandboxStatus.COMPLETED);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('test output'); // Matches mock default output
      expect(mockDockerClient.createContainer).toHaveBeenCalled();
    });

    it('should capture stdout from command', async () => {
      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'test-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
        logs: vi.fn().mockResolvedValue({
          stdout: 'test stdout output',
          stderr: ''
        }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      const result = await executor.execute('echo "test"');
      expect(result.stdout).toBe('test stdout output');
    });

    it('should capture stderr from command', async () => {
      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'test-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue({ StatusCode: 1 }),
        logs: vi.fn().mockResolvedValue({
          stdout: '',
          stderr: 'error occurred'
        }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      const result = await executor.execute('invalid-command');
      expect(result.stderr).toBe('error occurred');
      expect(result.exitCode).toBe(1);
    });

    it('should handle command with non-zero exit code', async () => {
      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'test-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue({ StatusCode: 127 }),
        logs: vi.fn().mockResolvedValue({
          stdout: '',
          stderr: 'command not found'
        }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      const result = await executor.execute('nonexistent-command');
      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.exitCode).toBe(127);
    });

    it('should track execution duration', async () => {
      const result = await executor.execute('echo "test"');
      expect(result.duration).toBeGreaterThanOrEqual(0); // May be 0 in fast mock execution
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Resource Limits', () => {
    it('should apply memory limits to container', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        resourceLimits: {
          memory: 256 * 1024 * 1024 // 256MB
        }
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Memory: 256 * 1024 * 1024
          })
        })
      );
    });

    it('should apply CPU limits to container', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        resourceLimits: {
          cpuQuota: 25000,
          cpuPeriod: 100000
        }
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            CpuQuota: 25000,
            CpuPeriod: 100000
          })
        })
      );
    });

    it('should apply pids limit to container', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        resourceLimits: {
          pidsLimit: 100
        }
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            PidsLimit: 100
          })
        })
      );
    });
  });

  describe('Network Isolation', () => {
    it('should apply none network policy (no network)', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        networkPolicy: NetworkPolicy.NONE
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            NetworkMode: 'none'
          })
        })
      );
    });

    it('should apply bridge network policy for internal', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        networkPolicy: NetworkPolicy.INTERNAL
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            NetworkMode: 'bridge'
          })
        })
      );
    });
  });

  describe('File System Isolation', () => {
    it('should set readonly root filesystem by default', async () => {
      await executor.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            ReadonlyRootfs: true
          })
        })
      );
    });

    it('should mount host paths when specified', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        mountPaths: [
          {
            hostPath: '/tmp/test',
            containerPath: '/data',
            readOnly: true
          }
        ]
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Binds: ['/tmp/test:/data:ro']
          })
        })
      );
    });

    it('should handle read-write mounts', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        mountPaths: [
          {
            hostPath: '/tmp/work',
            containerPath: '/workspace',
            readOnly: false
          }
        ]
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Binds: ['/tmp/work:/workspace:rw']
          })
        })
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should kill container when timeout exceeded', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        timeout: 100 // 100ms timeout
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      // Mock a long-running container
      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'long-running-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ StatusCode: 137 }), 5000))),
        logs: vi.fn().mockResolvedValue({ stdout: '', stderr: 'timeout' }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      mockDockerClient.killContainer = vi.fn().mockResolvedValue(undefined);

      const result = await exec.execute('sleep 10');

      expect(result.status).toBe(SandboxStatus.TIMEOUT);
      expect(mockDockerClient.killContainer).toHaveBeenCalledWith('long-running-id');
    });

    it('should report timeout in execution result', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        timeout: 50
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'timeout-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ StatusCode: 137 }), 5000))),
        logs: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      mockDockerClient.killContainer = vi.fn().mockResolvedValue(undefined);

      const result = await exec.execute('sleep 10');

      expect(result.status).toBe(SandboxStatus.TIMEOUT);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Container Cleanup', () => {
    it('should remove container after execution', async () => {
      const result = await executor.execute('echo "test"');

      expect(result.containerId).toBeDefined();
      const mockContainer = await mockDockerClient.createContainer({} as any);
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should cleanup on explicit cleanup() call', async () => {
      await executor.execute('echo "test"');
      const status = executor.getStatus();

      await executor.cleanup();

      if (status.containerId) {
        expect(mockDockerClient.removeContainer).toHaveBeenCalled();
      }
    });

    it('should handle cleanup of non-existent container gracefully', async () => {
      await expect(executor.cleanup()).resolves.not.toThrow();
    });

    it('should set status to IDLE after cleanup', async () => {
      await executor.execute('echo "test"');
      await executor.cleanup();

      const status = executor.getStatus();
      expect(status.status).toBe(SandboxStatus.IDLE);
      expect(status.containerId).toBeNull();
    });
  });

  describe('Status Reporting', () => {
    it('should report IDLE status initially', () => {
      const status = executor.getStatus();

      expect(status.status).toBe(SandboxStatus.IDLE);
      expect(status.containerId).toBeNull();
      expect(status.command).toBeNull();
    });

    it('should report RUNNING status during execution', async () => {
      let statusDuringExecution: any;

      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'running-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockImplementation(async () => {
          // Capture status while container is running
          statusDuringExecution = executor.getStatus();
          return { StatusCode: 0 };
        }),
        logs: vi.fn().mockResolvedValue({ stdout: 'output', stderr: '' }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      await executor.execute('echo "test"');

      expect(statusDuringExecution?.status).toBe(SandboxStatus.RUNNING);
      expect(statusDuringExecution?.containerId).toBe('running-id');
    });

    it('should track command in status', async () => {
      const command = 'echo "hello world"';

      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'cmd-id',
        start: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockImplementation(async () => {
          const status = executor.getStatus();
          expect(status.command).toBe(command);
          return { StatusCode: 0 };
        }),
        logs: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      await executor.execute(command);
    });

    it('should track start and end times', async () => {
      const result = await executor.execute('echo "test"');
      const status = executor.getStatus();

      expect(status.startTime).not.toBeNull();
      expect(status.endTime).not.toBeNull();
      expect(status.duration).not.toBeNull();
      expect(status.duration!).toBeGreaterThanOrEqual(0); // May be 0 in fast mock execution
    });
  });

  describe('Error Handling', () => {
    it('should handle Docker not available error', async () => {
      mockDockerClient.isAvailable = vi.fn().mockResolvedValue(false);
      const exec = new SandboxExecutor(defaultConfig, mockDockerClient);

      const result = await exec.execute('echo "test"');

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toContain('Docker');
    });

    it('should handle container creation failure', async () => {
      mockDockerClient.createContainer = vi.fn().mockRejectedValue(new Error('Failed to create container'));

      const result = await executor.execute('echo "test"');

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toContain('Failed to create container');
    });

    it('should handle container start failure', async () => {
      mockDockerClient.createContainer = vi.fn().mockResolvedValue({
        id: 'fail-start-id',
        start: vi.fn().mockRejectedValue(new Error('Failed to start')),
        remove: vi.fn().mockResolvedValue(undefined)
      });

      const result = await executor.execute('echo "test"');

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should handle empty command error', async () => {
      const result = await executor.execute('');

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toContain('empty');
    });

    it('should handle null command error', async () => {
      const result = await executor.execute(null as any);

      expect(result.status).toBe(SandboxStatus.FAILED);
      expect(result.error).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log command execution to audit log', async () => {
      const auditLog = vi.fn();
      const config: SandboxConfig = {
        ...defaultConfig
      };
      const exec = new SandboxExecutor(config, mockDockerClient, auditLog);

      await exec.execute('echo "test"');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'echo "test"',
          status: SandboxStatus.COMPLETED,
          exitCode: 0
        })
      );
    });

    it('should log failed executions', async () => {
      const auditLog = vi.fn();
      mockDockerClient.createContainer = vi.fn().mockRejectedValue(new Error('Docker error'));

      const exec = new SandboxExecutor(defaultConfig, mockDockerClient, auditLog);
      await exec.execute('echo "test"');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SandboxStatus.FAILED,
          error: expect.stringContaining('Docker error')
        })
      );
    });

    it('should include containerId in audit log', async () => {
      const auditLog = vi.fn();
      const exec = new SandboxExecutor(defaultConfig, mockDockerClient, auditLog);

      await exec.execute('echo "test"');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'test-container-id'
        })
      );
    });

    it('should include execution duration in audit log', async () => {
      const auditLog = vi.fn();
      const exec = new SandboxExecutor(defaultConfig, mockDockerClient, auditLog);

      await exec.execute('echo "test"');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Environment Variables', () => {
    it('should pass environment variables to container', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        env: {
          NODE_ENV: 'test',
          API_KEY: 'secret123'
        }
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo $NODE_ENV');

      expect(mockDockerClient.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining(['NODE_ENV=test', 'API_KEY=secret123'])
        })
      );
    });

    it('should handle empty environment variables', async () => {
      const config: SandboxConfig = {
        ...defaultConfig,
        env: {}
      };
      const exec = new SandboxExecutor(config, mockDockerClient);

      await exec.execute('echo "test"');

      expect(mockDockerClient.createContainer).toHaveBeenCalled();
    });
  });
});
