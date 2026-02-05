# Architecture

## Overview

OpenClaw Pro (Community Edition) is a lightweight, open-source framework for building AI-powered knowledge systems. It provides core building blocks for knowledge graphs, vector search, and semantic retrieval without the complexity of enterprise features.

**Design Philosophy:**
- **Simple:** Easy to understand and extend
- **Composable:** Use only what you need
- **Performant:** Optimized for real-world workloads
- **Open:** Apache 2.0 licensed, community-driven

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │
│  (Your code using @enterprise-openclaw/core)           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              @enterprise-openclaw/core                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  KnowledgeGraph  │  │    VectorStore   │            │
│  │                  │  │                  │            │
│  │ - Node/Edge CRUD │  │ - Embedding ops  │            │
│  │ - Graph traversal│  │ - Similarity     │            │
│  │ - Similarity     │  │ - ANN search     │            │
│  └──────────────────┘  └──────────────────┘            │
│           │                      │                      │
└───────────┼──────────────────────┼──────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────┐    ┌─────────────────────────┐
│  Anthropic API  │    │  LanceDB (Vector DB)    │
│  (Embeddings)   │    │  (Memory-mapped files)  │
└─────────────────┘    └─────────────────────────┘
```

---

## Core Components

### 1. Knowledge Graph

**Purpose:** Store and query structured knowledge with relationships.

**Key Features:**
- **Nodes:** Represent entities, concepts, or document chunks
- **Edges:** Define relationships between nodes (e.g., "related_to", "depends_on")
- **Metadata:** Attach custom properties to nodes and edges
- **Traversal:** Navigate the graph with BFS/DFS algorithms

**Data Structure:**
```typescript
// In-memory graph representation
class KnowledgeGraph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge>;
  private adjacencyList: Map<string, Set<string>>;
  private vectorStore: VectorStore;
}
```

**Storage:**
- Nodes and edges: In-memory (fast access)
- Embeddings: LanceDB (disk-backed, memory-mapped)

**Traversal Algorithm:**
```typescript
// Breadth-First Search (BFS) with filters
function traverse(startId, options) {
  const queue = [{ id: startId, depth: 0 }];
  const visited = new Set();
  const results = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (visited.has(id) || depth > options.maxDepth) continue;

    visited.add(id);
    const node = this.nodes.get(id);

    if (options.nodeFilter(node)) {
      results.push(node);

      // Add neighbors to queue
      for (const neighborId of this.getNeighbors(id)) {
        queue.push({ id: neighborId, depth: depth + 1 });
      }
    }
  }

  return results;
}
```

---

### 2. Vector Store

**Purpose:** Fast similarity search using vector embeddings.

**Technology:** [LanceDB](https://lancedb.github.io/lancedb/) - Embedded vector database

**Why LanceDB:**
- **Embedded:** No separate server process
- **Fast:** Memory-mapped files, optimized ANN search
- **Scalable:** Handles millions of vectors
- **Open Source:** Apache 2.0 license

**Embedding Generation:**
```typescript
// Using Anthropic Claude API
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await anthropic.embeddings.create({
    model: 'claude-3-5-sonnet-20241022',
    input: text
  });
  return response.data[0].embedding; // 1024-dimensional vector
}
```

**Similarity Search:**
```typescript
// L2 (Euclidean) distance for similarity
async function search(queryEmbedding: number[], limit: number) {
  const results = await this.table
    .search(queryEmbedding)
    .limit(limit)
    .execute();

  // Convert distance to similarity score (0-1)
  return results.map(r => ({
    ...r,
    score: 1 / (1 + r._distance)
  }));
}
```

**Storage Format:**
- **Location:** `./data/vector-store/`
- **Format:** Apache Arrow (columnar, compressed)
- **Index:** IVF-PQ for approximate nearest neighbor (ANN) search

---

### 3. RAG Modes

**Purpose:** Retrieval-Augmented Generation for question answering.

#### Basic RAG

Simple semantic search + LLM generation.

```
User Query → Generate Embedding → Find Similar Nodes → LLM Prompt → Answer
```

**Implementation:**
```typescript
async function basicRAG(query: string): Promise<string> {
  // 1. Retrieve relevant documents
  const results = await knowledgeGraph.findSimilar(query, { limit: 5 });

  // 2. Build context from top results
  const context = results
    .map(r => r.node.content)
    .join('\n\n');

  // 3. Generate answer with LLM
  const prompt = `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}
```

**Use Cases:**
- Document Q&A
- Semantic search
- Content recommendation

#### DRIFT RAG (Basic)

**DRIFT:** Dynamic Retrieval with Iterative Focusing and Traversal

Enhanced RAG with graph traversal and multi-hop reasoning.

```
User Query → Initial Retrieval → Traverse Graph → Rerank Results → LLM → Answer
```

**Key Differences from Basic RAG:**
1. **Multi-hop:** Traverse graph to find indirectly related nodes
2. **Reranking:** Score nodes by relevance + graph structure
3. **Iterative:** Refine results based on intermediate LLM reasoning

**Implementation (Simplified):**
```typescript
async function driftRAGBasic(query: string): Promise<string> {
  // 1. Initial retrieval
  const initialResults = await knowledgeGraph.findSimilar(query, { limit: 10 });

  // 2. Traverse from top results (max depth 2)
  const expanded = new Set<GraphNode>();
  for (const result of initialResults.slice(0, 3)) {
    const neighbors = await knowledgeGraph.traverse(result.node.id, {
      maxDepth: 2
    });
    neighbors.forEach(n => expanded.add(n));
  }

  // 3. Rerank by combining similarity + graph distance
  const reranked = Array.from(expanded)
    .map(node => ({
      node,
      score: node.similarity * 0.7 + node.graphScore * 0.3
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 4. Generate answer
  const context = reranked.map(r => r.node.content).join('\n\n');
  return await basicRAG(query); // Use basic RAG for final generation
}
```

**Use Cases:**
- Complex questions requiring multi-hop reasoning
- Domain-specific knowledge bases with rich relationships
- Research and discovery tasks

---

## Data Flow

### Indexing (Adding Documents)

```
Document → Chunk → Nodes → Embeddings → Vector Store → Knowledge Graph
```

**Example:**
```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const graph = new KnowledgeGraph();

// 1. Chunk document
const chunks = chunkDocument(documentText, { size: 512, overlap: 50 });

// 2. Create nodes
for (let i = 0; i < chunks.length; i++) {
  await graph.addNode({
    id: `doc-${docId}-chunk-${i}`,
    content: chunks[i],
    type: 'document_chunk',
    metadata: { document: docId, position: i }
  });

  // 3. Link sequential chunks
  if (i > 0) {
    await graph.addEdge({
      id: `edge-${i-1}-${i}`,
      source: `doc-${docId}-chunk-${i-1}`,
      target: `doc-${docId}-chunk-${i}`,
      type: 'follows'
    });
  }
}
```

### Querying

```
User Query → Generate Embedding → Similarity Search → Traverse Graph → Rank → LLM → Answer
```

---

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Add Node | O(1) + O(E) | O(E) for embedding generation |
| Get Node | O(1) | Hash map lookup |
| Find Similar | O(n log k) | ANN search, k = limit |
| Traverse | O(d × b) | d = depth, b = branching factor |
| Add Edge | O(1) | Adjacency list update |

### Space Complexity

| Component | Memory Usage | Notes |
|-----------|--------------|-------|
| Node | ~200 bytes | Without embedding |
| Embedding | ~4 KB | 1024 dims × 4 bytes |
| Edge | ~100 bytes | With metadata |
| Index | ~10% of data | LanceDB IVF-PQ index |

**Example:** 100K documents, 500 chunks each = 50M nodes
- Nodes: 50M × 200 bytes = 10 GB
- Embeddings: 50M × 4 KB = 200 GB (disk-backed)
- Edges: ~100M × 100 bytes = 10 GB
- Total memory: ~20 GB + 200 GB disk

---

## Design Decisions

### Why In-Memory Graph?

**Pro:**
- Fast node/edge lookups (O(1))
- Efficient graph traversal
- Simple implementation

**Con:**
- Limited by RAM
- Not persistent by default

**Trade-off:** For 10K-1M nodes, in-memory is fast and simple. For larger graphs, consider disk-backed storage (future: SQLite, RocksDB).

### Why LanceDB?

**Alternatives Considered:**
- **FAISS:** High performance but requires manual indexing
- **Pinecone:** SaaS-only, vendor lock-in
- **Weaviate:** Requires separate server
- **Milvus:** Too heavy for embedded use

**LanceDB Wins:**
- Embedded (no server)
- Apache 2.0 license
- Modern columnar format (Arrow)
- Good performance for <10M vectors

### Why Anthropic Claude?

**For Embeddings:**
- High-quality embeddings (1024 dims)
- API simplicity
- Consistent with LLM provider

**Alternatives:** OpenAI, Cohere, local models (e.g., sentence-transformers)

---

## Extensibility

### Custom Vector Stores

```typescript
interface VectorStore {
  add(id: string, embedding: number[], metadata?: any): Promise<void>;
  search(query: number[], options?: SearchOptions): Promise<SearchResult[]>;
  get(id: string): Promise<VectorRecord | null>;
  delete(id: string): Promise<void>;
}

// Example: Use FAISS instead of LanceDB
class FAISSVectorStore implements VectorStore {
  // Implementation...
}

const graph = new KnowledgeGraph({
  vectorStore: new FAISSVectorStore()
});
```

### Custom Embedding Models

```typescript
const graph = new KnowledgeGraph({
  embeddingModel: 'text-embedding-ada-002', // OpenAI
  embeddingProvider: 'openai'
});
```

### Custom Traversal Logic

```typescript
// Example: Find all nodes within 3 hops of type "concept"
const concepts = await graph.traverse('start-node', {
  maxDepth: 3,
  nodeFilter: (node) => node.type === 'concept',
  edgeFilter: (edge) => edge.weight > 0.5
});
```

---

## Security Considerations

### Data Privacy

- **Local Storage:** All data stored on your machine by default
- **API Keys:** Stored in `.env` file (never committed to git)
- **Embeddings:** Generated via Anthropic API (data sent to Anthropic servers)

**Best Practices:**
- Use environment variables for secrets
- Encrypt sensitive data at rest
- Use HTTPS for API calls (enforced by Anthropic SDK)

### Input Validation

All user inputs are validated:
```typescript
// Example: Node ID validation
function validateNodeId(id: string) {
  if (!id || typeof id !== 'string') {
    throw new Error('Node ID must be a non-empty string');
  }
  if (id.length > 256) {
    throw new Error('Node ID too long (max 256 chars)');
  }
}
```

---

## Testing Strategy

### Unit Tests

- **Coverage:** 80%+ for core modules
- **Framework:** Vitest
- **Patterns:** Arrange-Act-Assert (AAA)

**Example:**
```typescript
describe('KnowledgeGraph', () => {
  it('should add and retrieve nodes', async () => {
    // Arrange
    const graph = new KnowledgeGraph();
    const node = { id: 'test-1', content: 'Test content' };

    // Act
    await graph.addNode(node);
    const retrieved = await graph.getNode('test-1');

    // Assert
    expect(retrieved).toEqual(node);
  });
});
```

### Integration Tests

Test full workflows:
```typescript
it('should perform end-to-end RAG query', async () => {
  // 1. Index documents
  await indexDocuments(['doc1.txt', 'doc2.txt']);

  // 2. Query
  const answer = await basicRAG('What is machine learning?');

  // 3. Verify
  expect(answer).toContain('machine learning');
});
```

---

## Future Directions

### Planned Features

1. **Persistent Storage:** SQLite backend for large graphs
2. **Streaming Indexing:** Process large documents incrementally
3. **Multi-modal Support:** Images, audio, video embeddings
4. **Advanced RAG:** HyDE, CoT prompting, multi-query
5. **Distributed Processing:** Parallel embedding generation

### Community Contributions Welcome!

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to get involved.

---

## References

- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [RAG Survey Paper](https://arxiv.org/abs/2312.10997)
- [Knowledge Graphs in NLP](https://arxiv.org/abs/2003.02320)

---

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.
