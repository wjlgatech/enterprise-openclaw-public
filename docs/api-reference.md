# API Reference

## @enterprise-openclaw/core

The core package provides the fundamental building blocks for building AI-powered knowledge systems with OpenClaw.

### Installation

```bash
npm install @enterprise-openclaw/core
```

### Quick Start

```typescript
import { KnowledgeGraph, VectorStore } from '@enterprise-openclaw/core';

// Create a knowledge graph
const graph = new KnowledgeGraph();

// Add nodes
await graph.addNode({
  id: 'node1',
  content: 'Machine learning is a subset of artificial intelligence',
  type: 'definition'
});

// Query similar content
const results = await graph.findSimilar('What is ML?', { limit: 5 });
```

---

## Core Classes

### KnowledgeGraph

Main class for building and querying knowledge graphs with vector embeddings.

#### Constructor

```typescript
new KnowledgeGraph(options?: KnowledgeGraphOptions)
```

**Options:**
- `vectorStore?: VectorStore` - Custom vector store instance (default: LanceDB)
- `embeddingModel?: string` - Model for generating embeddings (default: 'claude-3-5-sonnet-20241022')
- `maxDepth?: number` - Maximum traversal depth (default: 5)

#### Methods

##### `addNode(node: GraphNode): Promise<void>`

Add a node to the knowledge graph. Automatically generates embeddings for the node content.

```typescript
await graph.addNode({
  id: 'concept-1',
  content: 'Neural networks are computing systems inspired by biological neural networks',
  type: 'concept',
  metadata: { source: 'textbook', chapter: 3 }
});
```

**Parameters:**
- `node.id` (string) - Unique identifier
- `node.content` (string) - Text content
- `node.embedding?` (number[]) - Optional pre-computed embedding
- `node.type?` (string) - Node category
- `node.metadata?` (Record<string, any>) - Additional properties

##### `addEdge(edge: GraphEdge): Promise<void>`

Add a relationship between two nodes.

```typescript
await graph.addEdge({
  id: 'edge-1',
  source: 'concept-1',
  target: 'concept-2',
  type: 'related_to',
  weight: 0.8,
  metadata: { strength: 'strong' }
});
```

**Parameters:**
- `edge.id` (string) - Unique identifier
- `edge.source` (string) - Source node ID
- `edge.target` (string) - Target node ID
- `edge.type` (string) - Relationship type (e.g., 'related_to', 'depends_on')
- `edge.weight?` (number) - Optional weight (0-1)
- `edge.metadata?` (Record<string, any>) - Additional properties

##### `getNode(id: string): Promise<GraphNode | null>`

Retrieve a node by ID.

```typescript
const node = await graph.getNode('concept-1');
if (node) {
  console.log(node.content);
}
```

##### `findSimilar(query: string, options?: SimilarityOptions): Promise<SimilarityResult[]>`

Find nodes similar to a text query using vector embeddings.

```typescript
const results = await graph.findSimilar('deep learning frameworks', {
  limit: 10,
  minScore: 0.7,
  type: 'concept'
});

results.forEach(result => {
  console.log(`${result.node.content} (score: ${result.score})`);
});
```

**Options:**
- `limit?` (number) - Maximum results (default: 10)
- `minScore?` (number) - Minimum similarity threshold 0-1 (default: 0.5)
- `type?` (string) - Filter by node type

**Returns:** Array of `SimilarityResult` objects with `node`, `score`, and `distance`.

##### `traverse(startId: string, options?: TraversalOptions): Promise<GraphNode[]>`

Traverse the graph starting from a node.

```typescript
const nodes = await graph.traverse('concept-1', {
  maxDepth: 3,
  nodeFilter: (node) => node.type === 'concept',
  edgeFilter: (edge) => edge.weight > 0.5
});
```

**Options:**
- `maxDepth?` (number) - Maximum traversal depth
- `nodeFilter?` (node: GraphNode) => boolean - Filter nodes during traversal
- `edgeFilter?` (edge: GraphEdge) => boolean - Filter edges during traversal

##### `findNodes(query: NodeQuery): Promise<GraphNode[]>`

Find nodes matching query criteria.

```typescript
const nodes = await graph.findNodes({
  type: 'definition',
  metadata: { source: 'textbook' }
});
```

##### `getNeighbors(nodeId: string, direction?: NeighborDirection): Promise<GraphNode[]>`

Get neighboring nodes.

```typescript
// Get all neighbors
const all = await graph.getNeighbors('concept-1', 'both');

// Get only outgoing neighbors
const outgoing = await graph.getNeighbors('concept-1', 'outgoing');
```

**Direction:**
- `'incoming'` - Nodes that point to this node
- `'outgoing'` - Nodes that this node points to
- `'both'` - All connected nodes (default)

---

### VectorStore

Low-level vector storage and similarity search using LanceDB.

#### Constructor

```typescript
new VectorStore(options?: VectorStoreOptions)
```

**Options:**
- `path?: string` - Storage path (default: './data/vector-store')
- `tableName?: string` - Table name (default: 'vectors')
- `dimensions?: number` - Embedding dimensions (default: 1024)

