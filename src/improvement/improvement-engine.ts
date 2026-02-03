/**
 * Self-Improvement Engine - Learn from every interaction
 * Original implementation based on pattern detection
 */

import { MetricsLogger } from '../metrics/metrics-logger.js';
import { Pattern, ImprovementProposal, MetricRecord } from '../types.js';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class ImprovementEngine {
  private patterns: Map<string, Pattern> = new Map();
  private proposals: Map<string, ImprovementProposal> = new Map();
  private dataDir: string;

  constructor(
    private metricsLogger: MetricsLogger,
    private minPatternFrequency: number = 3,
    baseDir: string = './data/improvement'
  ) {
    this.dataDir = baseDir;
  }

  async initialize(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await this.loadPatterns();
    await this.loadProposals();
  }

  async analyzeMetrics(tenantId: string, since: Date): Promise<void> {
    const metrics = await this.metricsLogger.getMetrics(tenantId, since);

    // Detect failure patterns
    await this.detectFailurePatterns(metrics);

    // Detect performance bottlenecks
    await this.detectPerformanceBottlenecks(metrics);

    // Generate improvement proposals
    await this.generateProposals();

    // Save patterns and proposals
    await this.savePatterns();
    await this.saveProposals();
  }

  private async detectFailurePatterns(metrics: MetricRecord[]): Promise<void> {
    const failures = metrics.filter(m => m.status === 'failed');

    // Group failures by agent type and error pattern
    const failureGroups: Record<string, MetricRecord[]> = {};

    for (const failure of failures) {
      const key = `${failure.agentType}:${failure.error?.substring(0, 50) || 'unknown'}`;
      if (!failureGroups[key]) {
        failureGroups[key] = [];
      }
      failureGroups[key].push(failure);
    }

    // Create or update patterns
    for (const [key, group] of Object.entries(failureGroups)) {
      if (group.length >= this.minPatternFrequency) {
        const [agentType, errorPrefix] = key.split(':');
        const patternId = `failure-${agentType}-${Date.now()}`;

        const existing = this.patterns.get(patternId);
        if (existing) {
          existing.frequency += group.length;
          existing.lastSeen = new Date();
        } else {
          this.patterns.set(patternId, {
            id: patternId,
            type: 'failure',
            description: `${agentType} frequently fails with: ${errorPrefix}`,
            frequency: group.length,
            firstSeen: new Date(group[0].timestamp),
            lastSeen: new Date(group[group.length - 1].timestamp),
            context: {
              agentType,
              errorPattern: errorPrefix,
              sampleErrors: group.slice(0, 3).map(g => g.error),
            },
          });
        }
      }
    }
  }

  private async detectPerformanceBottlenecks(metrics: MetricRecord[]): Promise<void> {
    const stats = await this.metricsLogger.getAggregateStats(
      metrics[0]?.tenantId || 'default',
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    // Detect slow agents (above 2x average duration)
    for (const [agentType, agentStats] of Object.entries(stats.byAgentType)) {
      if (agentStats.avgDuration > stats.avgDuration * 2) {
        const patternId = `perf-${agentType}`;

        this.patterns.set(patternId, {
          id: patternId,
          type: 'performance',
          description: `${agentType} is significantly slower than average`,
          frequency: agentStats.count,
          firstSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
          lastSeen: new Date(),
          context: {
            agentType,
            avgDuration: agentStats.avgDuration,
            overallAvg: stats.avgDuration,
            ratio: agentStats.avgDuration / stats.avgDuration,
          },
        });
      }
    }
  }

  private async generateProposals(): Promise<void> {
    for (const pattern of this.patterns.values()) {
      // Skip if already have a proposal for this pattern
      const existingProposal = Array.from(this.proposals.values())
        .find(p => p.patternId === pattern.id && p.status !== 'rejected');

      if (existingProposal) continue;

      // Generate proposal based on pattern type
      if (pattern.type === 'failure' && pattern.frequency >= this.minPatternFrequency) {
        await this.createFailureProposal(pattern);
      } else if (pattern.type === 'performance') {
        await this.createPerformanceProposal(pattern);
      }
    }
  }

  private async createFailureProposal(pattern: Pattern): Promise<void> {
    const proposalId = `prop-${pattern.id}-${Date.now()}`;
    const agentType = pattern.context.agentType as string;

    // Simple heuristic: if timeout-related, increase timeout
    const errorPattern = (pattern.context.errorPattern as string).toLowerCase();

    if (errorPattern.includes('timeout')) {
      this.proposals.set(proposalId, {
        id: proposalId,
        patternId: pattern.id,
        type: 'config_change',
        target: `${agentType}.timeout`,
        currentValue: 30000,
        proposedValue: 60000,
        rationale: `${agentType} frequently times out. Increasing timeout from 30s to 60s.`,
        expectedImprovement: `${Math.round((pattern.frequency / (pattern.frequency + 10)) * 100)}% reduction in timeout failures`,
        status: 'proposed',
        createdAt: new Date(),
      });
    } else if (errorPattern.includes('memory') || errorPattern.includes('resource')) {
      this.proposals.set(proposalId, {
        id: proposalId,
        patternId: pattern.id,
        type: 'resource_adjustment',
        target: `${agentType}.memoryLimit`,
        currentValue: 512,
        proposedValue: 1024,
        rationale: `${agentType} frequently hits memory limits. Increasing from 512MB to 1024MB.`,
        expectedImprovement: `${Math.round((pattern.frequency / (pattern.frequency + 10)) * 100)}% reduction in memory failures`,
        status: 'proposed',
        createdAt: new Date(),
      });
    }
  }

  private async createPerformanceProposal(pattern: Pattern): Promise<void> {
    const proposalId = `prop-${pattern.id}-${Date.now()}`;
    const agentType = pattern.context.agentType as string;
    const ratio = pattern.context.ratio as number;

    this.proposals.set(proposalId, {
      id: proposalId,
      patternId: pattern.id,
      type: 'model_switch',
      target: `${agentType}.model`,
      currentValue: 'claude-sonnet-4.5',
      proposedValue: 'claude-haiku-4.5',
      rationale: `${agentType} is ${ratio.toFixed(1)}x slower than average. Consider using Haiku for faster response.`,
      expectedImprovement: `~50% reduction in latency with minimal quality impact for simple tasks`,
      status: 'proposed',
      createdAt: new Date(),
    });
  }

  async getProposals(status?: ImprovementProposal['status']): Promise<ImprovementProposal[]> {
    const proposals = Array.from(this.proposals.values());

    if (status) {
      return proposals.filter(p => p.status === status);
    }

    return proposals;
  }

  async approveProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      proposal.status = 'approved';
      await this.saveProposals();
    }
  }

  async rejectProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      proposal.status = 'rejected';
      await this.saveProposals();
    }
  }

  private async loadPatterns(): Promise<void> {
    try {
      const content = await readFile(join(this.dataDir, 'patterns.json'), 'utf-8');
      const patterns = JSON.parse(content) as Pattern[];
      this.patterns = new Map(patterns.map(p => [p.id, p]));
    } catch {
      // File doesn't exist yet, start fresh
    }
  }

  private async loadProposals(): Promise<void> {
    try {
      const content = await readFile(join(this.dataDir, 'proposals.json'), 'utf-8');
      const proposals = JSON.parse(content) as ImprovementProposal[];
      this.proposals = new Map(proposals.map(p => [p.id, p]));
    } catch {
      // File doesn't exist yet, start fresh
    }
  }

  private async savePatterns(): Promise<void> {
    const patterns = Array.from(this.patterns.values());
    await writeFile(
      join(this.dataDir, 'patterns.json'),
      JSON.stringify(patterns, null, 2)
    );
  }

  private async saveProposals(): Promise<void> {
    const proposals = Array.from(this.proposals.values());
    await writeFile(
      join(this.dataDir, 'proposals.json'),
      JSON.stringify(proposals, null, 2)
    );
  }
}
