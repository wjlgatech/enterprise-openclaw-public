/**
 * Extended Thinking Manager
 * Manages and analyzes Claude's extended thinking process
 */

import type { ThinkingStep, QualityMetrics } from './types';

export class ExtendedThinkingManager {
  private thinkingCache: Map<string, ThinkingStep[]> = new Map();

  /**
   * Store thinking process for a response
   */
  storeThinking(responseId: string, thinking: string[]): void {
    const steps: ThinkingStep[] = thinking.map((t) => ({
      type: 'thinking',
      thinking: t,
    }));
    this.thinkingCache.set(responseId, steps);
  }

  /**
   * Get thinking process for a response
   */
  getThinkingProcess(responseId: string): ThinkingStep[] {
    return this.thinkingCache.get(responseId) || [];
  }

  /**
   * Analyze quality of thinking process
   */
  analyzeQuality(thinking: ThinkingStep[]): QualityMetrics {
    if (thinking.length === 0) {
      return {
        thinkingDepth: 0,
        coherence: 0,
        relevance: 0,
      };
    }

    // Calculate thinking depth based on number of steps and content length
    const totalLength = thinking.reduce(
      (sum, step) => sum + step.thinking.length,
      0
    );
    const avgLength = totalLength / thinking.length;
    const thinkingDepth = Math.min(
      1.0,
      (thinking.length * avgLength) / 10000
    );

    // Simple coherence metric based on connecting words
    const coherenceWords = ['therefore', 'because', 'thus', 'hence', 'so'];
    const coherenceCount = thinking.reduce((count, step) => {
      return (
        count +
        coherenceWords.filter((word) =>
          step.thinking.toLowerCase().includes(word)
        ).length
      );
    }, 0);
    const coherence = Math.min(1.0, coherenceCount / thinking.length);

    // Relevance based on variety of concepts (simple heuristic)
    const allText = thinking.map((s) => s.thinking).join(' ');
    const uniqueWords = new Set(
      allText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );
    const relevance = Math.min(1.0, uniqueWords.size / 100);

    return {
      thinkingDepth,
      coherence,
      relevance,
    };
  }

  /**
   * Clear old thinking cache (keep last 100)
   */
  clearOldCache(): void {
    if (this.thinkingCache.size > 100) {
      const keys = Array.from(this.thinkingCache.keys());
      const toDelete = keys.slice(0, keys.length - 100);
      toDelete.forEach((key) => this.thinkingCache.delete(key));
    }
  }
}
