/**
 * Knowledge Graph System
 *
 * A production-ready knowledge graph with vector search capabilities.
 *
 * @module knowledge-system
 */

export { KnowledgeGraph } from './knowledge-graph.js';
export { VectorStore } from './vector-store.js';
export { BasicRAG } from './rag-modes/basic-rag.js';
export { DocumentProcessor } from './document-processor.js';
export { DocumentChunker } from './chunking.js';
export type {
  GraphNode,
  GraphEdge,
  TraversalOptions,
  NodeQuery,
  EdgeQuery,
  NeighborDirection,
  SimilarityResult
} from './types.js';
export type {
  BasicRAGConfig,
  SimilaritySearchResult,
  RetrievalMetrics
} from './rag-modes/basic-rag.js';
export type {
  ProcessingOptions,
  ProcessedDocument
} from './document-processor.js';
export type {
  ChunkingOptions
} from './chunking.js';
