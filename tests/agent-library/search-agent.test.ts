/**
 * Tests for SearchAgent
 * Following Reality-Grounded TDD - tests written FIRST
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchAgent } from '../../extensions/agent-library/utility-agents/search-agent';
import type { SearchResult } from '../../extensions/agent-library/utility-agents/search-agent';

describe('SearchAgent', () => {
  let agent: SearchAgent;

  beforeEach(() => {
    agent = new SearchAgent({
      agentName: 'test_search',
      agentDescription: 'Test search agent',
      selfReflection: {
        enabled: true,
        maxAttempts: 2,
      },
    });
  });

  describe('Agent Interface', () => {
    it('should follow AI Refinery agent interface', () => {
      expect(agent).toHaveProperty('execute');
      expect(agent).toHaveProperty('selfReflect');
      expect(agent).toHaveProperty('getConfig');
      expect(typeof agent.execute).toBe('function');
      expect(typeof agent.selfReflect).toBe('function');
    });

    it('should have correct agent metadata', () => {
      const config = agent.getConfig();
      expect(config.agentName).toBe('test_search');
      expect(config.agentDescription).toBe('Test search agent');
      expect(config.selfReflection?.enabled).toBe(true);
    });
  });

  describe('Search Execution', () => {
    it('should perform basic web search', async () => {
      const query = 'TypeScript best practices';
      const result = await agent.execute(query);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return structured search results', async () => {
      const query = 'AI research papers';
      const results = await agent.search(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check first result structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('url');
      expect(firstResult).toHaveProperty('snippet');
      expect(typeof firstResult.title).toBe('string');
      expect(typeof firstResult.url).toBe('string');
      expect(typeof firstResult.snippet).toBe('string');
    });

    it('should limit number of results', async () => {
      const query = 'machine learning';
      const results = await agent.search(query, { maxResults: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should format results as readable text', async () => {
      const query = 'climate change';
      const result = await agent.execute(query);

      // Should contain formatted information
      expect(result).toMatch(/Search Results/i);
      expect(result).toContain('http');
    });

    it('should handle empty query gracefully', async () => {
      await expect(agent.execute('')).rejects.toThrow('Query cannot be empty');
    });

    it('should handle queries with special characters', async () => {
      const query = 'C++ programming & templates';
      const result = await agent.execute(query);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Self-Reflection', () => {
    it('should perform self-reflection when enabled', async () => {
      const query = 'quantum computing';
      const initialResult = 'Initial search result with potential issues';

      const reflected = await agent.selfReflect(query, initialResult);

      expect(reflected).toBeDefined();
      expect(typeof reflected).toBe('string');
      // Self-reflection should modify or validate the result
    });

    it('should validate result quality in self-reflection', async () => {
      const query = 'AI ethics';
      const poorResult = 'Not very helpful result';

      const reflected = await agent.selfReflect(query, poorResult);

      // Should either improve the result or indicate quality issues
      expect(reflected).toBeDefined();
    });

    it('should skip self-reflection when disabled', async () => {
      const noReflectionAgent = new SearchAgent({
        agentName: 'no_reflection',
        agentDescription: 'Agent without self-reflection',
        selfReflection: {
          enabled: false,
          maxAttempts: 1,
        },
      });

      const result = 'Some result';
      const reflected = await noReflectionAgent.selfReflect('query', result);

      // Should return original result when disabled
      expect(reflected).toBe(result);
    });

    it('should respect max_attempts limit', async () => {
      const agent = new SearchAgent({
        agentName: 'limited',
        agentDescription: 'Agent with limited attempts',
        selfReflection: {
          enabled: true,
          maxAttempts: 1,
        },
      });

      const reflectSpy = vi.spyOn(agent as any, 'performReflection');

      await agent.execute('test query');

      // Should not exceed max attempts
      expect(reflectSpy).toHaveBeenCalledTimes(0); // execute doesn't auto-reflect
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      const mockAgent = new SearchAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
      });

      vi.spyOn(mockAgent as any, 'fetchSearchResults').mockRejectedValue(
        new Error('Network error')
      );

      await expect(mockAgent.execute('test')).rejects.toThrow('Search failed');
    });

    it('should handle API errors with helpful messages', async () => {
      const mockAgent = new SearchAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
      });

      vi.spyOn(mockAgent as any, 'fetchSearchResults').mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      try {
        await mockAgent.execute('test');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Search failed');
      }
    });

    it('should handle empty search results', async () => {
      const mockAgent = new SearchAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
      });

      vi.spyOn(mockAgent as any, 'fetchSearchResults').mockResolvedValue([]);

      const result = await mockAgent.execute('obscure query xyz123');

      expect(result).toContain('No results found');
    });

    it('should timeout on slow requests', async () => {
      const mockAgent = new SearchAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
        timeout: 100,
      });

      vi.spyOn(mockAgent as any, 'fetchSearchResults').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      await expect(mockAgent.execute('test')).rejects.toThrow();
    }, 10000);
  });

  describe('Configuration', () => {
    it('should support custom configuration', () => {
      const customAgent = new SearchAgent({
        agentName: 'custom',
        agentDescription: 'Custom agent',
        llm: 'ollama:phi4',
        temperature: 0.7,
        maxTokens: 2048,
      });

      const config = customAgent.getConfig();
      expect(config.llm).toBe('ollama:phi4');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2048);
    });

    it('should use default values when not specified', () => {
      const defaultAgent = new SearchAgent({
        agentName: 'default',
        agentDescription: 'Default agent',
      });

      const config = defaultAgent.getConfig();
      expect(config.selfReflection?.enabled).toBe(false);
      expect(config.selfReflection?.maxAttempts).toBe(1);
    });
  });

  describe('Integration with DistillerOrchestrator', () => {
    it('should work as executor function', async () => {
      const executorFn = (query: string) => agent.execute(query);

      const result = await executorFn('test query');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should accept context parameter', async () => {
      const context = {
        userPreferences: { language: 'en' },
        previousResults: [],
      };

      const result = await agent.execute('test', context);

      expect(result).toBeDefined();
    });

    it('should maintain consistent interface across calls', async () => {
      const result1 = await agent.execute('first query');
      const result2 = await agent.execute('second query');

      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(result1).not.toBe(result2); // Different queries should have different results
    });
  });

  describe('Result Quality', () => {
    it('should return relevant results for query', async () => {
      const query = 'Node.js documentation';
      const results = await agent.search(query);

      // Results should be related to the query
      const relevantResults = results.filter(
        (r) =>
          r.title.toLowerCase().includes('node') ||
          r.snippet.toLowerCase().includes('node')
      );

      expect(relevantResults.length).toBeGreaterThan(0);
    });

    it('should deduplicate similar results', async () => {
      const query = 'JavaScript';
      const results = await agent.search(query);

      // Check for unique URLs
      const urls = results.map((r) => r.url);
      const uniqueUrls = new Set(urls);

      expect(uniqueUrls.size).toBe(urls.length);
    });
  });
});
