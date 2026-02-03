# Knowledge Graph System

A production-ready knowledge graph implementation with vector search capabilities using LanceDB.

## Features

- **Graph Operations**: Full CRUD operations for nodes and edges
- **Vector Embeddings**: Store and search nodes using semantic embeddings (384-dimension vectors)
- **Graph Traversal**: BFS, DFS, and shortest path algorithms
- **Flexible Queries**: Query nodes by type, metadata, or vector similarity
- **RAG Query Mode**: Built-in Retrieval-Augmented Generation for question answering
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **High Performance**: Built on LanceDB for efficient vector storage and retrieval

## Installation

The knowledge system is part of the enterprise-openclaw project and uses LanceDB for vector storage:

```bash
npm install @lancedb/lancedb
```

## Architecture

### Components

1. **KnowledgeGraph** (`knowledge-graph.ts`): Main graph management interface
2. **VectorStore** (`vector-store.ts`): LanceDB integration for storage
3. **DocumentProcessor** (`document-processor.ts`): Multi-format document processing pipeline
4. **DocumentChunker** (`chunking.ts`): Intelligent text chunking strategies
5. **BasicRAG** (`rag-modes/basic-rag.ts`): Retrieval-Augmented Generation query mode
6. **Types** (`types.ts`): TypeScript interfaces and type definitions

### Data Schema

#### GraphNode
```typescript
interface GraphNode {
  id: string;              // Unique identifier
  content: string;         // Node content/text
  embedding?: number[];    // Optional 384-dim vector
  metadata?: Record<string, any>;  // Custom properties
  type?: string;           // Node category
}
```

#### GraphEdge
```typescript
interface GraphEdge {
  id: string;              // Unique identifier
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: string;            // Relationship type
  weight?: number;         // Optional edge weight
  metadata?: Record<string, any>;  // Custom properties
}
```

## Usage

### Basic Setup

```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';

// Initialize the knowledge graph
const graph = new KnowledgeGraph('./data/my-knowledge-graph');
await graph.initialize();
```

### Adding Nodes

```typescript
// Add a simple node
await graph.addNode({
  id: 'node1',
  content: 'This is my first node',
  type: 'document'
});

// Add a node with embedding
await graph.addNode({
  id: 'node2',
  content: 'Node with semantic vector',
  embedding: generateEmbedding('Node with semantic vector'),
  metadata: {
    author: 'Alice',
    timestamp: Date.now()
  }
});
```

### Adding Edges

```typescript
// Connect nodes with an edge
await graph.addEdge({
  id: 'edge1',
  source: 'node1',
  target: 'node2',
  type: 'related_to',
  weight: 0.85
});
```

### Querying

```typescript
// Get a specific node
const node = await graph.getNode('node1');

// Query nodes by type
const documents = await graph.queryNodes({ type: 'document' });

// Query nodes by metadata
const aliceNodes = await graph.queryNodes({
  metadata: { author: 'Alice' }
});

// Get all nodes
const allNodes = await graph.getAllNodes();
```

### Graph Traversal

#### Breadth-First Search (BFS)
```typescript
// Traverse from a starting node
const nodes = await graph.bfs('node1');

// With options
const limitedTraversal = await graph.bfs('node1', {
  maxDepth: 2,
  nodeFilter: (node) => node.type === 'document',
  edgeFilter: (edge) => edge.weight > 0.5
});
```

#### Depth-First Search (DFS)
```typescript
// Deep traversal
const nodes = await graph.dfs('node1');

// With max depth
const limitedDFS = await graph.dfs('node1', {
  maxDepth: 3
});
```

#### Path Finding
```typescript
// Find shortest path between two nodes
const path = await graph.findPath('node1', 'node5');
console.log('Path:', path.map(n => n.id).join(' -> '));
```

### Vector Similarity Search

```typescript
// Find similar nodes using embeddings
const queryEmbedding = generateEmbedding('search query');
const similarNodes = await graph.findSimilarNodes(queryEmbedding, 5);

// Results are ordered by similarity
similarNodes.forEach((node, i) => {
  console.log(`${i + 1}. ${node.content}`);
});
```

### Neighbor Operations

```typescript
// Get outgoing neighbors
const outgoing = await graph.getNeighbors('node1', 'outgoing');

// Get incoming neighbors
const incoming = await graph.getNeighbors('node1', 'incoming');

// Get all connected neighbors
const all = await graph.getNeighbors('node1', 'both');
```

### Update and Delete

