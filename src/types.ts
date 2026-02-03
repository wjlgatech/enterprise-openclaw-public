/**
 * Core type definitions for Enterprise OpenClaw
 * Original implementation - no proprietary code
 */

export interface TenantConfig {
  id: string;
  name: string;
  maxSessions: number;
  resourceQuota: ResourceQuota;
  apiKeys: string[];
  createdAt: Date;
}

export interface ResourceQuota {
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxConcurrentTasks: number;
  maxTokensPerMinute: number;
}

export interface Session {
  id: string;
  tenantId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

export interface AgentConfig {
  name: string;
  type: AgentType;
  description: string;
  config: Record<string, unknown>;
  dependsOn?: string[];
  /** LLM provider to use (anthropic, airefinery, etc.) */
  provider?: string;
  /** Model to use (overrides provider default) */
  model?: string;
}

export type AgentType =
  | 'code-generator'
  | 'analyzer'
  | 'knowledge-extractor'
  | 'custom';

export interface Task {
  id: string;
  tenantId: string;
  sessionId: string;
  description: string;
  agents: AgentConfig[];
  status: TaskStatus;
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metrics: TaskMetrics;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TaskMetrics {
  durationMs?: number;
  tokensUsed: number;
  memoryPeakMB: number;
  cpuPeakPercent: number;
  costUSD: number;
  qualityScore?: number;
}

export interface TaskEvent {
  type: TaskEventType;
  taskId: string;
  timestamp: Date;
  data: unknown;
}

export type TaskEventType =
  | 'task.created'
  | 'task.started'
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.error';

export interface MetricRecord {
  timestamp: Date;
  tenantId: string;
  taskId: string;
  agentType: AgentType;
  status: TaskStatus;
  metrics: TaskMetrics;
  piiDetected: boolean;
  error?: string;
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  context: Record<string, unknown>;
}

export interface ImprovementProposal {
  id: string;
  patternId: string;
  type: 'config_change' | 'prompt_refinement' | 'model_switch' | 'resource_adjustment';
  target: string;
  currentValue: unknown;
  proposedValue: unknown;
  rationale: string;
  expectedImprovement: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  impact?: ImprovementImpact;
  createdAt: Date;
}

export interface ImprovementImpact {
  before: {
    successRate: number;
    avgDuration: number;
    avgCost: number;
  };
  after: {
    successRate: number;
    avgDuration: number;
    avgCost: number;
  };
  improvement: {
    successRateDelta: number;
    durationDelta: number;
    costDelta: number;
  };
}

export interface AuditLogEntry {
  timestamp: Date;
  tenantId: string;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  piiDetected: boolean;
  piiMasked: boolean;
  metadata: Record<string, unknown>;
}

export interface PIIEntity {
  type: 'email' | 'ssn' | 'phone' | 'credit_card' | 'name' | 'address';
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  entities: PIIEntity[];
  maskedText: string;
  maskingMap: Record<string, string>;
}
