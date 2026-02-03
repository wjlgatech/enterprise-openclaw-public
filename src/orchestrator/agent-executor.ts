/**
 * Agent Executor - Execute individual agents
 * Now supports multiple LLM providers (Anthropic, AI Refinery, etc.)
 */

import { AgentConfig, TaskMetrics } from '../types.js';
import { 
  LLMProvider, 
  CompletionRequest, 
  getDefaultProvider,
  providerRegistry,
  AnthropicProvider,
  AIRefineryProvider,
} from '../providers/index.js';

export interface AgentExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  metrics: TaskMetrics;
  provider?: string;
}

export abstract class AgentExecutor {
  protected provider: LLMProvider;

  constructor(protected config: AgentConfig) {
    // Use provider from config, or get default
    if (config.provider) {
      this.provider = providerRegistry.get(config.provider);
    } else {
      this.provider = getDefaultProvider();
    }
  }

  abstract execute(input: unknown): Promise<AgentExecutionResult>;

  protected async measureExecution<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; metrics: Partial<TaskMetrics> }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      return {
        result,
        metrics: {
          durationMs,
          memoryPeakMB: Math.max(endMemory - startMemory, 0),
          tokensUsed: 0,
          cpuPeakPercent: 0,
          costUSD: 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    // Cost estimation based on provider
    // TODO: Make this configurable per provider/model
    const rates: Record<string, { input: number; output: number }> = {
      anthropic: { input: 3.0, output: 15.0 },      // Claude 3 Haiku per 1M tokens
      airefinery: { input: 0.0, output: 0.0 },       // Internal - no direct cost
    };

    const rate = rates[this.provider.name] || rates.anthropic;
    return (inputTokens / 1_000_000) * rate.input + 
           (outputTokens / 1_000_000) * rate.output;
  }
}

/**
 * Code Generator Agent
 * Uses configurable LLM provider
 */
export class CodeGeneratorAgent extends AgentExecutor {
  async execute(input: { prompt: string }): Promise<AgentExecutionResult> {
    try {
      const { result, metrics } = await this.measureExecution(async () => {
        const request: CompletionRequest = {
          messages: [
            {
              role: 'user',
              content: `Generate production-ready code for: ${input.prompt}\n\nInclude:\n1. Type-safe implementation\n2. Error handling\n3. Unit tests\n4. Documentation`,
            },
          ],
          maxTokens: 4096,
        };

        return await this.provider.complete(request);
      });

      const costUSD = this.calculateCost(
        result.usage.inputTokens,
        result.usage.outputTokens
      );

      return {
        success: true,
        result: result.content,
        provider: this.provider.name,
        metrics: {
          durationMs: metrics.durationMs || 0,
          memoryPeakMB: metrics.memoryPeakMB || 0,
          cpuPeakPercent: metrics.cpuPeakPercent || 0,
          tokensUsed: result.usage.totalTokens,
          costUSD,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider.name,
        metrics: {
          durationMs: 0,
          tokensUsed: 0,
          memoryPeakMB: 0,
          cpuPeakPercent: 0,
          costUSD: 0,
        },
      };
    }
  }
}

/**
 * Analyzer Agent
 * Uses configurable LLM provider
 */
export class AnalyzerAgent extends AgentExecutor {
  async execute(input: { data: unknown; analysisType: string }): Promise<AgentExecutionResult> {
    try {
      const { result, metrics } = await this.measureExecution(async () => {
        const request: CompletionRequest = {
          messages: [
            {
              role: 'user',
              content: `Perform ${input.analysisType} analysis on:\n\n${JSON.stringify(input.data, null, 2)}\n\nProvide actionable insights and recommendations.`,
            },
          ],
          maxTokens: 2048,
        };

        return await this.provider.complete(request);
      });

      const costUSD = this.calculateCost(
        result.usage.inputTokens,
        result.usage.outputTokens
      );

      return {
        success: true,
        result: result.content,
        provider: this.provider.name,
        metrics: {
          durationMs: metrics.durationMs || 0,
          memoryPeakMB: metrics.memoryPeakMB || 0,
          cpuPeakPercent: metrics.cpuPeakPercent || 0,
          tokensUsed: result.usage.totalTokens,
          costUSD,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider.name,
        metrics: {
          durationMs: 0,
          tokensUsed: 0,
          memoryPeakMB: 0,
          cpuPeakPercent: 0,
          costUSD: 0,
        },
      };
    }
  }
}

/**
 * Knowledge Extractor Agent
 * Uses configurable LLM provider for summarization
 */
export class KnowledgeExtractorAgent extends AgentExecutor {
  async execute(input: { documents: string[] }): Promise<AgentExecutionResult> {
    try {
      const { result, metrics } = await this.measureExecution(async () => {
        // Use LLM for better knowledge extraction
        const summaries = await Promise.all(
          input.documents.map(async (doc, idx) => {
            const request: CompletionRequest = {
              messages: [
                {
                  role: 'user',
                  content: `Extract key knowledge from this document. Return JSON with: summary, keywords, entities, key_facts.\n\nDocument:\n${doc}`,
                },
              ],
              maxTokens: 1024,
            };

            try {
              const response = await this.provider.complete(request);
              return {
                id: `doc-${idx}`,
                content: doc.substring(0, 500),
                extracted: response.content,
                tokens: response.usage.totalTokens,
              };
            } catch {
              // Fallback to simple extraction
              return {
                id: `doc-${idx}`,
                content: doc.substring(0, 500),
                keywords: this.extractKeywords(doc),
                summary: doc.substring(0, 200) + '...',
                tokens: 0,
              };
            }
          })
        );

        const totalTokens = summaries.reduce((sum, s) => sum + (s.tokens || 0), 0);
        return { summaries, totalTokens };
      });

      return {
        success: true,
        result: result.summaries,
        provider: this.provider.name,
        metrics: {
          durationMs: metrics.durationMs || 0,
          memoryPeakMB: metrics.memoryPeakMB || 0,
          cpuPeakPercent: metrics.cpuPeakPercent || 0,
          tokensUsed: result.totalTokens,
          costUSD: this.calculateCost(result.totalTokens * 0.3, result.totalTokens * 0.7),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider.name,
        metrics: {
          durationMs: 0,
          tokensUsed: 0,
          memoryPeakMB: 0,
          cpuPeakPercent: 0,
          costUSD: 0,
        },
      };
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = new Map<string, number>();

    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

/**
 * Agent Factory
 * Creates agents with configurable providers
 */
export class AgentFactory {
  static create(config: AgentConfig): AgentExecutor {
    switch (config.type) {
      case 'code-generator':
        return new CodeGeneratorAgent(config);
      case 'analyzer':
        return new AnalyzerAgent(config);
      case 'knowledge-extractor':
        return new KnowledgeExtractorAgent(config);
      default:
        throw new Error(`Unknown agent type: ${config.type}`);
    }
  }
}

/**
 * Initialize providers on module load
 */
export function initializeProviders(): void {
  // Register available providers
  if (process.env.ANTHROPIC_API_KEY) {
    providerRegistry.register('anthropic', new AnthropicProvider());
  }
  
  if (process.env.AIR_API_KEY) {
    providerRegistry.register('airefinery', new AIRefineryProvider());
    // Make AI Refinery default if available
    providerRegistry.setDefault('airefinery');
  }
}