```typescript
// Update a node
await graph.updateNode('node1', {
  content: 'Updated content',
  metadata: { updated: true }
});

// Update an edge
await graph.updateEdge('edge1', {
  weight: 0.95
});

// Delete a node (also deletes connected edges)
await graph.deleteNode('node1');

// Delete an edge
await graph.deleteEdge('edge1');
```

## Graph Traversal Algorithms

### Breadth-First Search (BFS)
- Explores nodes level by level
- Finds shortest paths in unweighted graphs
- Useful for finding nearby nodes

### Depth-First Search (DFS)
- Explores as far as possible along each branch
- Memory efficient for deep graphs
- Useful for detecting cycles and dependencies

### Shortest Path (BFS-based)
- Finds the shortest path between two nodes
- Returns the sequence of nodes in the path
- Returns empty array if no path exists

## Vector Embeddings

The knowledge graph supports 384-dimensional embeddings for semantic search:

```typescript
// Mock embedding generator (replace with actual model)
function mockEmbedding(text: string): number[] {
  const hash = text.split('').reduce((acc, char) =>
    acc + char.charCodeAt(0), 0);
  return Array.from({ length: 384 }, (_, i) =>
    Math.sin(hash + i) * 0.5);
}

// Add nodes with embeddings
await graph.addNode({
  id: 'semantic-node',
  content: 'Knowledge graphs enable semantic search',
  embedding: mockEmbedding('Knowledge graphs enable semantic search')
});

// Search by similarity
const query = mockEmbedding('semantic search capabilities');
const results = await graph.findSimilarNodes(query, 10);
```

## Statistics

```typescript
// Get graph statistics
const nodeCount = await graph.getNodeCount();
const edgeCount = await graph.getEdgeCount();
const degree = await graph.getNodeDegree('node1');

console.log(`Graph has ${nodeCount} nodes and ${edgeCount} edges`);
console.log(`Node 'node1' has degree ${degree}`);
```

## Error Handling

The knowledge graph provides meaningful error messages:

```typescript
try {
  await graph.addNode({
    id: 'bad-node',
    content: 'Test',
    embedding: [1, 2, 3] // Wrong dimension
  });
} catch (error) {
  console.error(error.message);
  // "Invalid embedding dimension. Expected 384, got 3"
}
```

## Performance Considerations

- **Batch Operations**: Add multiple nodes/edges when possible
- **Embeddings**: Only add embeddings when semantic search is needed
- **Traversal Depth**: Use `maxDepth` to limit deep traversals
- **Filters**: Apply filters early to reduce processing

## Testing

The knowledge system has comprehensive test coverage (90%+):

```bash
npm test -- tests/knowledge-system/knowledge-graph.test.ts
```

Test categories:
- Database initialization
- Node CRUD operations
- Edge CRUD operations
- Graph traversal algorithms
- Vector similarity search
- Concurrent operations
- Error handling
- Schema validation

## Document Processing Pipeline

The Knowledge Graph System includes a production-ready document processing pipeline that extracts text from multiple formats, chunks it intelligently, and populates the knowledge graph.

### Supported Formats

- **PDF** - Portable Document Format with metadata extraction
- **DOCX** - Microsoft Word documents
- **PPTX** - Microsoft PowerPoint presentations
- **TXT** - Plain text files

### Features

- **Multi-Format Support**: Process PDF, DOCX, PPTX, and TXT files
- **Intelligent Chunking**: Fixed-size and semantic chunking strategies
- **Metadata Preservation**: Extract and preserve document metadata
- **Knowledge Graph Integration**: Automatically populate graph with document chunks
- **Embedding Support**: Optional embedding generation for semantic search
- **Error Handling**: Robust error handling for corrupted or unsupported files

### Quick Start

```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';
import { DocumentProcessor } from './extensions/knowledge-system/document-processor.js';

// Initialize knowledge graph
const graph = new KnowledgeGraph('./data/documents');
await graph.initialize();

// Create document processor
const processor = new DocumentProcessor(graph);

// Process a document
const doc = await processor.processFile('./data/sample.pdf');
console.log(`Processed: ${doc.filename}`);
console.log(`Extracted ${doc.chunks.length} chunks`);

// Populate knowledge graph
await processor.populateKnowledgeGraph(doc);
```

### Processing Documents

#### Basic Document Processing

```typescript
// Process a PDF file
const pdfDoc = await processor.processFile('./documents/report.pdf');

// Process a DOCX file
const docxDoc = await processor.processFile('./documents/memo.docx');

// Process a text file
const txtDoc = await processor.processFile('./documents/notes.txt');

// Access extracted content
console.log(`Document ID: ${pdfDoc.id}`);
console.log(`Format: ${pdfDoc.format}`);
console.log(`Text length: ${pdfDoc.text.length}`);
console.log(`Number of chunks: ${pdfDoc.chunks.length}`);
```

