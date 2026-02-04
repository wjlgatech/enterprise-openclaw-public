/**
 * Security Sandbox Executor
 *
 * Executes commands in isolated Docker containers with:
 * - Resource limits (CPU, memory, pids)
 * - Network isolation
 * - File system isolation
 * - Timeout handling
 * - Audit logging
 *
 * This is the core security feature for Enterprise OpenClaw.
 */

import {
  NetworkPolicy,
  SandboxStatus,
  SandboxConfigSchema,
  type SandboxConfig,
  type ExecutionResult,
  type SandboxStatusInfo,
  type SandboxAuditEntry,
  type DockerContainerConfig
} from './types.js';
import type { DockerClient, Container } from './docker-client.js';
import { DockerodeClient } from './docker-client.js';

/**
 * Audit log callback type
 */
export type AuditLogCallback = (entry: SandboxAuditEntry) => void;

/**
 * SandboxExecutor - Executes commands in isolated Docker containers
 */
export class SandboxExecutor {
  private config: SandboxConfig;
  private dockerClient: DockerClient;
  private auditLog?: AuditLogCallback;
  private currentContainer: Container | null = null;
  private status: SandboxStatusInfo;

  constructor(
    config: SandboxConfig,
    dockerClient?: DockerClient,
    auditLog?: AuditLogCallback
  ) {
    // Validate and parse config with defaults
    const parsedConfig = SandboxConfigSchema.parse(config);
    this.config = parsedConfig;
    this.dockerClient = dockerClient || new DockerodeClient();
    this.auditLog = auditLog;

    this.status = {
      containerId: null,
      status: SandboxStatus.IDLE,
      command: null,
      startTime: null,
      endTime: null,
      duration: null
    };
  }

