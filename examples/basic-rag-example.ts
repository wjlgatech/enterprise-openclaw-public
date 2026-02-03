/**
 * Basic RAG Example
 * Demonstrates RAG query with knowledge graph
 */

import { KnowledgeGraph, BasicRAG } from '../extensions/knowledge-system/index.js';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== Basic RAG Example ===\n');

  // Setup database path
  const dbPath = path.join(process.cwd(), 'data', 'rag-example-' + Date.now());

  try {
    // 1. Initialize Knowledge Graph
    console.log('1. Initializing Knowledge Graph...');
    const graph = new KnowledgeGraph(dbPath);
    await graph.initialize();
    console.log('   ✓ Knowledge graph initialized\n');

    // 2. Populate graph with sample documents
    console.log('2. Adding documents to knowledge graph...');

    const documents = [
      {
        id: 'ai-intro',
        content: 'Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction. AI systems can perform tasks that typically require human intelligence.',
        metadata: { category: 'AI', source: 'encyclopedia', difficulty: 'beginner' }
      },
      {
        id: 'ml-basics',
        content: 'Machine Learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. ML algorithms build mathematical models based on sample data, known as training data, to make predictions or decisions.',
        metadata: { category: 'ML', source: 'encyclopedia', difficulty: 'intermediate' }
      },
      {
        id: 'dl-networks',
        content: 'Deep Learning uses artificial neural networks with multiple layers (hence "deep") to progressively extract higher-level features from raw input. For example, in image processing, lower layers may identify edges, while higher layers identify human-relevant concepts like digits or faces.',
        metadata: { category: 'DL', source: 'encyclopedia', difficulty: 'advanced' }
      },
      {
        id: 'nlp-overview',
        content: 'Natural Language Processing (NLP) is a branch of AI that helps computers understand, interpret, and manipulate human language. NLP draws from many disciplines, including computer science and computational linguistics.',
        metadata: { category: 'NLP', source: 'encyclopedia', difficulty: 'intermediate' }
      },
      {
        id: 'cv-intro',
        content: 'Computer Vision is a field of AI that trains computers to interpret and understand the visual world. Using digital images from cameras and videos and deep learning models, machines can accurately identify and classify objects.',
        metadata: { category: 'CV', source: 'encyclopedia', difficulty: 'intermediate' }
      }
    ];

    // Generate embeddings and add nodes
    for (const doc of documents) {
      // Generate embedding (simple hash-based for demo)
      const hash = doc.content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);

      await graph.addNode({
        id: doc.id,
        content: doc.content,
        embedding,
        type: 'document',
        metadata: doc.metadata
      });
    }

    console.log(`   ✓ Added ${documents.length} documents\n`);

    // 3. Create Basic RAG System
    console.log('3. Initializing Basic RAG system...');
    const rag = new BasicRAG({
      knowledgeGraph: graph,
      topK: 3,
      similarityThreshold: 0.6,
      contextWindow: 1500,
      llmModel: 'ollama:phi4'
    });

    const config = rag.getConfig();
    console.log('   Configuration:');
    console.log(`   - Top-K: ${config.topK}`);
    console.log(`   - Similarity Threshold: ${config.similarityThreshold}`);
    console.log(`   - Context Window: ${config.contextWindow} chars`);
    console.log(`   - LLM Model: ${config.llmModel}`);
    console.log('   ✓ RAG system initialized\n');

    // 4. Perform RAG queries
    console.log('4. Performing RAG queries...\n');

    const queries = [
      'What is artificial intelligence?',
      'Explain machine learning',
      'How does deep learning work?',
      'What are the applications of NLP?'
    ];

    for (const query of queries) {
      console.log(`Query: "${query}"`);
      console.log('─'.repeat(80));

      const startTime = Date.now();
      const answer = await rag.query(query);
      const queryTime = Date.now() - startTime;

      // Truncate answer for display
      const displayAnswer = answer.length > 300
        ? answer.substring(0, 300) + '...'
        : answer;

      console.log(`Answer:\n${displayAnswer}`);
      console.log(`\nQuery Time: ${queryTime}ms`);
      console.log('='.repeat(80));
      console.log('');
    }

    // 5. Show performance metrics
    console.log('5. Performance Metrics:');
    console.log('─'.repeat(80));

    const metrics = rag.getRetrievalMetrics();
    console.log(`Total Queries: ${metrics.totalQueries}`);
    console.log(`Average Retrieval Time: ${metrics.averageRetrievalTime.toFixed(2)}ms`);
    console.log(`Average Nodes Retrieved: ${metrics.averageNodesRetrieved.toFixed(2)}`);
    console.log('');

    // 6. Demonstrate configuration updates
    console.log('6. Updating configuration...');
    rag.updateConfig({
      topK: 5,
      similarityThreshold: 0.5
    });

    const newConfig = rag.getConfig();
    console.log(`   New Top-K: ${newConfig.topK}`);
    console.log(`   New Threshold: ${newConfig.similarityThreshold}`);
    console.log('   ✓ Configuration updated\n');

    // 7. Query with new configuration
    console.log('7. Query with updated configuration:');
    console.log('─'.repeat(80));

    const finalQuery = 'Tell me about computer vision';
    console.log(`Query: "${finalQuery}"`);

    const finalAnswer = await rag.query(finalQuery);
    const displayFinalAnswer = finalAnswer.length > 300
      ? finalAnswer.substring(0, 300) + '...'
      : finalAnswer;

    console.log(`Answer:\n${displayFinalAnswer}`);
    console.log('='.repeat(80));
    console.log('');

    // 8. Show final metrics
    console.log('8. Final Performance Metrics:');
    console.log('─'.repeat(80));

    const finalMetrics = rag.getRetrievalMetrics();
    console.log(`Total Queries: ${finalMetrics.totalQueries}`);
    console.log(`Average Retrieval Time: ${finalMetrics.averageRetrievalTime.toFixed(2)}ms`);
    console.log(`Average Nodes Retrieved: ${finalMetrics.averageNodesRetrieved.toFixed(2)}`);
    console.log('');

    // 9. Cleanup
    console.log('9. Cleaning up...');
    await graph.close();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
    console.log('   ✓ Cleanup complete\n');

    console.log('=== Example Complete ===');

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);

    // Cleanup on error
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
  }
}

// Run example
main().catch(console.error);