#### Custom Chunking Options

```typescript
// Use fixed-size chunking
const doc = await processor.processFile('./document.pdf', {
  chunkingStrategy: 'fixed',
  chunkSize: 300,
  chunkOverlap: 30
});

// Use semantic chunking (default)
const doc2 = await processor.processFile('./document.pdf', {
  chunkingStrategy: 'semantic',
  chunkSize: 500  // Maximum chunk size
});
```

### Chunking Strategies

#### Fixed-Size Chunking

Splits text into chunks of a fixed size with optional overlap:

```typescript
import { DocumentChunker } from './extensions/knowledge-system/chunking.js';

const chunker = new DocumentChunker();

// Chunk with default settings (500 chars, 50 overlap)
const chunks = chunker.chunk(text);

// Custom chunk size and overlap
const chunks2 = chunker.chunk(text, {
  chunkSize: 200,
  chunkOverlap: 20
});

// No overlap
const chunks3 = chunker.chunk(text, {
  chunkSize: 100,
  chunkOverlap: 0
});
```

#### Semantic Chunking

Splits text at paragraph boundaries while respecting maximum chunk size:

```typescript
// Semantic chunking preserves context
const chunks = chunker.semanticChunk(text, {
  chunkSize: 500
});

// Each chunk will contain complete paragraphs
// Small paragraphs are combined
// Large paragraphs are split as needed
```

### Knowledge Graph Population

#### Basic Population

```typescript
// Process document
const doc = await processor.processFile('./document.pdf');

// Add to knowledge graph
await processor.populateKnowledgeGraph(doc);

// Document structure in graph:
// - One document node (type: 'document')
// - Multiple chunk nodes (type: 'chunk')
// - Edges linking chunks to document (type: 'part_of')
```

#### With Embeddings

```typescript
// Generate embeddings for semantic search
function generateEmbedding(text: string): number[] {
  // Use your embedding model
  // Must return 384-dimensional vector
  return embedModel.encode(text);
}

// Populate with embeddings
await processor.populateKnowledgeGraph(doc, generateEmbedding);

// Now chunks can be searched semantically
const queryEmbedding = generateEmbedding('search query');
const results = await graph.findSimilarNodes(queryEmbedding, 5);
```

#### Batch Processing

```typescript
const files = [
  './docs/doc1.pdf',
  './docs/doc2.docx',
  './docs/doc3.txt'
];

for (const file of files) {
  try {
    const doc = await processor.processFile(file);
    await processor.populateKnowledgeGraph(doc, generateEmbedding);
    console.log(`Processed: ${doc.filename}`);
  } catch (error) {
    console.error(`Failed to process ${file}:`, error.message);
  }
}
```

### Metadata Extraction

Documents and chunks preserve metadata:

```typescript
const doc = await processor.processFile('./report.pdf');

// Document metadata
console.log(doc.metadata.filename);  // 'report.pdf'
console.log(doc.metadata.format);    // 'pdf'
console.log(doc.metadata.pages);     // 10
console.log(doc.metadata.info);      // PDF metadata (title, author, etc.)

// Chunk metadata
const chunkNode = await graph.getNode(`chunk-${doc.id}-0`);
console.log(chunkNode.metadata.documentId);    // 'report'
console.log(chunkNode.metadata.chunkIndex);    // 0
console.log(chunkNode.metadata.totalChunks);   // 25
```

### Error Handling

```typescript
try {
  const doc = await processor.processFile('./document.xyz');
} catch (error) {
  if (error.message.includes('Unsupported format')) {
    console.error('File format not supported');
  } else if (error.code === 'ENOENT') {
    console.error('File not found');
  } else {
    console.error('Processing failed:', error.message);
  }
}
```

### Document Structure in Graph

After processing, documents are stored in the knowledge graph with this structure:

```
doc-{id} (document node)
  ├─ content: full document text
  ├─ type: 'document'
  └─ metadata: { filename, format, pages, ... }

chunk-{id}-0 (chunk node)
  ├─ content: first chunk text
  ├─ type: 'chunk'
  ├─ embedding: [384-dim vector]
  ├─ metadata: { documentId, chunkIndex, totalChunks }
  └─ edge → doc-{id} (type: 'part_of')

chunk-{id}-1 (chunk node)
  └─ ...
```

