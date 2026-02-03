/**
 * AnalyticsAgent Tests
 * Reality-Grounded TDD - Tests written FIRST
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsAgent } from '../../extensions/agent-library/utility-agents/analytics-agent';

describe('AnalyticsAgent', () => {
  let agent: AnalyticsAgent;

  beforeEach(() => {
    agent = new AnalyticsAgent({
      agentName: 'analytics',
      agentDescription: 'Performs data analysis and statistical insights',
    });
  });

  // ===== Agent Interface Compliance =====
  describe('Agent Interface', () => {
    it('should implement execute method', () => {
      expect(agent.execute).toBeDefined();
      expect(typeof agent.execute).toBe('function');
    });

    it('should implement selfReflect method', () => {
      expect(agent.selfReflect).toBeDefined();
      expect(typeof agent.selfReflect).toBe('function');
    });

    it('should implement getConfig method', () => {
      expect(agent.getConfig).toBeDefined();
      expect(typeof agent.getConfig).toBe('function');
    });

    it('should return config with required fields', () => {
      const config = agent.getConfig();
      expect(config).toHaveProperty('agentName');
      expect(config).toHaveProperty('agentDescription');
      expect(config.agentName).toBe('analytics');
    });

    it('should apply default configuration values', () => {
      const config = agent.getConfig();
      expect(config.selfReflection).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.temperature).toBeDefined();
    });
  });

  // ===== Data Format Parsing =====
  describe('Data Format Parsing', () => {
    it('should parse valid JSON array data', async () => {
      const jsonData = JSON.stringify([1, 2, 3, 4, 5]);
      const result = await agent.execute(jsonData);
      expect(result).toBeDefined();
      expect(result.toLowerCase()).toContain('mean');
    });

    it('should parse JSON object with array field', async () => {
      const jsonData = JSON.stringify({ values: [10, 20, 30, 40, 50] });
      const result = await agent.execute(jsonData);
      expect(result).toBeDefined();
      expect(result.toLowerCase()).toContain('mean');
    });

    it('should parse CSV format data', async () => {
      const csvData = 'value\n10\n20\n30\n40\n50';
      const result = await agent.execute(csvData, { format: 'csv' });
      expect(result).toBeDefined();
      expect(result.toLowerCase()).toContain('mean');
    });

    it('should parse CSV with multiple columns', async () => {
      const csvData = 'name,value\nA,10\nB,20\nC,30';
      const result = await agent.execute(csvData, { format: 'csv', column: 'value' });
      expect(result).toBeDefined();
      expect(result.toLowerCase()).toContain('mean');
    });

    it('should handle CSV with headers', async () => {
      const csvData = 'temperature,humidity\n72,45\n75,50\n68,55';
      const result = await agent.execute(csvData, { format: 'csv', column: 'temperature' });
      expect(result).toContain('mean');
    });

    it('should reject empty data', async () => {
      await expect(agent.execute('')).rejects.toThrow();
    });

    it('should reject invalid JSON', async () => {
      await expect(agent.execute('not valid json')).rejects.toThrow();
    });

    it('should reject data with no numeric values', async () => {
      const jsonData = JSON.stringify(['a', 'b', 'c']);
      await expect(agent.execute(jsonData)).rejects.toThrow();
    });
  });

  // ===== Statistical Analysis =====
  describe('Statistical Analysis', () => {
    const sampleData = JSON.stringify([10, 20, 30, 40, 50]);

    it('should calculate mean (average)', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Mean: 30');
    });

    it('should calculate median', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Median: 30');
    });

    it('should calculate mode', async () => {
      const dataWithMode = JSON.stringify([1, 2, 2, 3, 3, 3, 4]);
      const result = await agent.execute(dataWithMode);
      expect(result).toContain('Mode: 3');
    });

    it('should handle dataset with no mode', async () => {
      const noModeData = JSON.stringify([1, 2, 3, 4, 5]);
      const result = await agent.execute(noModeData);
      expect(result).toContain('Mode');
    });

    it('should calculate standard deviation', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Standard Deviation');
    });

    it('should calculate variance', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Variance');
    });

    it('should identify minimum and maximum values', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Min: 10');
      expect(result).toContain('Max: 50');
    });

    it('should calculate range', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Range: 40');
    });

    it('should calculate quartiles', async () => {
      const result = await agent.execute(sampleData);
      expect(result).toContain('Q1') || expect(result).toContain('25th percentile');
    });

    it('should handle single value dataset', async () => {
      const singleValue = JSON.stringify([42]);
      const result = await agent.execute(singleValue);
      expect(result).toContain('Mean: 42');
      expect(result).toContain('Median: 42');
    });
  });

  // ===== Correlation Analysis =====
  describe('Correlation Analysis', () => {
    it('should calculate correlation between two datasets', async () => {
      const data = JSON.stringify({
        x: [1, 2, 3, 4, 5],
        y: [2, 4, 6, 8, 10]
      });
      const result = await agent.execute(data, { analysis: 'correlation' });
      expect(result).toContain('Correlation');
      expect(result).toContain('1.00'); // Perfect positive correlation
    });

    it('should detect negative correlation', async () => {
      const data = JSON.stringify({
        x: [1, 2, 3, 4, 5],
        y: [10, 8, 6, 4, 2]
      });
      const result = await agent.execute(data, { analysis: 'correlation' });
      expect(result).toContain('Correlation');
      expect(result).toContain('-1.00'); // Perfect negative correlation
    });

    it('should handle no correlation', async () => {
      const data = JSON.stringify({
        x: [1, 2, 3, 4, 5],
        y: [3, 1, 4, 2, 5]
      });
      const result = await agent.execute(data, { analysis: 'correlation' });
      expect(result).toContain('Correlation');
    });

    it('should reject correlation with mismatched array lengths', async () => {
      const data = JSON.stringify({
        x: [1, 2, 3],
        y: [1, 2, 3, 4, 5]
      });
      await expect(agent.execute(data, { analysis: 'correlation' })).rejects.toThrow();
    });
  });

  // ===== Trend Analysis =====
  describe('Trend Analysis', () => {
    it('should detect increasing trend', async () => {
      const trendData = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const result = await agent.execute(trendData, { analysis: 'trend' });
      expect(result).toContain('Trend') || expect(result).toContain('increasing');
    });

    it('should detect decreasing trend', async () => {
      const trendData = JSON.stringify([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      const result = await agent.execute(trendData, { analysis: 'trend' });
      expect(result).toContain('decreasing') || expect(result).toContain('negative');
    });

    it('should detect stable/flat trend', async () => {
      const trendData = JSON.stringify([5, 5, 5, 5, 5]);
      const result = await agent.execute(trendData, { analysis: 'trend' });
      expect(result).toContain('stable') || expect(result).toContain('flat');
    });

    it('should calculate trend line slope', async () => {
      const trendData = JSON.stringify([1, 3, 5, 7, 9]);
      const result = await agent.execute(trendData, { analysis: 'trend' });
      expect(result.toLowerCase()).toContain('slope');
    });
  });

  // ===== Insight Generation =====
  describe('Insight Generation', () => {
    it('should identify outliers in dataset', async () => {
      const outlierData = JSON.stringify([10, 12, 11, 13, 12, 100, 11, 12]);
      const result = await agent.execute(outlierData);
      expect(result).toContain('outlier') || expect(result).toContain('unusual');
    });

    it('should generate insights about data distribution', async () => {
      const data = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const result = await agent.execute(data);
      expect(result).toContain('Insights') || expect(result).toContain('Key Findings');
    });

    it('should provide recommendations based on analysis', async () => {
      const data = JSON.stringify([10, 20, 30, 40, 50]);
      const result = await agent.execute(data);
      expect(result.length).toBeGreaterThan(100); // Should have substantive output
    });

    it('should identify high variance scenarios', async () => {
      const highVarianceData = JSON.stringify([1, 100, 2, 99, 3, 98]);
      const result = await agent.execute(highVarianceData);
      expect(result.toLowerCase()).toContain('variance') || expect(result.toLowerCase()).toContain('variability');
    });

    it('should identify low variance scenarios', async () => {
      const lowVarianceData = JSON.stringify([10, 10.5, 10.2, 10.3, 10.1]);
      const result = await agent.execute(lowVarianceData);
      expect(result).toContain('consistent') || expect(result).toContain('stable');
    });
  });

  // ===== Self-Reflection =====
  describe('Self-Reflection', () => {
    it('should perform self-reflection when enabled', async () => {
      const reflectiveAgent = new AnalyticsAgent({
        agentName: 'analytics-reflective',
        agentDescription: 'Analytics with reflection',
        selfReflection: {
          enabled: true,
          maxAttempts: 2,
        },
      });

      const data = JSON.stringify([1, 2, 3, 4, 5]);
      const result = await reflectiveAgent.execute(data);
      const reflected = await reflectiveAgent.selfReflect(data, result);
      expect(reflected).toBeDefined();
    });

    it('should return original result when reflection disabled', async () => {
      const data = JSON.stringify([1, 2, 3, 4, 5]);
      const result = await agent.execute(data);
      const reflected = await agent.selfReflect(data, result);
      expect(reflected).toBe(result);
    });

    it('should validate result quality in reflection', async () => {
      const reflectiveAgent = new AnalyticsAgent({
        agentName: 'analytics-reflective',
        agentDescription: 'Analytics with reflection',
        selfReflection: {
          enabled: true,
          maxAttempts: 2,
        },
      });

      const data = JSON.stringify([1, 2, 3]);
      const goodResult = 'Mean: 2\nMedian: 2\nInsights: Data shows...\nRecommendations: Consider...';
      const reflected = await reflectiveAgent.selfReflect(data, goodResult);
      expect(reflected).toBeDefined();
    });

    it('should detect insufficient analysis in reflection', async () => {
      const reflectiveAgent = new AnalyticsAgent({
        agentName: 'analytics-reflective',
        agentDescription: 'Analytics with reflection',
        selfReflection: {
          enabled: true,
          maxAttempts: 2,
        },
      });

      const data = JSON.stringify([1, 2, 3]);
      const poorResult = 'Mean: 2';
      const reflected = await reflectiveAgent.selfReflect(data, poorResult);
      expect(reflected).toContain('Self-Reflection') || reflected !== poorResult;
    });
  });

  // ===== Error Handling =====
  describe('Error Handling', () => {
    it('should handle empty array', async () => {
      const emptyData = JSON.stringify([]);
      await expect(agent.execute(emptyData)).rejects.toThrow();
    });

    it('should handle null values in data', async () => {
      const nullData = JSON.stringify([1, 2, null, 4, 5]);
      const result = await agent.execute(nullData);
      expect(result).toBeDefined(); // Should filter out nulls
    });

    it('should handle undefined values', async () => {
      const data = JSON.stringify([1, 2, undefined, 4, 5]);
      const result = await agent.execute(data);
      expect(result).toBeDefined();
    });

    it('should handle mixed numeric types', async () => {
      const mixedData = JSON.stringify([1, 2.5, 3, 4.7, 5]);
      const result = await agent.execute(mixedData);
      expect(result).toContain('Mean');
    });

    it('should reject non-numeric string data', async () => {
      const stringData = JSON.stringify(['one', 'two', 'three']);
      await expect(agent.execute(stringData)).rejects.toThrow();
    });

    it('should handle very large datasets efficiently', async () => {
      const largeData = JSON.stringify(Array.from({ length: 10000 }, (_, i) => i));
      const result = await agent.execute(largeData);
      expect(result).toBeDefined();
      expect(result).toContain('Mean');
    });

    it('should handle edge case: all zeros', async () => {
      const zeros = JSON.stringify([0, 0, 0, 0, 0]);
      const result = await agent.execute(zeros);
      expect(result).toContain('Mean: 0');
    });

    it('should handle negative numbers', async () => {
      const negativeData = JSON.stringify([-5, -3, -1, 1, 3, 5]);
      const result = await agent.execute(negativeData);
      expect(result).toContain('Mean: 0');
    });
  });

  // ===== Configuration Options =====
  describe('Configuration Options', () => {
    it('should accept custom LLM configuration', () => {
      const customAgent = new AnalyticsAgent({
        agentName: 'custom-analytics',
        agentDescription: 'Custom analytics agent',
        llm: 'ollama:llama3',
        temperature: 0.5,
        maxTokens: 4096,
      });

      const config = customAgent.getConfig();
      expect(config.llm).toBe('ollama:llama3');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(4096);
    });

    it('should accept self-reflection configuration', () => {
      const reflectiveAgent = new AnalyticsAgent({
        agentName: 'reflective-analytics',
        agentDescription: 'Reflective analytics',
        selfReflection: {
          enabled: true,
          maxAttempts: 3,
        },
      });

      const config = reflectiveAgent.getConfig();
      expect(config.selfReflection.enabled).toBe(true);
      expect(config.selfReflection.maxAttempts).toBe(3);
    });

    it('should allow configuring analysis depth', () => {
      const deepAgent = new AnalyticsAgent({
        agentName: 'deep-analytics',
        agentDescription: 'Deep analysis',
        analysisDepth: 'detailed',
      });

      const config = deepAgent.getConfig();
      expect(config.analysisDepth).toBe('detailed');
    });

    it('should support timeout configuration', () => {
      const timeoutAgent = new AnalyticsAgent({
        agentName: 'timeout-analytics',
        agentDescription: 'With timeout',
        timeout: 60000,
      });

      const config = timeoutAgent.getConfig();
      expect(config.timeout).toBe(60000);
    });
  });

  // ===== Visualization Support (Optional) =====
  describe('Visualization Support', () => {
    it('should provide data suitable for visualization', async () => {
      const data = JSON.stringify([10, 20, 30, 40, 50]);
      const result = await agent.execute(data, { includeVisualizationData: true });
      expect(result).toBeDefined();
    });

    it('should generate histogram data when requested', async () => {
      const data = JSON.stringify([1, 2, 2, 3, 3, 3, 4, 4, 5]);
      const result = await agent.execute(data, { visualization: 'histogram' });
      expect(result).toBeDefined();
    });
  });
});
