/**
 * Security Module Type Definitions
 *
 * Defines types for:
 * - Sandbox execution configuration
 * - Network policies
 * - Resource limits
 * - Execution results
 */

import { z } from 'zod';

/**
 * Network isolation policies for sandbox
 */
export enum NetworkPolicy {
  NONE = 'none',           // No network access
  INTERNAL = 'internal',   // Only internal network
  LIMITED = 'limited',     // Limited external access
  FULL = 'full'           // Full network access
}

/**
 * Sandbox execution status
 */
export enum SandboxStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  KILLED = 'killed'
}

/**
 * Resource limits for sandbox container
 */
export const ResourceLimitsSchema = z.object({
  cpuQuota: z.number().positive().optional(), // CPU quota in microseconds
  cpuPeriod: z.number().positive().optional(), // CPU period in microseconds
  memory: z.number().positive().optional(),     // Memory limit in bytes (e.g., 512 * 1024 * 1024 for 512MB)
  memorySwap: z.number().optional(),            // Memory + swap limit
  pidsLimit: z.number().positive().optional()   // Max number of processes
});

export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;

/**
 * Sandbox configuration
 */
export const SandboxConfigSchema = z.object({
  image: z.string().default('openclaw-sandbox:latest'),
  networkPolicy: z.nativeEnum(NetworkPolicy).default(NetworkPolicy.NONE),
  timeout: z.number().positive().default(30000), // Timeout in milliseconds
  workDir: z.string().default('/workspace'),
  resourceLimits: ResourceLimitsSchema.optional(),
  env: z.record(z.string()).optional(),           // Environment variables
  mountPaths: z.array(z.object({
    hostPath: z.string(),
    containerPath: z.string(),
    readOnly: z.boolean().default(true)
  })).optional()
});

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

/**
 * Execution result from sandbox
 */
export interface ExecutionResult {
  status: SandboxStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;        // Execution time in milliseconds
  containerId?: string;
  error?: string;
}

/**
 * Sandbox status information
 */
export interface SandboxStatusInfo {
  containerId: string | null;
  status: SandboxStatus;
  command: string | null;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
}

/**
 * Docker container configuration
 */
export interface DockerContainerConfig {
  Image: string;
  Cmd: string[];
  Env?: string[];
  WorkingDir?: string;
  HostConfig?: {
    NetworkMode?: string;
    Memory?: number;
    MemorySwap?: number;
    CpuQuota?: number;
    CpuPeriod?: number;
    PidsLimit?: number;
    ReadonlyRootfs?: boolean;
    Binds?: string[];
    AutoRemove?: boolean;
  };
}

/**
 * Audit log entry for sandbox execution
 */
export interface SandboxAuditEntry {
  timestamp: number;
  containerId: string;
  command: string;
  status: SandboxStatus;
  exitCode: number | null;
  duration: number;
  stdout: string;
  stderr: string;
  error?: string;
  userId?: string;
  sessionId?: string;
}