### Querying Processed Documents

```typescript
// Find all documents
const docs = await graph.queryNodes({ type: 'document' });

// Find all chunks from a specific document
const chunks = await graph.queryNodes({
  type: 'chunk',
  metadata: { documentId: 'report' }
});

// Get document from a chunk
const chunk = await graph.getNode('chunk-report-5');
const edges = await graph.getEdgesFromNode('chunk-report-5');
const docId = edges[0].target;
const doc = await graph.getNode(docId);

// Semantic search across all chunks
const queryEmbedding = generateEmbedding('quarterly revenue');
const relevant = await graph.findSimilarNodes(queryEmbedding, 10);
```

### Integration with RAG

Combine document processing with RAG for document-based Q&A:

```typescript
// 1. Process and index documents
const processor = new DocumentProcessor(graph);

for (const file of documentFiles) {
  const doc = await processor.processFile(file);
  await processor.populateKnowledgeGraph(doc, generateEmbedding);
}

// 2. Create RAG system
const rag = new BasicRAG({
  knowledgeGraph: graph,
  topK: 5,
  similarityThreshold: 0.7
});

// 3. Query documents
const answer = await rag.query('What were the Q3 revenue figures?');
console.log(answer);
```

### Testing

The document processor has 86%+ test coverage:

```bash
npm test -- tests/knowledge-system/document-processor.test.ts
```

Test categories:
- Text extraction (PDF, DOCX, PPTX, TXT)
- Fixed-size chunking
- Semantic chunking
- Knowledge graph population
- Metadata preservation
- Error handling
- Batch processing

### Complete Example

See `examples/document-processing-example.ts` for a full working example demonstrating:
- Document processing from multiple formats
- Custom chunking strategies
- Knowledge graph population
- Embedding generation
- Semantic search over documents
- Document retrieval

Run the example:
```bash
npx tsx examples/document-processing-example.ts
```

## Basic RAG Query Mode

The Knowledge Graph System includes a built-in RAG (Retrieval-Augmented Generation) query mode for question answering using the knowledge graph as context.

### Overview

Basic RAG implements a simple but effective pipeline:
1. **Query Embedding**: Generate vector embedding for the user's query
2. **Vector Similarity Search**: Find top-K most similar nodes in the knowledge graph
3. **Threshold Filtering**: Filter results by similarity score
4. **Context Assembly**: Combine retrieved content into a context window
5. **Response Generation**: Generate answer using LLM with retrieved context

### Quick Start

```typescript
import { KnowledgeGraph, BasicRAG } from './extensions/knowledge-system/index.js';

// Initialize knowledge graph
const graph = new KnowledgeGraph('./data/knowledge-base');
await graph.initialize();

// Add documents with embeddings
await graph.addNode({
  id: 'doc1',
  content: 'Artificial Intelligence is the simulation of human intelligence by machines.',
  embedding: generateEmbedding('Artificial Intelligence is...'),
  type: 'document'
});

// Create RAG system
const rag = new BasicRAG({
  knowledgeGraph: graph,
  topK: 5,                    // Retrieve top 5 similar nodes
  similarityThreshold: 0.7,    // Minimum similarity score
  contextWindow: 2000,         // Max context characters
  llmModel: 'ollama:phi4'      // LLM model to use
});

// Query the RAG system
const answer = await rag.query('What is artificial intelligence?');
console.log(answer);
```

### Configuration Options

```typescript
interface BasicRAGConfig {
  knowledgeGraph: KnowledgeGraph;     // Required: Knowledge graph instance
  topK?: number;                      // Default: 5
  similarityThreshold?: number;        // Default: 0.7 (range: 0-1)
  contextWindow?: number;              // Default: 2000 chars
  llmModel?: string;                   // Default: 'ollama:phi4'
  includeMetadata?: boolean;           // Default: false
}
```

### Usage Examples

#### Basic Query

```typescript
const rag = new BasicRAG({ knowledgeGraph: graph });
const answer = await rag.query('Explain machine learning');
console.log(answer);
```

#### Custom Configuration

```typescript
const rag = new BasicRAG({
  knowledgeGraph: graph,
  topK: 10,                    // Retrieve more nodes
  similarityThreshold: 0.8,    // Higher quality threshold
  contextWindow: 3000,         // Larger context
  includeMetadata: true        // Include node metadata
});
```

#### Update Configuration at Runtime

```typescript
// Create with defaults
const rag = new BasicRAG({ knowledgeGraph: graph });

// Update configuration
rag.updateConfig({
  topK: 3,
  similarityThreshold: 0.9
});

// Query with new settings
const answer = await rag.query('Query with new settings');
```