  /**
   * Execute a command in an isolated sandbox
   */
  async execute(command: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Validate command
    if (!command || typeof command !== 'string' || command.trim().length === 0) {
      const result = this.createErrorResult(startTime, 'Command cannot be empty');
      this.logAudit(result, command);
      return result;
    }

    // Check if Docker is available
    const dockerAvailable = await this.dockerClient.isAvailable();
    if (!dockerAvailable) {
      const result = this.createErrorResult(startTime, 'Docker daemon is not available');
      this.logAudit(result, command);
      return result;
    }

    // Update status to running
    this.status = {
      containerId: null,
      status: SandboxStatus.RUNNING,
      command,
      startTime,
      endTime: null,
      duration: null
    };

    try {
      // Create container configuration
      const containerConfig = this.buildContainerConfig(command);

      // Create and start container
      const container = await this.dockerClient.createContainer(containerConfig);
      this.currentContainer = container;
      this.status.containerId = container.id;

      await container.start();

      // Wait for container with timeout
      const result = await this.waitWithTimeout(container, command, startTime);

      // Update status
      this.status.status = result.status;
      this.status.endTime = Date.now();
      this.status.duration = result.duration;

      // Log to audit
      this.logAudit(result, command);

      return result;
    } catch (error) {
      const result = this.createErrorResult(
        startTime,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      this.logAudit(result, command);

      this.status.status = SandboxStatus.FAILED;
      this.status.endTime = Date.now();
      this.status.duration = Date.now() - startTime;

      return result;
    } finally {
      // Cleanup container
      if (this.currentContainer) {
        try {
          await this.currentContainer.remove();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Wait for container completion with timeout
   */
  private async waitWithTimeout(
    container: Container,
    command: string,
    startTime: number
  ): Promise<ExecutionResult> {
    const timeoutMs = this.config.timeout || 30000;

    return new Promise(async (resolve) => {
      let timedOut = false;
      let resolved = false;

      // Set timeout
      const timeoutHandle = setTimeout(async () => {
        if (resolved) return;
        timedOut = true;
        resolved = true;

        // Kill container
        try {
          await this.dockerClient.killContainer(container.id);
        } catch (error) {
          // Ignore error
        }

        // Get logs
        let stdout = '';
        let stderr = '';
        try {
          const logs = await container.logs();
          stdout = logs.stdout;
          stderr = logs.stderr;
        } catch (error) {
          // Ignore
        }

        resolve({
          status: SandboxStatus.TIMEOUT,
          exitCode: 137, // SIGKILL exit code
          stdout,
          stderr,
          duration: Date.now() - startTime,
          containerId: container.id,
          error: `Command exceeded timeout of ${timeoutMs}ms`
        });
      }, timeoutMs);

      try {
        // Wait for container to finish
        const waitResult = await container.wait();

        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);

        // Get logs
        const logs = await container.logs();
        const duration = Date.now() - startTime;

        const exitCode = waitResult.StatusCode;
        const status = exitCode === 0 ? SandboxStatus.COMPLETED : SandboxStatus.FAILED;

        resolve({
          status,
          exitCode,
          stdout: logs.stdout,
          stderr: logs.stderr,
          duration,
          containerId: container.id
        });
      } catch (error) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);

        resolve({
          status: SandboxStatus.FAILED,
          exitCode: null,
          stdout: '',
          stderr: '',
          duration: Date.now() - startTime,
          containerId: container.id,
          error: error instanceof Error ? error.message : 'Container wait failed'
        });
      }
    });
  }

  /**
   * Build Docker container configuration
   */
  private buildContainerConfig(command: string): DockerContainerConfig {
    const config = this.config;

    // Parse command into array
    const cmd = ['/bin/sh', '-c', command];

    // Build environment variables array
    const env: string[] = [];
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        env.push(`${key}=${value}`);
      }
    }

    // Build network mode
    let networkMode = 'none';
    if (config.networkPolicy === NetworkPolicy.INTERNAL || config.networkPolicy === NetworkPolicy.LIMITED) {
      networkMode = 'bridge';
    } else if (config.networkPolicy === NetworkPolicy.FULL) {
      networkMode = 'bridge';
    }

    // Build volume binds
    const binds: string[] = [];
    if (config.mountPaths) {
      for (const mount of config.mountPaths) {
        const mode = mount.readOnly ? 'ro' : 'rw';
        binds.push(`${mount.hostPath}:${mount.containerPath}:${mode}`);
      }
    }

    const containerConfig: DockerContainerConfig = {
      Image: config.image || 'openclaw-sandbox:latest',
      Cmd: cmd,
      Env: env.length > 0 ? env : undefined,
      WorkingDir: config.workDir || '/workspace',
      HostConfig: {
        NetworkMode: networkMode,
        ReadonlyRootfs: true,
        AutoRemove: false,
        ...(binds.length > 0 && { Binds: binds })
      }
    };

    // Apply resource limits
    if (config.resourceLimits) {
      const limits = config.resourceLimits;
      if (limits.memory !== undefined) {
        containerConfig.HostConfig!.Memory = limits.memory;
      }
      if (limits.memorySwap !== undefined) {
        containerConfig.HostConfig!.MemorySwap = limits.memorySwap;
      }
      if (limits.cpuQuota !== undefined) {
        containerConfig.HostConfig!.CpuQuota = limits.cpuQuota;
      }
      if (limits.cpuPeriod !== undefined) {
        containerConfig.HostConfig!.CpuPeriod = limits.cpuPeriod;
      }
      if (limits.pidsLimit !== undefined) {
        containerConfig.HostConfig!.PidsLimit = limits.pidsLimit;
      }
    }

    return containerConfig;
  }

  /**
   * Create error result
   */
  private createErrorResult(startTime: number, error: string): ExecutionResult {
    return {
      status: SandboxStatus.FAILED,
      exitCode: null,
      stdout: '',
      stderr: '',
      duration: Date.now() - startTime,
      error
    };
  }

  /**
   * Log to audit log
   */
  private logAudit(result: ExecutionResult, command: string): void {
    if (!this.auditLog) return;

    const entry: SandboxAuditEntry = {
      timestamp: Date.now(),
      containerId: result.containerId || '',
      command,
      status: result.status,
      exitCode: result.exitCode,
      duration: result.duration,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error
    };

    this.auditLog(entry);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.currentContainer) {
      try {
        await this.dockerClient.removeContainer(this.currentContainer.id);
      } catch (error) {
        // Ignore cleanup errors
      }
      this.currentContainer = null;
    }

    this.status = {
      containerId: null,
      status: SandboxStatus.IDLE,
      command: null,
      startTime: null,
      endTime: null,
      duration: null
    };
  }

  /**
   * Get current status
   */
  getStatus(): SandboxStatusInfo {
    return { ...this.status };
  }
}
