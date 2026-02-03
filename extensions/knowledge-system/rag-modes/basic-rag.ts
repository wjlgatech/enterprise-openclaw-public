/**
 * Basic RAG (Retrieval-Augmented Generation) Query Mode
 * Implements vector similarity search with LLM response generation
 */

import { KnowledgeGraph } from '../knowledge-graph.js';
import { GraphNode } from '../types.js';

/**
 * Configuration options for BasicRAG
 */
export interface BasicRAGConfig {
  /** Knowledge graph instance to query */
  knowledgeGraph: KnowledgeGraph;

  /** Number of top similar nodes to retrieve (default: 5) */
  topK?: number;

  /** Minimum similarity threshold for results (default: 0.7) */
  similarityThreshold?: number;

  /** Maximum characters in assembled context (default: 2000) */
  contextWindow?: number;

  /** LLM model to use for response generation (default: 'ollama:phi4') */
  llmModel?: string;

  /** Whether to include node metadata in context (default: false) */
  includeMetadata?: boolean;
}

/**
 * Result from similarity search with score
 */
export interface SimilaritySearchResult {
  node: GraphNode;
  score: number;
}

/**
 * Performance metrics for RAG operations
 */
export interface RetrievalMetrics {
  totalQueries: number;
  averageRetrievalTime: number;
  averageNodesRetrieved: number;
  cacheHitRate?: number;
}

/**
 * BasicRAG implements a simple RAG pipeline:
 * 1. Generate query embedding
 * 2. Find similar nodes via vector search
 * 3. Filter by similarity threshold
 * 4. Assemble context from retrieved nodes
 * 5. Generate response using LLM
 */
export class BasicRAG {
  private config: Required<Omit<BasicRAGConfig, 'includeMetadata'>> & { includeMetadata: boolean };
  private metrics: {
    totalQueries: number;
    totalRetrievalTime: number;
    totalNodesRetrieved: number;
  };

  constructor(config: BasicRAGConfig) {
    // Validate configuration
    this.validateConfig(config);

    // Set default values
    this.config = {
      knowledgeGraph: config.knowledgeGraph,
      topK: config.topK ?? 5,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      contextWindow: config.contextWindow ?? 2000,
      llmModel: config.llmModel ?? 'ollama:phi4',
      includeMetadata: config.includeMetadata ?? false
    };

    // Check initialization synchronously by attempting to access the private property
    // This is a workaround for sync constructor validation
    try {
      const graphAny = config.knowledgeGraph as any;
      if (graphAny.initialized === false) {
        throw new Error('KnowledgeGraph must be initialized');
      }
    } catch (error: any) {
      if (error.message === 'KnowledgeGraph must be initialized') {
        throw error;
      }
    }

    // Initialize metrics
    this.metrics = {
      totalQueries: 0,
      totalRetrievalTime: 0,
      totalNodesRetrieved: 0
    };
  }

  /**
   * Validate configuration parameters
   */
  private async validateConfigAsync(config: BasicRAGConfig): Promise<void> {
    if (!config.knowledgeGraph) {
      throw new Error('knowledgeGraph is required');
    }

    // Check if knowledge graph is initialized
    const isInitialized = await config.knowledgeGraph.isInitialized();
    if (!isInitialized) {
      throw new Error('KnowledgeGraph must be initialized');
    }
  }

  private validateConfig(config: BasicRAGConfig): void {
    if (!config.knowledgeGraph) {
      throw new Error('knowledgeGraph is required');
    }

    if (config.topK !== undefined && config.topK <= 0) {
      throw new Error('topK must be positive');
    }

    if (config.similarityThreshold !== undefined) {
      if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
        throw new Error('similarityThreshold must be between 0 and 1');
      }
    }

