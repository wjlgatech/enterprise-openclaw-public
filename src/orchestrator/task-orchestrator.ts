/**
 * Task Orchestrator - DAG-based multi-agent execution
 * Original implementation inspired by workflow patterns
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { Task, AgentConfig, TaskEvent } from '../types.js';
import { AgentFactory } from './agent-executor.js';
import { MetricsLogger } from '../metrics/metrics-logger.js';
import { AuditLogger } from '../security/audit-logger.js';
import { PIIDetector } from '../security/pii-detector.js';

export class TaskOrchestrator extends EventEmitter {
  private tasks = new Map<string, Task>();
  private maxConcurrent: number;
  private runningTasks = 0;

  constructor(
    private metricsLogger: MetricsLogger,
    private auditLogger: AuditLogger,
    private piiDetector: PIIDetector,
    maxConcurrent: number = 5
  ) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  async createTask(
    tenantId: string,
    sessionId: string,
    description: string,
    agents: AgentConfig[]
  ): Promise<Task> {
    const task: Task = {
      id: nanoid(),
      tenantId,
      sessionId,
      description,
      agents,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      metrics: {
        tokensUsed: 0,
        memoryPeakMB: 0,
        cpuPeakPercent: 0,
        costUSD: 0,
      },
    };

    this.tasks.set(task.id, task);

    // Detect PII in task description
    const piiResult = this.piiDetector.detect(description);

    await this.auditLogger.log({
      tenantId,
      userId: 'system',
      sessionId,
      action: 'task.created',
      resource: task.id,
      outcome: 'success',
      piiDetected: piiResult.hasPII,
      piiMasked: false,
      metadata: { description: piiResult.hasPII ? piiResult.maskedText : description },
    });

    this.emitEvent({
      type: 'task.created',
      taskId: task.id,
      timestamp: new Date(),
      data: { taskId: task.id, description },
    });

    // Auto-start if capacity available
    if (this.runningTasks < this.maxConcurrent) {
      setImmediate(() => this.executeTask(task.id));
    }

    return task;
  }

  async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    this.runningTasks++;
    task.status = 'running';
    task.startedAt = new Date();

    this.emitEvent({
      type: 'task.started',
      taskId: task.id,
      timestamp: new Date(),
      data: { taskId: task.id },
    });

    try {
      // Build dependency graph
      const graph = this.buildDependencyGraph(task.agents);

      // Execute agents in topological order
      const results = new Map<string, unknown>();

      for (const level of graph) {
        // Execute agents in parallel within same level
        await Promise.all(
          level.map(async agentConfig => {
            this.emitEvent({
              type: 'agent.started',
              taskId: task.id,
              timestamp: new Date(),
              data: { agent: agentConfig.name },
            });

            const agent = AgentFactory.create(agentConfig);

            // Gather inputs from dependencies
            const input = this.gatherAgentInputs(agentConfig, results, task);

            const result = await agent.execute(input);

            if (result.success) {
              results.set(agentConfig.name, result.result);

              // Accumulate metrics
              task.metrics.tokensUsed += result.metrics.tokensUsed;
              task.metrics.memoryPeakMB = Math.max(
                task.metrics.memoryPeakMB,
                result.metrics.memoryPeakMB
              );
              task.metrics.costUSD += result.metrics.costUSD;

              this.emitEvent({
                type: 'agent.completed',
                taskId: task.id,
                timestamp: new Date(),
                data: { agent: agentConfig.name, result: result.result },
              });

              // Log metrics
              await this.metricsLogger.log({
                timestamp: new Date(),
                tenantId: task.tenantId,
                taskId: task.id,
                agentType: agentConfig.type,
                status: 'completed',
                metrics: result.metrics,
                piiDetected: false,
              });
            } else {
              throw new Error(`Agent ${agentConfig.name} failed: ${result.error}`);
            }
          })
        );

        // Update progress
        const completedAgents = task.agents.filter(a =>
          results.has(a.name)
        ).length;
        task.progress = (completedAgents / task.agents.length) * 100;

        this.emitEvent({
          type: 'task.progress',
          taskId: task.id,
          timestamp: new Date(),
          data: { progress: task.progress },
        });
      }

      // Task completed successfully
      task.status = 'completed';
      task.completedAt = new Date();
      task.metrics.durationMs = task.completedAt.getTime() - task.startedAt!.getTime();
      task.result = Array.from(results.values());

      this.emitEvent({
        type: 'task.completed',
        taskId: task.id,
        timestamp: new Date(),
        data: { result: task.result },
      });

      await this.auditLogger.log({
        tenantId: task.tenantId,
        userId: 'system',
        sessionId: task.sessionId,
        action: 'task.completed',
        resource: task.id,
        outcome: 'success',
        piiDetected: false,
        piiMasked: false,
        metadata: { metrics: task.metrics },
      });
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';

      this.emitEvent({
        type: 'task.failed',
        taskId: task.id,
        timestamp: new Date(),
        data: { error: task.error },
      });

      await this.auditLogger.log({
        tenantId: task.tenantId,
        userId: 'system',
        sessionId: task.sessionId,
        action: 'task.failed',
        resource: task.id,
        outcome: 'failure',
        piiDetected: false,
        piiMasked: false,
        metadata: { error: task.error },
      });

      // Log failure metrics
      await this.metricsLogger.log({
        timestamp: new Date(),
        tenantId: task.tenantId,
        taskId: task.id,
        agentType: 'unknown' as any,
        status: 'failed',
        metrics: task.metrics,
        piiDetected: false,
        error: task.error,
      });
    } finally {
      this.runningTasks--;

      // Process next pending task if available
      const nextTask = Array.from(this.tasks.values()).find(t => t.status === 'pending');
      if (nextTask) {
        setImmediate(() => this.executeTask(nextTask.id));
      }
    }
  }

  private buildDependencyGraph(agents: AgentConfig[]): AgentConfig[][] {
    const levels: AgentConfig[][] = [];
    const processed = new Set<string>();

    while (processed.size < agents.length) {
      const level = agents.filter(agent => {
        if (processed.has(agent.name)) return false;

        const deps = agent.dependsOn || [];
        return deps.every(dep => processed.has(dep));
      });

      if (level.length === 0) {
        throw new Error('Circular dependency detected in agent configuration');
      }

      levels.push(level);
      level.forEach(agent => processed.add(agent.name));
    }

    return levels;
  }

  private gatherAgentInputs(
    agentConfig: AgentConfig,
    results: Map<string, unknown>,
    task: Task
  ): unknown {
    if (!agentConfig.dependsOn || agentConfig.dependsOn.length === 0) {
      // First agent gets task description as input
      return { prompt: task.description, ...agentConfig.config };
    }

    // Gather outputs from dependencies
    const inputs: Record<string, unknown> = { ...agentConfig.config };

    for (const dep of agentConfig.dependsOn) {
      inputs[dep] = results.get(dep);
    }

    return inputs;
  }

  private emitEvent(event: TaskEvent): void {
    this.emit('task-event', event);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(tenantId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.tenantId === tenantId);
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (task.status === 'running') {
      task.status = 'cancelled';
      task.completedAt = new Date();

      this.emitEvent({
        type: 'task.failed',
        taskId: task.id,
        timestamp: new Date(),
        data: { error: 'Task cancelled by user' },
      });
    }
  }
}