#### Methods

##### `add(id: string, embedding: number[], metadata?: Record<string, any>): Promise<void>`

Add a vector to the store.

```typescript
const vectorStore = new VectorStore();
await vectorStore.add('vec-1', [0.1, 0.2, ...], { content: 'example' });
```

##### `search(query: number[], options?: SearchOptions): Promise<SearchResult[]>`

Search for similar vectors.

```typescript
const results = await vectorStore.search([0.15, 0.25, ...], {
  limit: 5,
  minScore: 0.7
});
```

##### `get(id: string): Promise<VectorRecord | null>`

Retrieve a vector by ID.

##### `delete(id: string): Promise<void>`

Delete a vector from the store.

##### `clear(): Promise<void>`

Clear all vectors from the store.

---

## Type Definitions

### GraphNode

```typescript
interface GraphNode {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  type?: string;
}
```

### GraphEdge

```typescript
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  metadata?: Record<string, any>;
}
```

### SimilarityResult

```typescript
interface SimilarityResult {
  node: GraphNode;
  score: number;      // 0-1, higher is more similar
  distance: number;   // Euclidean distance
}
```

### TraversalOptions

```typescript
interface TraversalOptions {
  maxDepth?: number;
  nodeFilter?: (node: GraphNode) => boolean;
  edgeFilter?: (edge: GraphEdge) => boolean;
}
```

### NodeQuery

```typescript
interface NodeQuery {
  type?: string;
  metadata?: Record<string, any>;
}
```

### EdgeQuery

```typescript
interface EdgeQuery {
  type?: string;
  source?: string;
  target?: string;
  metadata?: Record<string, any>;
}
```

---

## Examples

### Building a Document Knowledge Graph

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const graph = new KnowledgeGraph();

// Add document chunks as nodes
const chunks = [
  { id: 'doc1-chunk1', text: 'Introduction to machine learning...' },
  { id: 'doc1-chunk2', text: 'Supervised learning algorithms...' },
  { id: 'doc1-chunk3', text: 'Neural networks and deep learning...' }
];

for (const chunk of chunks) {
  await graph.addNode({
    id: chunk.id,
    content: chunk.text,
    type: 'document_chunk',
    metadata: { document: 'ml-guide.pdf', page: 1 }
  });
}

// Add relationships between chunks
await graph.addEdge({
  id: 'edge-1-2',
  source: 'doc1-chunk1',
  target: 'doc1-chunk2',
  type: 'follows',
  weight: 1.0
});

// Query the graph
const results = await graph.findSimilar('What are neural networks?', {
  limit: 3,
  minScore: 0.6
});

results.forEach(result => {
  console.log(`${result.score.toFixed(2)}: ${result.node.content}`);
});
```

### Concept Mapping

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const graph = new KnowledgeGraph();

// Add concepts
await graph.addNode({
  id: 'ml',
  content: 'Machine Learning',
  type: 'concept'
});

await graph.addNode({
  id: 'dl',
  content: 'Deep Learning',
  type: 'concept'
});

await graph.addNode({
  id: 'ai',
  content: 'Artificial Intelligence',
  type: 'concept'
});

// Define relationships
await graph.addEdge({
  id: 'ml-subset-of-ai',
  source: 'ml',
  target: 'ai',
  type: 'subset_of'
});

await graph.addEdge({
  id: 'dl-subset-of-ml',
  source: 'dl',
  target: 'ml',
  type: 'subset_of'
});

// Traverse the concept hierarchy
const related = await graph.traverse('dl', {
  maxDepth: 2,
  edgeFilter: (edge) => edge.type === 'subset_of'
});

console.log('Deep Learning is related to:', related.map(n => n.content));
// Output: ['Machine Learning', 'Artificial Intelligence']
```

---

## Performance Considerations

### Vector Store Size

- Each embedding is ~4KB (1024 dimensions × 4 bytes)
- 1M nodes ≈ 4GB memory
- LanceDB uses memory-mapped files for efficient large-scale storage

### Query Performance

- `findSimilar()`: O(n) where n = total nodes (uses ANN search internally)
- `getNode()`: O(1) hash lookup
- `traverse()`: O(d × b) where d = max depth, b = average branching factor

### Optimization Tips

1. **Batch Operations:** Add multiple nodes before querying
2. **Limit Results:** Use `limit` parameter to restrict result size
3. **Filter Early:** Use `type` and `metadata` filters to narrow searches
4. **Cache Embeddings:** Pre-compute embeddings when possible

---

## Error Handling

All async methods throw errors for invalid inputs or system failures:

```typescript
try {
  await graph.addNode({
    id: 'node-1',
    content: 'Example content'
  });
} catch (error) {
  if (error.message.includes('already exists')) {
    // Handle duplicate ID
  } else if (error.message.includes('embedding failed')) {
    // Handle embedding generation failure
  } else {
    // Handle other errors
    throw error;
  }
}
```

---

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.

---

## Support

- [Documentation](https://docs.openclaw.pro)
- [GitHub Issues](https://github.com/wjlgatech/openclaw-pro-public/issues)
- [Community Slack](https://slack.openclaw.pro)
