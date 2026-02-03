/**
 * Multi-Agent Orchestrator Plugin
 * Provides DAG-based workflow execution
 */

import type { EnterprisePlugin } from '../../common/plugin';
import { TaskOrchestrator } from '../../../src/orchestrator/task-orchestrator';
import { MetricsLogger } from '../../../src/metrics/metrics-logger';
import { AuditLogger } from '../../../src/security/audit-logger';
import { PIIDetector } from '../../../src/security/pii-detector';

export const plugin: EnterprisePlugin = {
  metadata: {
    id: 'multi-agent-orchestrator',
    name: 'Multi-Agent Orchestrator',
    version: '1.0.0',
    description: 'DAG-based multi-agent workflow execution',
  },

  async register(api) {
    // Initialize components
    const metricsLogger = new MetricsLogger('./data/metrics');
    const auditLogger = new AuditLogger('./data/audit-logs');
    const piiDetector = new PIIDetector();

    await metricsLogger.initialize();
    await auditLogger.initialize();

    const orchestrator = new TaskOrchestrator(
      metricsLogger,
      auditLogger,
      piiDetector,
      5 // max concurrent
    );

    // Subscribe to task events and emit to gateway
    orchestrator.on('task-event', (event) => {
      api.emit('orchestrator.event', event);
    });

    // Register gateway methods
    api.registerMethod('orchestrator.createTask', async (params) => {
      const task = await orchestrator.createTask(
        params.tenantId,
        params.sessionId,
        params.description,
        params.agents
      );

      return {
        taskId: task.id,
        status: task.status,
      };
    });

    api.registerMethod('orchestrator.getTask', async (params) => {
      const task = orchestrator.getTask(params.taskId);
      return task || { error: 'Task not found' };
    });

    api.registerMethod('orchestrator.getAllTasks', async (params) => {
      const tasks = orchestrator.getAllTasks(params.tenantId);
      return tasks;
    });

    api.registerMethod('orchestrator.cancelTask', async (params) => {
      await orchestrator.cancelTask(params.taskId);
      return { success: true };
    });

    // Hook into session messages to trigger orchestration
    api.on('session.message', async (data: any) => {
      if (data.message?.content?.startsWith('/orchestrate')) {
        // Parse orchestration request
        // Create and execute task
        console.log('Orchestration request detected');
      }
    });

    console.log('✓ Multi-Agent Orchestrator plugin initialized');
  },

  async onGatewayStart(gateway) {
    console.log('Multi-Agent Orchestrator: Ready to execute workflows');
  },
};

export default plugin;
