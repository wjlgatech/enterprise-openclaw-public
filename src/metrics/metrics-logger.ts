/**
 * Metrics Logger - Collect performance data for self-improvement
 * Original implementation
 */

import { mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { MetricRecord } from '../types.js';

export class MetricsLogger {
  private metricsDir: string;

  constructor(baseDir: string = './data/metrics') {
    this.metricsDir = baseDir;
  }

  async initialize(): Promise<void> {
    await mkdir(this.metricsDir, { recursive: true });
  }

  async log(record: MetricRecord): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filePath = join(this.metricsDir, `metrics-${date}.jsonl`);

    const line = JSON.stringify(record) + '\n';

    try {
      const { appendFile } = await import('fs/promises');
      await appendFile(filePath, line);
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }

  async getMetrics(tenantId: string, since: Date): Promise<MetricRecord[]> {
    const date = since.toISOString().split('T')[0];
    const filePath = join(this.metricsDir, `metrics-${date}.jsonl`);

    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      return lines
        .map(line => JSON.parse(line) as MetricRecord)
        .filter(record => record.tenantId === tenantId);
    } catch (error) {
      return [];
    }
  }

  async getAggregateStats(tenantId: string, since: Date): Promise<{
    totalTasks: number;
    successRate: number;
    avgDuration: number;
    avgCost: number;
    avgTokens: number;
    byAgentType: Record<string, { count: number; successRate: number; avgDuration: number }>;
  }> {
    const metrics = await this.getMetrics(tenantId, since);

    if (metrics.length === 0) {
      return {
        totalTasks: 0,
        successRate: 0,
        avgDuration: 0,
        avgCost: 0,
        avgTokens: 0,
        byAgentType: {},
      };
    }

    const successful = metrics.filter(m => m.status === 'completed');
    const successRate = successful.length / metrics.length;

    const avgDuration = metrics.reduce((sum, m) => sum + (m.metrics.durationMs || 0), 0) / metrics.length;
    const avgCost = metrics.reduce((sum, m) => sum + m.metrics.costUSD, 0) / metrics.length;
    const avgTokens = metrics.reduce((sum, m) => sum + m.metrics.tokensUsed, 0) / metrics.length;

    // Group by agent type
    const byAgentType: Record<string, MetricRecord[]> = {};
    for (const metric of metrics) {
      if (!byAgentType[metric.agentType]) {
        byAgentType[metric.agentType] = [];
      }
      byAgentType[metric.agentType].push(metric);
    }

    const agentStats: Record<string, { count: number; successRate: number; avgDuration: number }> = {};
    for (const [type, records] of Object.entries(byAgentType)) {
      const successCount = records.filter(r => r.status === 'completed').length;
      const avgDur = records.reduce((sum, r) => sum + (r.metrics.durationMs || 0), 0) / records.length;

      agentStats[type] = {
        count: records.length,
        successRate: successCount / records.length,
        avgDuration: avgDur,
      };
    }

    return {
      totalTasks: metrics.length,
      successRate,
      avgDuration,
      avgCost,
      avgTokens,
      byAgentType: agentStats,
    };
  }
}