    if (config.contextWindow !== undefined && config.contextWindow <= 0) {
      throw new Error('contextWindow must be positive');
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<Omit<BasicRAGConfig, 'includeMetadata'>> & { includeMetadata: boolean } {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Omit<BasicRAGConfig, 'knowledgeGraph'>>): void {
    // Validate updates
    if (updates.topK !== undefined && updates.topK <= 0) {
      throw new Error('topK must be positive');
    }

    if (updates.similarityThreshold !== undefined) {
      if (updates.similarityThreshold < 0 || updates.similarityThreshold > 1) {
        throw new Error('similarityThreshold must be between 0 and 1');
      }
    }

    if (updates.contextWindow !== undefined && updates.contextWindow <= 0) {
      throw new Error('contextWindow must be positive');
    }

    // Apply updates
    Object.assign(this.config, updates);
  }

  /**
   * Main RAG query pipeline
   */
  async query(query: string): Promise<string> {
    const startTime = Date.now();

    try {
      // Validate input
      if (query === null || query === undefined) {
        throw new Error('Query must be a string');
      }

      if (typeof query !== 'string') {
        throw new Error('Query must be a string');
      }

      // Handle empty or whitespace-only queries
      if (query.trim() === '') {
        return 'Error: Please provide a valid query as no query provided.';
      }

      // 1. Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // 2. Find similar nodes via vector search
      const similarResults = await this.findRelevantNodes(queryEmbedding);

      // 3. Filter by similarity threshold (already done in findRelevantNodes)

      // Track metrics
      this.metrics.totalQueries++;
      this.metrics.totalRetrievalTime += Date.now() - startTime;
      this.metrics.totalNodesRetrieved += similarResults.length;

      // 4. Assemble context from retrieved nodes
      const nodes = similarResults.map(r => r.node);
      const context = this.assembleContext(nodes);

      // 5. Generate response using LLM with context
      const response = await this.generateResponse(query, context);

      return response;
    } catch (error: any) {
      // Handle errors gracefully
      if (error.message?.includes('not initialized')) {
        throw new Error('Knowledge graph is not initialized');
      }
      throw error;
    }
  }

  /**
   * Generate embedding vector for text
   * Uses simple hash-based mock for testing
   * In production, integrate with OpenAI/Qwen3/transformers.js
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Simple deterministic hash-based embedding for testing
    const hash = text.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    // Generate 384-dimensional vector
    const embedding = Array.from({ length: 384 }, (_, i) => {
      // Use hash as seed for sine wave
      const value = Math.sin(hash + i) * 0.5;
      // Clamp to [-1, 1] range
      return Math.max(-1, Math.min(1, value));
    });

    return embedding;
  }

  /**
   * Find relevant nodes using vector similarity search
   */
  async findRelevantNodes(embedding: number[]): Promise<SimilaritySearchResult[]> {
    try {
      // Use knowledge graph's vector search
      const similarNodes = await this.config.knowledgeGraph.findSimilarNodes(
        embedding,
        this.config.topK
      );

      // Calculate similarity scores and filter by threshold
      const results: SimilaritySearchResult[] = [];

      for (const node of similarNodes) {
        if (!node.embedding) {
          continue;
        }

        const score = this.calculateCosineSimilarity(embedding, node.embedding);

        // Filter by threshold
        if (score >= this.config.similarityThreshold) {
          results.push({ node, score });
        }
      }

      // Sort by score (descending)
      results.sort((a, b) => b.score - a.score);

      return results;
    } catch (error: any) {
      // If graph is empty or has no nodes with embeddings
      if (error.message?.includes('No nodes found') ||
          error.message?.includes('No vectors found')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    const similarity = dotProduct / (norm1 * norm2);

    // Normalize to [0, 1] range from [-1, 1]
    const normalizedScore = (similarity + 1) / 2;

    // Clamp to [0, 1] to handle floating point precision issues
    return Math.max(0, Math.min(1, normalizedScore));
  }

  /**
   * Assemble context string from retrieved nodes
   */
  assembleContext(nodes: GraphNode[]): string {
    if (nodes.length === 0) {
      return '';
    }

    const maxChars = this.config.contextWindow;
    const contextParts: string[] = [];
    let totalLength = 0;

    for (const node of nodes) {
      let nodeText = node.content;

      // Include metadata if configured
      if (this.config.includeMetadata && node.metadata) {
        const metadataStr = Object.entries(node.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        nodeText = `[${metadataStr}]\n${nodeText}`;
      }

      // Check if adding this node would exceed context window
      const nextLength = totalLength + nodeText.length + 2; // +2 for \n\n separator

      if (nextLength > maxChars) {
        // If we haven't added any nodes yet, add at least a truncated version
        if (contextParts.length === 0) {
          const availableSpace = maxChars - 3; // -3 for "..."
          nodeText = nodeText.substring(0, availableSpace) + '...';
          contextParts.push(nodeText);
        }
        break;
      }

      contextParts.push(nodeText);
      totalLength = nextLength;
    }

    return contextParts.join('\n\n');
  }

  /**
   * Generate response using LLM with context
   * Mock implementation for testing
   * In production, integrate with Ollama/OpenAI API
   */
  async generateResponse(query: string, context: string): Promise<string> {
    // Validate inputs
    if (query === null || query === undefined) {
      throw new Error('Query must be a string');
    }

    if (context === null || context === undefined) {
      context = '';
    }

    // Handle empty context
    if (context.trim() === '') {
      return `Based on the available information, I couldn't find any relevant context to answer your query: "${query}". This might mean there is no relevant information in the knowledge base about this topic.`;
    }

    // Mock LLM response for testing
    // In production, this would call an actual LLM API
    const response = `Based on the retrieved information:

${context}

Answer: This is a generated response to the query: "${query}"

The above context provides relevant information from the knowledge base that can be used to address your question about ${query}.`;

    return response;
  }

  /**
   * Get retrieval performance metrics
   */
  getRetrievalMetrics(): RetrievalMetrics {
    const totalQueries = this.metrics.totalQueries;

    return {
      totalQueries,
      averageRetrievalTime: totalQueries > 0
        ? this.metrics.totalRetrievalTime / totalQueries
        : 0,
      averageNodesRetrieved: totalQueries > 0
        ? this.metrics.totalNodesRetrieved / totalQueries
        : 0
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      totalRetrievalTime: 0,
      totalNodesRetrieved: 0
    };
  }
}
