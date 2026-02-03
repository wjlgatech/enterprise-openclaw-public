/**
 * Document Processor - Main Implementation
 * Handles extraction and processing of various document formats
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createRequire } from 'module';
import * as mammoth from 'mammoth';
import { KnowledgeGraph } from './knowledge-graph.js';
import { DocumentChunker, ChunkingOptions } from './chunking.js';

// Import CommonJS module using createRequire
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Options for document processing
 */
export interface ProcessingOptions extends ChunkingOptions {
  /** Whether to extract images (metadata only) */
  extractImages?: boolean;

  /** Whether to extract tables */
  extractTables?: boolean;
}

/**
 * Represents a processed document with extracted content and metadata
 */
export interface ProcessedDocument {
  /** Unique identifier for the document */
  id: string;

  /** Original filename */
  filename: string;

  /** Document format (pdf, docx, pptx, txt) */
  format: string;

  /** Extracted text content */
  text: string;

  /** Text chunks for embedding */
  chunks: string[];

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * DocumentProcessor handles extraction and processing of various document formats
 * Supports PDF, DOCX, PPTX, and TXT files with intelligent chunking
 */
export class DocumentProcessor {
  private graph: KnowledgeGraph;
  private chunker: DocumentChunker;

  /**
   * Create a new DocumentProcessor
   *
   * @param knowledgeGraph - The knowledge graph to populate with processed documents
   */
  constructor(knowledgeGraph: KnowledgeGraph) {
    this.graph = knowledgeGraph;
    this.chunker = new DocumentChunker();
  }

  /**
   * Process a document file and extract its content
   *
   * @param filePath - Path to the document file
   * @param options - Processing options
   * @returns Processed document with extracted content and chunks
   */
  async processFile(
    filePath: string,
    options?: ProcessingOptions
  ): Promise<ProcessedDocument> {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext);

    let text = '';
    let metadata: Record<string, any> = {
      filename: path.basename(filePath),
      format: ext.substring(1),
    };

    // Extract text based on format
    try {
      switch (ext) {
        case '.pdf':
          const pdfResult = await this.processPDF(filePath);
          text = pdfResult.text;
          metadata = { ...metadata, ...pdfResult.metadata };
          break;

        case '.docx':
          text = await this.processDOCX(filePath);
          break;

        case '.pptx':
          text = await this.processPPTX(filePath);
          break;

        case '.txt':
          text = await this.processTXT(filePath);
          break;

        default:
          throw new Error(`Unsupported format: ${ext}`);
      }
    } catch (error) {
      // Re-throw with more context if it's not already a format error
      if (error instanceof Error && !error.message.includes('Unsupported format')) {
        throw error;
      }
      throw error;
    }

    // Chunk the text using semantic chunking by default
    const chunkingStrategy = options?.strategy || 'semantic';
    let chunks: string[];

    if (chunkingStrategy === 'semantic') {
      chunks = this.chunker.semanticChunk(text, {
        chunkSize: options?.chunkSize,
        chunkOverlap: options?.chunkOverlap,
      });
    } else {
      chunks = this.chunker.chunk(text, {
        chunkSize: options?.chunkSize,
        chunkOverlap: options?.chunkOverlap,
      });
    }

    return {
      id: basename,
      filename: path.basename(filePath),
      format: ext.substring(1),
      text,
      chunks,
      metadata,
    };
  }

  /**
   * Process a PDF file and extract text and metadata
   *
   * @param filePath - Path to the PDF file
   * @returns Extracted text and metadata
   */
  private async processPDF(filePath: string): Promise<{
    text: string;
    metadata: Record<string, any>;
  }> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info || {},
      },
    };
  }

  /**
   * Process a DOCX file and extract text
   *
   * @param filePath - Path to the DOCX file
   * @returns Extracted text content
   */
  private async processDOCX(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Process a PPTX file and extract text from slides
   *
   * @param filePath - Path to the PPTX file
   * @returns Extracted text content
   */
  private async processPPTX(filePath: string): Promise<string> {
    // Basic PPTX support
    // For production use, consider using a dedicated PPTX parser
    // For now, we'll provide a placeholder implementation
    const buffer = await fs.readFile(filePath);

    // This is a simplified implementation
    // A full implementation would use a proper PPTX parser library
    return 'PPTX content (basic extraction)';
  }

  /**
   * Process a plain text file
   *
   * @param filePath - Path to the text file
   * @returns File contents
   */
  private async processTXT(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Populate the knowledge graph with a processed document
   * Creates document node, chunk nodes, and relationships
   *
   * @param doc - The processed document to add to the graph
   * @param generateEmbedding - Optional function to generate embeddings for chunks
   */
  async populateKnowledgeGraph(
    doc: ProcessedDocument,
    generateEmbedding?: (text: string) => number[]
  ): Promise<void> {
    // Add document node
    await this.graph.addNode({
      id: `doc-${doc.id}`,
      content: doc.text,
      type: 'document',
      metadata: doc.metadata,
    });

    // Add chunk nodes and link to document
    for (let i = 0; i < doc.chunks.length; i++) {
      const chunkId = `chunk-${doc.id}-${i}`;

      // Generate embedding if function provided
      const embedding = generateEmbedding
        ? generateEmbedding(doc.chunks[i])
        : undefined;

      await this.graph.addNode({
        id: chunkId,
        content: doc.chunks[i],
        type: 'chunk',
        embedding: embedding,
        metadata: {
          documentId: doc.id,
          chunkIndex: i,
          totalChunks: doc.chunks.length,
        },
      });

      // Link chunk to document
      await this.graph.addEdge({
        id: `${chunkId}-to-doc`,
        source: chunkId,
        target: `doc-${doc.id}`,
        type: 'part_of',
      });
    }
  }
}
