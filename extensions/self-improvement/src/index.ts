/**
 * Self-Improvement Plugin
 * Pattern detection and automatic optimization
 */

import type { EnterprisePlugin } from '../../common/plugin';
import { ImprovementEngine } from '../../../src/improvement/improvement-engine';
import { MetricsLogger } from '../../../src/metrics/metrics-logger';

export const plugin: EnterprisePlugin = {
  metadata: {
    id: 'self-improvement',
    name: 'Self-Improvement Engine',
    version: '1.0.0',
    description: 'Automatic pattern detection and optimization proposals',
  },

  async register(api) {
    const metricsLogger = new MetricsLogger('./data/metrics');
    const improvementEngine = new ImprovementEngine(metricsLogger, 3, './data/improvement');

    await metricsLogger.initialize();
    await improvementEngine.initialize();

    // Run improvement analysis every 5 minutes
    setInterval(async () => {
      try {
        const since = new Date(Date.now() - 5 * 60 * 1000);
        await improvementEngine.analyzeMetrics('default', since);

        const proposals = await improvementEngine.getProposals('proposed');
        if (proposals.length > 0) {
          api.emit('improvement.proposals', proposals);
          console.log(`Generated ${proposals.length} new improvement proposals`);
        }
      } catch (error) {
        console.error('Improvement analysis failed:', error);
      }
    }, 5 * 60 * 1000);

    // Register gateway methods
    api.registerMethod('improvement.analyze', async (params) => {
      const since = params.since ? new Date(params.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      await improvementEngine.analyzeMetrics(params.tenantId || 'default', since);
      return { success: true };
    });

    api.registerMethod('improvement.getProposals', async (params) => {
      const proposals = await improvementEngine.getProposals(params.status);
      return proposals;
    });

    api.registerMethod('improvement.approve', async (params) => {
      await improvementEngine.approveProposal(params.proposalId);
      return { success: true };
    });

    api.registerMethod('improvement.reject', async (params) => {
      await improvementEngine.rejectProposal(params.proposalId);
      return { success: true };
    });

    console.log('✓ Self-Improvement Engine plugin initialized');
  },

  async onGatewayStart(gateway) {
    console.log('Self-Improvement Engine: Pattern detection active');
  },
};

export default plugin;
