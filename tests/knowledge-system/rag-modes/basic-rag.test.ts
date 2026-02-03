/**
 * Basic RAG Query Mode Tests
 * Reality-Grounded TDD - Tests written FIRST (RED phase)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BasicRAG } from '../../../extensions/knowledge-system/rag-modes/basic-rag.js';
import { KnowledgeGraph } from '../../../extensions/knowledge-system/knowledge-graph.js';
import { GraphNode } from '../../../extensions/knowledge-system/types.js';
import * as fs from 'fs';
import * as path from 'path';

describe('BasicRAG - Reality-Grounded TDD', () => {
  let knowledgeGraph: KnowledgeGraph;
  let basicRAG: BasicRAG;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test database path
    testDbPath = path.join(process.cwd(), 'data', 'test-rag-' + Date.now());
    knowledgeGraph = new KnowledgeGraph(testDbPath);
    await knowledgeGraph.initialize();
  });

  afterEach(async () => {
    // Cleanup test database
    await knowledgeGraph.close();
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize BasicRAG with knowledge graph', async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });

      expect(basicRAG).toBeDefined();
      expect(basicRAG).toBeInstanceOf(BasicRAG);
    });

    it('should use default configuration values', async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });

      const config = basicRAG.getConfig();
      expect(config.topK).toBe(5);
      expect(config.similarityThreshold).toBe(0.7);
      expect(config.contextWindow).toBe(2000);
      expect(config.llmModel).toBe('ollama:phi4');
    });

    it('should accept custom configuration', async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph,
        topK: 10,
        similarityThreshold: 0.8,
        contextWindow: 3000,
        llmModel: 'ollama:qwen3'
      });

      const config = basicRAG.getConfig();
      expect(config.topK).toBe(10);
      expect(config.similarityThreshold).toBe(0.8);
      expect(config.contextWindow).toBe(3000);
      expect(config.llmModel).toBe('ollama:qwen3');
    });

    it('should validate configuration values', async () => {
      expect(() => new BasicRAG({
        knowledgeGraph,
        topK: -1
      })).toThrow('topK must be positive');

      expect(() => new BasicRAG({
        knowledgeGraph,
        similarityThreshold: 1.5
      })).toThrow('similarityThreshold must be between 0 and 1');

      expect(() => new BasicRAG({
        knowledgeGraph,
        contextWindow: -100
      })).toThrow('contextWindow must be positive');
    });

    it('should throw error if knowledge graph is not initialized', async () => {
      const uninitGraph = new KnowledgeGraph(testDbPath + '-uninit');

      expect(() => new BasicRAG({
        knowledgeGraph: uninitGraph
      })).toThrow('KnowledgeGraph must be initialized');
    });
  });

  describe('Embedding Generation', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });
    });

    it('should generate embeddings for text queries', async () => {
      const embedding = await basicRAG.generateEmbedding('What is artificial intelligence?');

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    it('should generate consistent embeddings for same text', async () => {
      const text = 'Test query';
      const embedding1 = await basicRAG.generateEmbedding(text);
      const embedding2 = await basicRAG.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('should generate different embeddings for different text', async () => {
      const embedding1 = await basicRAG.generateEmbedding('Query A');
      const embedding2 = await basicRAG.generateEmbedding('Query B');

      expect(embedding1).not.toEqual(embedding2);
    });

    it('should handle empty string queries', async () => {
      const embedding = await basicRAG.generateEmbedding('');

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
    });

    it('should handle long text queries', async () => {
      const longText = 'word '.repeat(1000);
      const embedding = await basicRAG.generateEmbedding(longText);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
    });

    it('should normalize embedding vectors', async () => {
      const embedding = await basicRAG.generateEmbedding('Test');

      // Check that embedding values are reasonable
      expect(embedding.every(v => v >= -1 && v <= 1)).toBe(true);
    });
  });

  describe('Vector Similarity Search', () => {
    beforeEach(async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph,
        topK: 3,
        similarityThreshold: 0.5
      });

      // Add test nodes with embeddings
      const createEmbedding = (seed: number): number[] => {
        return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
      };

      await knowledgeGraph.addNode({
        id: 'doc1',
        content: 'Artificial Intelligence is the simulation of human intelligence by machines.',
        embedding: createEmbedding(1),
        type: 'document'
      });

      await knowledgeGraph.addNode({
        id: 'doc2',
        content: 'Machine Learning is a subset of AI that enables systems to learn from data.',
        embedding: createEmbedding(1.1),
        type: 'document'
      });

      await knowledgeGraph.addNode({
        id: 'doc3',
        content: 'The weather today is sunny and warm.',
        embedding: createEmbedding(100),
        type: 'document'
      });
    });

    it('should find relevant nodes using vector search', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1.05 + i) * 0.5);

      const results = await basicRAG.findRelevantNodes(queryEmbedding);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return top-K most similar nodes', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1 + i) * 0.5);

      const results = await basicRAG.findRelevantNodes(queryEmbedding);

      expect(results.length).toBeLessThanOrEqual(3); // topK = 3
    });

    it('should filter results by similarity threshold', async () => {
      const highThresholdRAG = new BasicRAG({
        knowledgeGraph,
        topK: 10,
        similarityThreshold: 0.95 // Very high threshold
      });

      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(50 + i) * 0.5);

      const results = await highThresholdRAG.findRelevantNodes(queryEmbedding);

      // With high threshold and dissimilar query, should return few or no results
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return nodes with similarity scores', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1 + i) * 0.5);

      const results = await basicRAG.findRelevantNodes(queryEmbedding);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.node).toBeDefined();
        expect(result.score).toBeDefined();
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should return results ordered by similarity score', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1 + i) * 0.5);

      const results = await basicRAG.findRelevantNodes(queryEmbedding);

      // Check that scores are in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle empty knowledge graph', async () => {
      const emptyGraph = new KnowledgeGraph(testDbPath + '-empty');
      await emptyGraph.initialize();

      const emptyRAG = new BasicRAG({
        knowledgeGraph: emptyGraph
      });

      const queryEmbedding = Array.from({ length: 384 }, () => 0.5);
      const results = await emptyRAG.findRelevantNodes(queryEmbedding);

      expect(results).toEqual([]);

      await emptyGraph.close();
    });
  });

  describe('Context Assembly', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph,
        contextWindow: 200
      });
    });

    it('should assemble context from retrieved nodes', async () => {
      const nodes: GraphNode[] = [
        {
          id: 'doc1',
          content: 'First document content.'
        },
        {
          id: 'doc2',
          content: 'Second document content.'
        }
      ];

      const context = basicRAG.assembleContext(nodes);

      expect(context).toContain('First document content');
      expect(context).toContain('Second document content');
    });

    it('should respect context window limit', async () => {
      const longContent = 'x'.repeat(150);
      const nodes: GraphNode[] = [
        { id: 'doc1', content: longContent },
        { id: 'doc2', content: longContent },
        { id: 'doc3', content: longContent }
      ];

      const context = basicRAG.assembleContext(nodes);

      expect(context.length).toBeLessThanOrEqual(200);
    });

    it('should prioritize earlier nodes when truncating', async () => {
      const nodes: GraphNode[] = [
        { id: 'doc1', content: 'Important first.' },
        { id: 'doc2', content: 'x'.repeat(200) },
        { id: 'doc3', content: 'Should be cut off.' }
      ];

      const context = basicRAG.assembleContext(nodes);

      expect(context).toContain('Important first');
      expect(context).not.toContain('Should be cut off');
    });

    it('should handle empty node list', async () => {
      const context = basicRAG.assembleContext([]);

      expect(context).toBe('');
    });

    it('should separate node contents with newlines', async () => {
      const nodes: GraphNode[] = [
        { id: 'doc1', content: 'First' },
        { id: 'doc2', content: 'Second' }
      ];

      const context = basicRAG.assembleContext(nodes);

      expect(context).toBe('First\n\nSecond');
    });

    it('should include node metadata in context if configured', async () => {
      const nodes: GraphNode[] = [
        {
          id: 'doc1',
          content: 'Content',
          metadata: { source: 'test.txt', author: 'John' }
        }
      ];

      const ragWithMetadata = new BasicRAG({
        knowledgeGraph,
        includeMetadata: true
      });

      const context = ragWithMetadata.assembleContext(nodes);

      expect(context).toContain('Content');
      // Metadata should be included in some format
      expect(context.length).toBeGreaterThan('Content'.length);
    });
  });

  describe('Response Generation', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });
    });

    it('should generate response from query and context', async () => {
      const query = 'What is AI?';
      const context = 'Artificial Intelligence is the simulation of human intelligence.';

      const response = await basicRAG.generateResponse(query, context);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should include context in response generation', async () => {
      const query = 'Test query';
      const context = 'Important context information';

      const response = await basicRAG.generateResponse(query, context);

      // Response should be based on context
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle empty context', async () => {
      const query = 'What is AI?';
      const context = '';

      const response = await basicRAG.generateResponse(query, context);

      expect(response).toBeDefined();
      expect(response).toContain('no relevant information');
    });

    it('should handle long context', async () => {
      const query = 'Summarize this';
      const context = 'word '.repeat(1000);

      const response = await basicRAG.generateResponse(query, context);

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should use configured LLM model', async () => {
      const customRAG = new BasicRAG({
        knowledgeGraph,
        llmModel: 'ollama:qwen3'
      });

      const config = customRAG.getConfig();
      expect(config.llmModel).toBe('ollama:qwen3');
    });
  });

  describe('Full RAG Pipeline - query()', () => {
    beforeEach(async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph,
        topK: 3,
        similarityThreshold: 0.5
      });

      // Populate knowledge graph with test data
      const createEmbedding = (seed: number): number[] => {
        return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
      };

      await knowledgeGraph.addNode({
        id: 'ai-doc',
        content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems.',
        embedding: createEmbedding(1),
        type: 'document'
      });

      await knowledgeGraph.addNode({
        id: 'ml-doc',
        content: 'Machine Learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed.',
        embedding: createEmbedding(1.2),
        type: 'document'
      });

      await knowledgeGraph.addNode({
        id: 'dl-doc',
        content: 'Deep Learning uses neural networks with multiple layers to progressively extract higher-level features from raw input.',
        embedding: createEmbedding(1.4),
        type: 'document'
      });
    });

    it('should execute full RAG pipeline successfully', async () => {
      const answer = await basicRAG.query('What is artificial intelligence?');

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
      expect(answer.length).toBeGreaterThan(0);
    });

    it('should retrieve relevant nodes for query', async () => {
      const answer = await basicRAG.query('Explain machine learning');

      expect(answer).toBeDefined();
      // Answer should be based on retrieved context
      expect(answer.length).toBeGreaterThan(0);
    });

    it('should handle queries with no relevant results', async () => {
      const answer = await basicRAG.query('What is the capital of France?');

      expect(answer).toBeDefined();
      expect(answer).toContain('no relevant information');
    });

    it('should maintain query context in response', async () => {
      const query = 'What is deep learning?';
      const answer = await basicRAG.query(query);

      expect(answer).toBeDefined();
      expect(answer.length).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent queries', async () => {
      const queries = [
        'What is AI?',
        'Explain machine learning',
        'What is deep learning?'
      ];

      const promises = queries.map(q => basicRAG.query(q));
      const answers = await Promise.all(promises);

      expect(answers).toHaveLength(3);
      answers.forEach(answer => {
        expect(answer).toBeDefined();
        expect(typeof answer).toBe('string');
      });
    });

    it('should track retrieval metrics', async () => {
      await basicRAG.query('What is AI?');

      const metrics = basicRAG.getRetrievalMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.averageRetrievalTime).toBeGreaterThan(0);
      expect(metrics.averageNodesRetrieved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });

      const createEmbedding = (seed: number): number[] => {
        return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
      };

      await knowledgeGraph.addNode({
        id: 'test1',
        content: 'Test content 1',
        embedding: createEmbedding(1)
      });
    });

    it('should track total number of queries', async () => {
      await basicRAG.query('Query 1');
      await basicRAG.query('Query 2');
      await basicRAG.query('Query 3');

      const metrics = basicRAG.getRetrievalMetrics();
      expect(metrics.totalQueries).toBe(3);
    });

    it('should track average retrieval time', async () => {
      await basicRAG.query('Test query');

      const metrics = basicRAG.getRetrievalMetrics();
      expect(metrics.averageRetrievalTime).toBeGreaterThan(0);
      expect(typeof metrics.averageRetrievalTime).toBe('number');
    });

    it('should track average nodes retrieved', async () => {
      await basicRAG.query('Test query');

      const metrics = basicRAG.getRetrievalMetrics();
      expect(metrics.averageNodesRetrieved).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.averageNodesRetrieved).toBe('number');
    });

    it('should track cache hit rate if caching enabled', async () => {
      const metrics = basicRAG.getRetrievalMetrics();

      // Cache hit rate should be a number between 0 and 1
      if (metrics.cacheHitRate !== undefined) {
        expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
      }
    });

    it('should reset metrics when requested', async () => {
      await basicRAG.query('Test');

      basicRAG.resetMetrics();

      const metrics = basicRAG.getRetrievalMetrics();
      expect(metrics.totalQueries).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });
    });

    it('should handle invalid query input', async () => {
      await expect(basicRAG.query(null as any)).rejects.toThrow('Query must be a string');
      await expect(basicRAG.query(undefined as any)).rejects.toThrow('Query must be a string');
    });

    it('should handle empty query string', async () => {
      const answer = await basicRAG.query('');

      expect(answer).toBeDefined();
      expect(answer).toContain('no query provided');
    });

    it('should handle very long queries', async () => {
      const longQuery = 'word '.repeat(10000);

      const answer = await basicRAG.query(longQuery);

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
    });

    it('should handle special characters in queries', async () => {
      const specialQuery = 'What is @#$%^&*() in AI?';

      const answer = await basicRAG.query(specialQuery);

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
    });

    it('should provide meaningful error messages', async () => {
      try {
        await basicRAG.generateResponse(null as any, 'context');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle database connection errors', async () => {
      await knowledgeGraph.close();

      // Attempting to query after closing should fail gracefully
      await expect(basicRAG.query('Test')).rejects.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });
    });

    it('should allow updating topK configuration', () => {
      basicRAG.updateConfig({ topK: 10 });

      const config = basicRAG.getConfig();
      expect(config.topK).toBe(10);
    });

    it('should allow updating similarity threshold', () => {
      basicRAG.updateConfig({ similarityThreshold: 0.9 });

      const config = basicRAG.getConfig();
      expect(config.similarityThreshold).toBe(0.9);
    });

    it('should allow updating context window', () => {
      basicRAG.updateConfig({ contextWindow: 5000 });

      const config = basicRAG.getConfig();
      expect(config.contextWindow).toBe(5000);
    });

    it('should validate updated configuration', () => {
      expect(() => basicRAG.updateConfig({ topK: -5 }))
        .toThrow('topK must be positive');
    });

    it('should apply new configuration to subsequent queries', async () => {
      basicRAG.updateConfig({ topK: 1 });

      const config = basicRAG.getConfig();
      expect(config.topK).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      basicRAG = new BasicRAG({
        knowledgeGraph
      });
    });

    it('should handle queries with only whitespace', async () => {
      const answer = await basicRAG.query('   \n\t  ');

      expect(answer).toBeDefined();
      expect(answer).toContain('no query provided');
    });

    it('should handle nodes with empty content', async () => {
      await knowledgeGraph.addNode({
        id: 'empty',
        content: '',
        embedding: Array.from({ length: 384 }, () => 0.5)
      });

      const answer = await basicRAG.query('Test query');

      expect(answer).toBeDefined();
    });

    it('should handle nodes without embeddings', async () => {
      await knowledgeGraph.addNode({
        id: 'no-embedding',
        content: 'Content without embedding'
      });

      // Should not crash, but node won't be retrieved
      const answer = await basicRAG.query('Test query');

      expect(answer).toBeDefined();
    });

    it('should handle unicode and emoji in queries', async () => {
      const answer = await basicRAG.query('What is AI? 🤖🧠💡');

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
    });

    it('should handle queries in different languages', async () => {
      const answer = await basicRAG.query('¿Qué es inteligencia artificial?');

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
    });
  });

  describe('Integration with Knowledge Graph', () => {
    beforeEach(async () => {
      basicRAG = new BasicRAG({
        knowledgeGraph,
        topK: 5
      });

      // Create a richer knowledge graph
      const createEmbedding = (seed: number): number[] => {
        return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
      };

      for (let i = 0; i < 10; i++) {
        await knowledgeGraph.addNode({
          id: `node-${i}`,
          content: `Document ${i} about AI and technology`,
          embedding: createEmbedding(i),
          type: 'document',
          metadata: { index: i }
        });
      }
    });

    it('should retrieve from large knowledge graph', async () => {
      const answer = await basicRAG.query('Tell me about AI');

      expect(answer).toBeDefined();
      expect(typeof answer).toBe('string');
    });

    it('should respect graph-level filtering', async () => {
      const nodes = await knowledgeGraph.queryNodes({ type: 'document' });
      expect(nodes.length).toBe(10);

      const answer = await basicRAG.query('AI query');
      expect(answer).toBeDefined();
    });

    it('should handle graph updates during RAG operations', async () => {
      // Start a query
      const queryPromise = basicRAG.query('Test query');

      // Add a new node while query is processing
      await knowledgeGraph.addNode({
        id: 'new-node',
        content: 'New content',
        embedding: Array.from({ length: 384 }, () => 0.5)
      });

      const answer = await queryPromise;
      expect(answer).toBeDefined();
    });
  });
});
