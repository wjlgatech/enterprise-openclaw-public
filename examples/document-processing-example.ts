/**
 * Document Processing Example
 * Demonstrates the Document Processing Pipeline with Knowledge Graph integration
 */

import { KnowledgeGraph } from '../extensions/knowledge-system/knowledge-graph.js';
import { DocumentProcessor } from '../extensions/knowledge-system/document-processor.js';
import { DocumentChunker } from '../extensions/knowledge-system/chunking.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Mock embedding generator for demonstration
 * In production, use a real embedding model (e.g., OpenAI, Transformers.js)
 */
function generateMockEmbedding(text: string): number[] {
  // Create a deterministic embedding based on text hash
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
}

/**
 * Example 1: Basic Text File Processing
 */
async function example1BasicProcessing(graph: KnowledgeGraph) {
  console.log('\n=== Example 1: Basic Text File Processing ===\n');

  const processor = new DocumentProcessor(graph);

  // Create a sample text file
  const sampleText = `
Introduction to Knowledge Graphs

Knowledge graphs are powerful data structures that represent information as networks of entities and relationships.

They enable semantic search and contextual understanding by connecting related concepts through edges.

Applications

Knowledge graphs are used in:
- Search engines
- Recommendation systems
- Question answering systems
- Data integration

Benefits

1. Semantic Understanding: Capture meaning and context
2. Relationship Mapping: Connect related information
3. Flexible Queries: Navigate data through relationships
4. Scalability: Handle large datasets efficiently
  `.trim();

  await fs.writeFile('./sample-doc.txt', sampleText);

  // Process the document
  const doc = await processor.processFile('./sample-doc.txt');

  console.log(`Document ID: ${doc.id}`);
  console.log(`Filename: ${doc.filename}`);
  console.log(`Format: ${doc.format}`);
  console.log(`Text length: ${doc.text.length} characters`);
  console.log(`Number of chunks: ${doc.chunks.length}`);
  console.log('\nFirst chunk:');
  console.log(doc.chunks[0]);

  // Cleanup
  await fs.unlink('./sample-doc.txt');
}

/**
 * Example 2: Custom Chunking Strategies
 */
async function example2ChunkingStrategies() {
  console.log('\n=== Example 2: Chunking Strategies ===\n');

  const chunker = new DocumentChunker();
  const text = `
Paragraph one discusses artificial intelligence and its applications in modern technology.

Paragraph two explores machine learning algorithms and their role in pattern recognition.

Paragraph three examines deep learning architectures like neural networks and transformers.
  `.trim();

  // Fixed-size chunking
  console.log('Fixed-size chunking (100 chars, 20 overlap):');
  const fixedChunks = chunker.chunk(text, {
    chunkSize: 100,
    chunkOverlap: 20
  });
  console.log(`Created ${fixedChunks.length} chunks`);
  fixedChunks.forEach((chunk, i) => {
    console.log(`  Chunk ${i + 1}: ${chunk.length} chars`);
  });

  // Semantic chunking
  console.log('\nSemantic chunking (150 chars max):');
  const semanticChunks = chunker.semanticChunk(text, {
    chunkSize: 150
  });
  console.log(`Created ${semanticChunks.length} chunks`);
  semanticChunks.forEach((chunk, i) => {
    console.log(`  Chunk ${i + 1}: "${chunk.substring(0, 50)}..."`);
  });
}

/**
 * Example 3: Knowledge Graph Population
 */
async function example3GraphPopulation(graph: KnowledgeGraph) {
  console.log('\n=== Example 3: Knowledge Graph Population ===\n');

  const processor = new DocumentProcessor(graph);

  // Create sample documents
  const doc1Text = `
Artificial Intelligence Overview

AI is the simulation of human intelligence by machines. It includes machine learning,
natural language processing, and computer vision.
  `.trim();

  const doc2Text = `
Machine Learning Fundamentals

Machine learning is a subset of AI that enables systems to learn from data without
explicit programming. It uses statistical techniques to identify patterns.
  `.trim();

  await fs.writeFile('./ai-doc.txt', doc1Text);
  await fs.writeFile('./ml-doc.txt', doc2Text);

  // Process and populate
  const doc1 = await processor.processFile('./ai-doc.txt', { chunkSize: 100 });
  const doc2 = await processor.processFile('./ml-doc.txt', { chunkSize: 100 });

  console.log('Populating knowledge graph...');
  await processor.populateKnowledgeGraph(doc1, generateMockEmbedding);
  await processor.populateKnowledgeGraph(doc2, generateMockEmbedding);

  // Query the graph
  const allDocs = await graph.queryNodes({ type: 'document' });
  const allChunks = await graph.queryNodes({ type: 'chunk' });

  console.log(`\nKnowledge Graph Statistics:`);
  console.log(`  Total documents: ${allDocs.length}`);
  console.log(`  Total chunks: ${allChunks.length}`);

  // Examine document structure
  console.log(`\nDocument 1 structure:`);
  const doc1Node = await graph.getNode(`doc-${doc1.id}`);
  console.log(`  ID: ${doc1Node?.id}`);
  console.log(`  Type: ${doc1Node?.type}`);
  console.log(`  Metadata:`, doc1Node?.metadata);

  const doc1Edges = await graph.getEdgesToNode(`doc-${doc1.id}`);
  console.log(`  Connected chunks: ${doc1Edges.length}`);

  // Cleanup
  await fs.unlink('./ai-doc.txt');
  await fs.unlink('./ml-doc.txt');
}