#### Multiple Queries

```typescript
const queries = [
  'What is AI?',
  'Explain neural networks',
  'How does deep learning work?'
];

for (const query of queries) {
  const answer = await rag.query(query);
  console.log(`Q: ${query}`);
  console.log(`A: ${answer}\n`);
}
```

#### Concurrent Queries

```typescript
const queries = ['Query 1', 'Query 2', 'Query 3'];
const answers = await Promise.all(
  queries.map(q => rag.query(q))
);
```

### Performance Metrics

Track RAG performance with built-in metrics:

```typescript
// Perform some queries
await rag.query('First query');
await rag.query('Second query');
await rag.query('Third query');

// Get metrics
const metrics = rag.getRetrievalMetrics();
console.log(`Total Queries: ${metrics.totalQueries}`);
console.log(`Avg Retrieval Time: ${metrics.averageRetrievalTime}ms`);
console.log(`Avg Nodes Retrieved: ${metrics.averageNodesRetrieved}`);

// Reset metrics
rag.resetMetrics();
```

### Embedding Generation

BasicRAG includes a simple mock embedding generator for testing. For production use, integrate with:

**OpenAI Embeddings:**
```typescript
import OpenAI from 'openai';

async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 384
  });
  return response.data[0].embedding;
}
```

**Transformers.js (Local):**
```typescript
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction',
  'Xenova/all-MiniLM-L6-v2');

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

### LLM Integration

The current implementation uses a mock LLM for testing. For production, integrate with:

**Ollama (Local):**
```typescript
async function generateResponse(query: string, context: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'phi4',
      prompt: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
      stream: false
    })
  });
  const data = await response.json();
  return data.response;
}
```

**OpenAI API:**
```typescript
import OpenAI from 'openai';

async function generateResponse(query: string, context: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Answer based on the provided context.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
    ]
  });
  return completion.choices[0].message.content || '';
}
```

### RAG Pipeline Flow

```
User Query
    ↓
[1. Generate Query Embedding]
    ↓
[2. Vector Similarity Search]
    ↓
[3. Filter by Threshold]
    ↓
[4. Assemble Context]
    ↓
[5. LLM Response Generation]
    ↓
Final Answer
```

### Error Handling

```typescript
try {
  const answer = await rag.query('What is AI?');
  console.log(answer);
} catch (error) {
  if (error.message.includes('not initialized')) {
    console.error('Knowledge graph not initialized');
  } else {
    console.error('Query failed:', error.message);
  }
}
```

### Best Practices

1. **Knowledge Graph Preparation**: Add documents with high-quality embeddings
2. **Similarity Threshold**: Tune based on your use case (0.6-0.8 is typical)
3. **Context Window**: Balance between completeness and token limits
4. **Top-K Selection**: Start with 3-5, adjust based on results
5. **Batch Queries**: Use concurrent queries for better throughput
6. **Monitor Metrics**: Track performance and adjust configuration

### Complete Example

See `examples/basic-rag-example.ts` for a full working example demonstrating:
- Knowledge graph setup
- Document addition with embeddings
- RAG configuration
- Multiple query scenarios
- Performance metrics tracking
- Configuration updates

Run the example:
```bash
npx tsx examples/basic-rag-example.ts
```

## Cleanup

Always close the graph when done:

```typescript
await graph.close();
```

## Integration Example

```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';

async function main() {
  // Initialize
  const graph = new KnowledgeGraph('./data/knowledge-graph');
  await graph.initialize();

  // Build a simple knowledge graph
  await graph.addNode({
    id: 'ai',
    content: 'Artificial Intelligence'
  });
  await graph.addNode({
    id: 'ml',
    content: 'Machine Learning'
  });
  await graph.addNode({
    id: 'dl',
    content: 'Deep Learning'
  });

  await graph.addEdge({
    id: 'ai-ml',
    source: 'ai',
    target: 'ml',
    type: 'includes'
  });
  await graph.addEdge({
    id: 'ml-dl',
    source: 'ml',
    target: 'dl',
    type: 'includes'
  });

  // Traverse the graph
  const nodes = await graph.bfs('ai');
  console.log('AI hierarchy:', nodes.map(n => n.content));

  // Find path
  const path = await graph.findPath('ai', 'dl');
  console.log('Path from AI to DL:', path.map(n => n.content).join(' -> '));

  // Cleanup
  await graph.close();
}

main().catch(console.error);
```

## License

Apache-2.0
