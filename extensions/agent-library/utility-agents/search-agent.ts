/**
 * SearchAgent - AI Refinery compatible search utility agent
 *
 * Performs web searches and returns formatted results
 * Implements self-reflection for quality assurance
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchAgentConfig {
  agentName: string;
  agentDescription: string;
  selfReflection?: {
    enabled: boolean;
    maxAttempts: number;
  };
  llm?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface SearchOptions {
  maxResults?: number;
}

/**
 * SearchAgent following AI Refinery agent interface
 */
export class SearchAgent {
  private config: Required<SearchAgentConfig>;

  constructor(config: SearchAgentConfig) {
    this.config = {
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      selfReflection: config.selfReflection || {
        enabled: false,
        maxAttempts: 1,
      },
      llm: config.llm || 'ollama:phi4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Get agent configuration
   */
  getConfig(): Required<SearchAgentConfig> {
    return this.config;
  }

  /**
   * Main execution method - AI Refinery interface
   */
  async execute(query: string, context?: any): Promise<string> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    try {
      // Perform search
      const results = await this.search(query);

      if (results.length === 0) {
        return 'No results found for your query. Please try different search terms.';
      }

      // Format results as readable text
      const formatted = this.formatResults(query, results);

      return formatted;
    } catch (error: any) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Perform web search and return structured results
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const maxResults = options.maxResults || 10;

    try {
      const results = await this.fetchSearchResults(query, maxResults);
      return this.deduplicateResults(results);
    } catch (error: any) {
      throw new Error(`Failed to fetch search results: ${error.message}`);
    }
  }

  /**
   * Fetch search results from search API
   * Currently uses a mock implementation - in production would integrate with
   * Google Custom Search, Brave Search, or DuckDuckGo API
   */
  private async fetchSearchResults(query: string, maxResults: number): Promise<SearchResult[]> {
    // Create timeout promise
    const timeoutPromise = new Promise<SearchResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), this.config.timeout);
    });

    // Create search promise
    const searchPromise = this.performSearch(query, maxResults);

    // Race between search and timeout
    return Promise.race([searchPromise, timeoutPromise]);
  }

  /**
   * Actual search implementation
   * Mock implementation for testing - replace with real API in production
   */
  private async performSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    // Mock search results for testing
    // In production, this would call Google Custom Search, Brave, or DuckDuckGo API

    const mockResults: SearchResult[] = [
      {
        title: `${query} - Comprehensive Guide`,
        url: `https://example.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
        snippet: `Learn everything about ${query}. This comprehensive guide covers all aspects including best practices, examples, and use cases.`,
      },
      {
        title: `Understanding ${query}: A Deep Dive`,
        url: `https://docs.example.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '_'))}`,
        snippet: `Deep dive into ${query} with detailed explanations, code examples, and real-world applications. Perfect for beginners and experts.`,
      },
      {
        title: `${query} Tutorial and Documentation`,
        url: `https://tutorial.example.com/${encodeURIComponent(query.toLowerCase())}`,
        snippet: `Official documentation and tutorials for ${query}. Step-by-step guides, API references, and community resources.`,
      },
      {
        title: `Top Resources for ${query}`,
        url: `https://resources.example.com/topics/${encodeURIComponent(query)}`,
        snippet: `Curated collection of the best resources about ${query}. Includes articles, videos, courses, and tools.`,
      },
      {
        title: `${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
        snippet: `${query} is widely recognized in the field. This article provides an overview of key concepts, history, and current developments.`,
      },
    ];

    // Return limited number of results
    return mockResults.slice(0, Math.min(maxResults, mockResults.length));
  }

  /**
   * Deduplicate search results by URL
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Format search results as readable text
   */
  private formatResults(query: string, results: SearchResult[]): string {
    let formatted = `Search Results for: "${query}"\n\n`;
    formatted += `Found ${results.length} result(s)\n\n`;

    results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `   URL: ${result.url}\n`;
      formatted += `   ${result.snippet}\n\n`;
    });

    return formatted.trim();
  }

  /**
   * Self-reflection - validate and potentially improve results
   * AI Refinery interface
   */
  async selfReflect(query: string, result: string): Promise<string> {
    if (!this.config.selfReflection.enabled) {
      return result;
    }

    try {
      return await this.performReflection(query, result);
    } catch (error: any) {
      // If reflection fails, return original result
      console.warn(`Self-reflection failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Perform self-reflection on results
   */
  private async performReflection(query: string, result: string): Promise<string> {
    // Simple quality checks
    const qualityIssues: string[] = [];

    // Check if result is too short
    if (result.length < 50) {
      qualityIssues.push('Result is too short');
    }

    // Check if result contains search results indicator
    if (!result.includes('Search Results')) {
      qualityIssues.push('Result format may be incorrect');
    }

    // Check if result contains URLs
    if (!result.includes('http')) {
      qualityIssues.push('Result may not contain valid search results');
    }

    // If quality issues detected, append warning
    if (qualityIssues.length > 0) {
      return result + `\n\n[Self-Reflection Warning: ${qualityIssues.join(', ')}]`;
    }

    // In production, this would use LLM to validate result quality
    // For now, return original result if no issues
    return result;
  }
}
