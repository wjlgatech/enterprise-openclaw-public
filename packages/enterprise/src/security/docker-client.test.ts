/**
 * DockerClient Tests (RG-TDD)
 *
 * Comprehensive test suite covering:
 * - Docker availability checks
 * - Container creation and lifecycle
 * - Image pulling
 * - Container cleanup
 * - Log parsing
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DockerodeClient } from './docker-client.js';
import type Docker from 'dockerode';

// Mock dockerode
vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        ping: vi.fn().mockResolvedValue({}),
        getImage: vi.fn().mockReturnValue({
          inspect: vi.fn().mockResolvedValue({})
        }),
        pull: vi.fn(),
        createContainer: vi.fn().mockResolvedValue({
          id: 'test-container-id',
          start: vi.fn().mockResolvedValue(undefined),
          wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
          logs: vi.fn().mockResolvedValue(Buffer.from('')),
          remove: vi.fn().mockResolvedValue(undefined),
          inspect: vi.fn().mockResolvedValue({
            State: {
              Running: false,
              ExitCode: 0,
              StartedAt: new Date().toISOString(),
              FinishedAt: new Date().toISOString()
            }
          }),
          kill: vi.fn().mockResolvedValue(undefined)
        }),
        getContainer: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue(undefined),
          kill: vi.fn().mockResolvedValue(undefined)
        }),
        modem: {
          followProgress: vi.fn()
        }
      };
    })
  };
});

describe('DockerodeClient', () => {
  let client: DockerodeClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DockerodeClient();
  });

  describe('isAvailable', () => {
    it('should return true when Docker is available', async () => {
      const available = await client.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when Docker ping fails', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      vi.spyOn(mockDocker as any, 'ping').mockRejectedValueOnce(new Error('Connection refused'));

      const clientWithError = new DockerodeClient();
      (clientWithError as any).docker = mockDocker;

      const available = await clientWithError.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('pullImage', () => {
    it('should not pull image if already exists locally', async () => {
      await client.pullImage('alpine:latest');

      // Image exists locally, so pull should not be called
      // This test verifies the happy path where inspect succeeds
      const Docker = (await import('dockerode')).default;
      const mockDocker = (client as any).docker;
      expect(mockDocker.getImage).toHaveBeenCalledWith('alpine:latest');
    });

    it('should pull image if not present locally', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Mock image not found
      vi.spyOn(mockDocker, 'getImage').mockReturnValue({
        inspect: vi.fn().mockRejectedValue(new Error('404 Not Found'))
      } as any);

      // Mock pull
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'end') {
            callback();
          }
          return mockStream;
        })
      };

      vi.spyOn(mockDocker, 'pull').mockImplementation((image, callback) => {
        callback(null, mockStream as any);
        return Promise.resolve(mockStream as any);
      });

      vi.spyOn(mockDocker.modem, 'followProgress').mockImplementation((_stream, callback) => {
        callback(null);
      });

      (client as any).docker = mockDocker;

      await client.pullImage('test-image:latest');

      expect(mockDocker.pull).toHaveBeenCalledWith('test-image:latest', expect.any(Function));
    });

    it('should handle pull errors', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Mock image not found
      vi.spyOn(mockDocker, 'getImage').mockReturnValue({
        inspect: vi.fn().mockRejectedValue(new Error('404 Not Found'))
      } as any);

      // Mock pull error
      vi.spyOn(mockDocker, 'pull').mockImplementation((_image, callback) => {
        callback(new Error('Pull failed'), null as any);
        return Promise.reject(new Error('Pull failed'));
      });

      (client as any).docker = mockDocker;

      await expect(client.pullImage('bad-image:latest')).rejects.toThrow('Pull failed');
    });

    it('should handle pull progress errors', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Mock image not found
      vi.spyOn(mockDocker, 'getImage').mockReturnValue({
        inspect: vi.fn().mockRejectedValue(new Error('404 Not Found'))
      } as any);

      // Mock pull
      const mockStream = {};
      vi.spyOn(mockDocker, 'pull').mockImplementation((_image, callback) => {
        callback(null, mockStream as any);
        return Promise.resolve(mockStream as any);
      });

      vi.spyOn(mockDocker.modem, 'followProgress').mockImplementation((_stream, callback) => {
        callback(new Error('Progress failed'));
      });

      (client as any).docker = mockDocker;

      await expect(client.pullImage('test-image:latest')).rejects.toThrow('Progress failed');
    });
  });

  describe('createContainer', () => {
    it('should create container with config', async () => {
      const config = {
        Image: 'alpine:latest',
        Cmd: ['/bin/sh', '-c', 'echo test'],
        Env: ['VAR=value'],
        WorkingDir: '/workspace',
        HostConfig: {
          Memory: 512 * 1024 * 1024
        }
      };

      const container = await client.createContainer(config);

      expect(container.id).toBe('test-container-id');
      expect(container.start).toBeDefined();
      expect(container.wait).toBeDefined();
      expect(container.logs).toBeDefined();
      expect(container.remove).toBeDefined();
    });

    it('should start container', async () => {
      const config = {
        Image: 'alpine:latest',
        Cmd: ['echo', 'test']
      };

      const container = await client.createContainer(config);
      await container.start();

      expect(container.start).toBeDefined();
    });

    it('should wait for container completion', async () => {
      const config = {
        Image: 'alpine:latest',
        Cmd: ['echo', 'test']
      };

      const container = await client.createContainer(config);
      const result = await container.wait();

      expect(result.StatusCode).toBe(0);
    });

    it('should parse logs with stdout', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Create a Docker multiplexed log stream
      // Format: [stream_type, 0, 0, 0, size_byte_1, size_byte_2, size_byte_3, size_byte_4, ...data]
      const testOutput = 'test stdout output';
      const outputBuffer = Buffer.from(testOutput);
      const header = Buffer.alloc(8);
      header[0] = 1; // stdout
      header.writeUInt32BE(outputBuffer.length, 4);
      const logBuffer = Buffer.concat([header, outputBuffer]);

      vi.spyOn(mockDocker, 'createContainer').mockResolvedValue({
        id: 'log-test-id',
        start: vi.fn(),
        wait: vi.fn(),
        logs: vi.fn().mockResolvedValue(logBuffer),
        remove: vi.fn(),
        inspect: vi.fn(),
        kill: vi.fn()
      } as any);

      (client as any).docker = mockDocker;

      const config = {
        Image: 'alpine:latest',
        Cmd: ['echo', 'test']
      };

      const container = await client.createContainer(config);
      const logs = await container.logs();

      expect(logs.stdout).toBe(testOutput);
      expect(logs.stderr).toBe('');
    });

    it('should parse logs with stderr', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Create a Docker multiplexed log stream for stderr
      const testError = 'error output';
      const errorBuffer = Buffer.from(testError);
      const header = Buffer.alloc(8);
      header[0] = 2; // stderr
      header.writeUInt32BE(errorBuffer.length, 4);
      const logBuffer = Buffer.concat([header, errorBuffer]);

      vi.spyOn(mockDocker, 'createContainer').mockResolvedValue({
        id: 'log-test-id',
        start: vi.fn(),
        wait: vi.fn(),
        logs: vi.fn().mockResolvedValue(logBuffer),
        remove: vi.fn(),
        inspect: vi.fn(),
        kill: vi.fn()
      } as any);

      (client as any).docker = mockDocker;

      const config = {
        Image: 'alpine:latest',
        Cmd: ['cat', '/nonexistent']
      };

      const container = await client.createContainer(config);
      const logs = await container.logs();

      expect(logs.stdout).toBe('');
      expect(logs.stderr).toBe(testError);
    });

    it('should parse logs with both stdout and stderr', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Create stdout frame
      const stdoutMsg = 'stdout message';
      const stdoutBuffer = Buffer.from(stdoutMsg);
      const stdoutHeader = Buffer.alloc(8);
      stdoutHeader[0] = 1;
      stdoutHeader.writeUInt32BE(stdoutBuffer.length, 4);
      const stdoutFrame = Buffer.concat([stdoutHeader, stdoutBuffer]);

      // Create stderr frame
      const stderrMsg = 'stderr message';
      const stderrBuffer = Buffer.from(stderrMsg);
      const stderrHeader = Buffer.alloc(8);
      stderrHeader[0] = 2;
      stderrHeader.writeUInt32BE(stderrBuffer.length, 4);
      const stderrFrame = Buffer.concat([stderrHeader, stderrBuffer]);

      // Combine frames
      const logBuffer = Buffer.concat([stdoutFrame, stderrFrame]);

      vi.spyOn(mockDocker, 'createContainer').mockResolvedValue({
        id: 'log-test-id',
        start: vi.fn(),
        wait: vi.fn(),
        logs: vi.fn().mockResolvedValue(logBuffer),
        remove: vi.fn(),
        inspect: vi.fn(),
        kill: vi.fn()
      } as any);

      (client as any).docker = mockDocker;

      const config = {
        Image: 'alpine:latest',
        Cmd: ['sh', '-c', 'echo out; echo err >&2']
      };

      const container = await client.createContainer(config);
      const logs = await container.logs();

      expect(logs.stdout).toBe(stdoutMsg);
      expect(logs.stderr).toBe(stderrMsg);
    });

    it('should handle empty logs', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      vi.spyOn(mockDocker, 'createContainer').mockResolvedValue({
        id: 'empty-log-id',
        start: vi.fn(),
        wait: vi.fn(),
        logs: vi.fn().mockResolvedValue(Buffer.alloc(0)),
        remove: vi.fn(),
        inspect: vi.fn(),
        kill: vi.fn()
      } as any);

      (client as any).docker = mockDocker;

      const config = {
        Image: 'alpine:latest',
        Cmd: ['true']
      };

      const container = await client.createContainer(config);
      const logs = await container.logs();

      expect(logs.stdout).toBe('');
      expect(logs.stderr).toBe('');
    });

    it('should remove container', async () => {
      const config = {
        Image: 'alpine:latest',
        Cmd: ['echo', 'test']
      };

      const container = await client.createContainer(config);
      await container.remove();

      expect(container.remove).toBeDefined();
    });

    it('should inspect container', async () => {
      const config = {
        Image: 'alpine:latest',
        Cmd: ['echo', 'test']
      };

      const container = await client.createContainer(config);
      const info = await container.inspect();

      expect(info.State.Running).toBe(false);
      expect(info.State.ExitCode).toBe(0);
    });
  });

  describe('removeContainer', () => {
    it('should remove container by ID', async () => {
      await client.removeContainer('test-container-id');

      const mockDocker = (client as any).docker;
      expect(mockDocker.getContainer).toHaveBeenCalledWith('test-container-id');
    });

    it('should ignore 404 errors when removing non-existent container', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      vi.spyOn(mockDocker, 'getContainer').mockReturnValue({
        remove: vi.fn().mockRejectedValue({ statusCode: 404 })
      } as any);

      (client as any).docker = mockDocker;

      await expect(client.removeContainer('nonexistent')).resolves.not.toThrow();
    });

    it('should throw non-404 errors', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      vi.spyOn(mockDocker, 'getContainer').mockReturnValue({
        remove: vi.fn().mockRejectedValue(new Error('Server error'))
      } as any);

      (client as any).docker = mockDocker;

      await expect(client.removeContainer('error-container')).rejects.toThrow('Server error');
    });
  });

  describe('killContainer', () => {
    it('should kill container by ID', async () => {
      await client.killContainer('running-container-id');

      const mockDocker = (client as any).docker;
      expect(mockDocker.getContainer).toHaveBeenCalledWith('running-container-id');
    });

    it('should ignore 404 errors when killing non-existent container', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      vi.spyOn(mockDocker, 'getContainer').mockReturnValue({
        kill: vi.fn().mockRejectedValue({ statusCode: 404 })
      } as any);

      (client as any).docker = mockDocker;

      await expect(client.killContainer('nonexistent')).resolves.not.toThrow();
    });

    it('should throw non-404 errors when killing', async () => {
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      vi.spyOn(mockDocker, 'getContainer').mockReturnValue({
        kill: vi.fn().mockRejectedValue(new Error('Kill failed'))
      } as any);

      (client as any).docker = mockDocker;

      await expect(client.killContainer('error-container')).rejects.toThrow('Kill failed');
    });
  });
});