/**
 * Example 4: Semantic Search Over Documents
 */
async function example4SemanticSearch(graph: KnowledgeGraph) {
  console.log('\n=== Example 4: Semantic Search ===\n');

  const processor = new DocumentProcessor(graph);

  // Create diverse documents
  const docs = [
    {
      file: './doc-python.txt',
      content: 'Python is a high-level programming language known for simplicity and readability.'
    },
    {
      file: './doc-javascript.txt',
      content: 'JavaScript is the language of the web, enabling interactive websites and applications.'
    },
    {
      file: './doc-rust.txt',
      content: 'Rust is a systems programming language focused on safety and performance.'
    }
  ];

  // Create and process documents
  for (const { file, content } of docs) {
    await fs.writeFile(file, content);
    const doc = await processor.processFile(file, { chunkSize: 200 });
    await processor.populateKnowledgeGraph(doc, generateMockEmbedding);
  }

  // Semantic search
  console.log('Searching for: "web programming language"');
  const queryEmbedding = generateMockEmbedding('web programming language');
  const results = await graph.findSimilarNodes(queryEmbedding, 3);

  console.log(`\nTop ${results.length} results:`);
  results.forEach((node, i) => {
    console.log(`${i + 1}. ${node.content.substring(0, 60)}...`);
    console.log(`   Document: ${node.metadata?.documentId || 'N/A'}`);
  });

  // Cleanup
  for (const { file } of docs) {
    await fs.unlink(file);
  }
}

/**
 * Example 5: Batch Document Processing
 */
async function example5BatchProcessing(graph: KnowledgeGraph) {
  console.log('\n=== Example 5: Batch Processing ===\n');

  const processor = new DocumentProcessor(graph);

  // Create multiple documents
  const documents = [
    { name: 'intro.txt', content: 'Introduction to the system architecture and design principles.' },
    { name: 'features.txt', content: 'Key features include vector search, graph traversal, and RAG.' },
    { name: 'setup.txt', content: 'Setup requires Node.js 20+, TypeScript, and LanceDB installation.' },
    { name: 'usage.txt', content: 'Usage examples demonstrate the API and common patterns.' },
    { name: 'testing.txt', content: 'Testing is comprehensive with 80%+ coverage using Vitest.' }
  ];

  console.log(`Processing ${documents.length} documents...`);

  const startTime = Date.now();
  let successful = 0;
  let failed = 0;

  for (const { name, content } of documents) {
    try {
      await fs.writeFile(name, content);
      const doc = await processor.processFile(name, { chunkSize: 50 });
      await processor.populateKnowledgeGraph(doc, generateMockEmbedding);
      successful++;
      console.log(`✓ Processed: ${name} (${doc.chunks.length} chunks)`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed: ${name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const elapsed = Date.now() - startTime;

  console.log(`\nBatch Processing Summary:`);
  console.log(`  Total: ${documents.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Time: ${elapsed}ms`);
  console.log(`  Avg: ${Math.round(elapsed / documents.length)}ms per document`);

  // Cleanup
  for (const { name } of documents) {
    try {
      await fs.unlink(name);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Example 6: Document Retrieval and Analysis
 */
async function example6DocumentRetrieval(graph: KnowledgeGraph) {
  console.log('\n=== Example 6: Document Retrieval ===\n');

  // Get all documents
  const documents = await graph.queryNodes({ type: 'document' });
  console.log(`Total documents in graph: ${documents.length}`);

  for (const doc of documents.slice(0, 3)) {
    console.log(`\nDocument: ${doc.metadata?.filename || doc.id}`);
    console.log(`  Format: ${doc.metadata?.format || 'unknown'}`);
    console.log(`  Content length: ${doc.content.length} chars`);

    // Get chunks for this document
    const docId = doc.id.replace('doc-', '');
    const chunks = await graph.queryNodes({
      type: 'chunk',
      metadata: { documentId: docId }
    });
    console.log(`  Chunks: ${chunks.length}`);

    // Show first chunk
    if (chunks.length > 0) {
      console.log(`  First chunk: "${chunks[0].content.substring(0, 50)}..."`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Document Processing Pipeline Examples');
  console.log('====================================');

  // Initialize knowledge graph
  const dbPath = './data/doc-processing-example';
  const graph = new KnowledgeGraph(dbPath);
  await graph.initialize();

  try {
    // Run examples
    await example1BasicProcessing(graph);
    await example2ChunkingStrategies();
    await example3GraphPopulation(graph);
    await example4SemanticSearch(graph);
    await example5BatchProcessing(graph);
    await example6DocumentRetrieval(graph);

    console.log('\n====================================');
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('\nError running examples:', error);
  } finally {
    // Cleanup
    await graph.close();

    // Remove example database
    try {
      await fs.rm(dbPath, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
