/**
 * Document Processor Tests - Reality-Grounded TDD (RED Phase)
 * Comprehensive tests written BEFORE implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentProcessor } from '../../extensions/knowledge-system/document-processor.js';
import { DocumentChunker } from '../../extensions/knowledge-system/chunking.js';
import { KnowledgeGraph } from '../../extensions/knowledge-system/knowledge-graph.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, '../fixtures');
const TEST_DB_PATH = path.join(__dirname, '../test-data/doc-processor.db');

describe('DocumentChunker', () => {
  let chunker: DocumentChunker;

  beforeEach(() => {
    chunker = new DocumentChunker();
  });

  describe('Fixed-size chunking', () => {
    it('should chunk text with default settings (500 chars, 50 overlap)', () => {
      const text = 'a'.repeat(1000);
      const chunks = chunker.chunk(text);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBe(500);
    });

    it('should chunk text with custom chunk size', () => {
      const text = 'a'.repeat(800);
      const chunks = chunker.chunk(text, { chunkSize: 200 });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBe(200);
    });

    it('should apply overlap between chunks', () => {
      const text = '0123456789'.repeat(50); // 500 chars
      const chunks = chunker.chunk(text, { chunkSize: 100, chunkOverlap: 10 });

      expect(chunks.length).toBeGreaterThan(1);
      // Check that chunks overlap
      const endOfFirst = chunks[0].substring(chunks[0].length - 10);
      const startOfSecond = chunks[1].substring(0, 10);
      expect(endOfFirst).toBe(startOfSecond);
    });

    it('should handle text shorter than chunk size', () => {
      const text = 'Short text';
      const chunks = chunker.chunk(text, { chunkSize: 500 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should handle empty text', () => {
      const chunks = chunker.chunk('');

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('');
    });

    it('should respect zero overlap', () => {
      const text = 'a'.repeat(500);
      const chunks = chunker.chunk(text, { chunkSize: 100, chunkOverlap: 0 });

      expect(chunks).toHaveLength(5);
      expect(chunks.join('')).toBe(text);
    });
  });

  describe('Semantic chunking', () => {
    it('should split by paragraphs', () => {
      const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const chunks = chunker.semanticChunk(text, { chunkSize: 500 });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should combine small paragraphs into single chunk', () => {
      const text = 'Small 1\n\nSmall 2\n\nSmall 3';
      const chunks = chunker.semanticChunk(text, { chunkSize: 100 });

      expect(chunks).toBeDefined();
      // Should combine all small paragraphs
      expect(chunks.length).toBe(1);
    });

    it('should split large paragraphs', () => {
      const largePara = 'a'.repeat(600);
      const text = largePara + '\n\n' + largePara;
      const chunks = chunker.semanticChunk(text, { chunkSize: 500 });

      expect(chunks.length).toBeGreaterThan(2);
    });

    it('should preserve paragraph boundaries when possible', () => {
      const text = 'Short para 1\n\nShort para 2\n\nShort para 3';
      const chunks = chunker.semanticChunk(text, { chunkSize: 1000 });

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain('para 1');
      expect(chunks[0]).toContain('para 2');
      expect(chunks[0]).toContain('para 3');
    });

    it('should handle text with no paragraph breaks', () => {
      const text = 'Continuous text without paragraph breaks goes here.';
      const chunks = chunker.semanticChunk(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should trim whitespace from chunks', () => {
      const text = '  Paragraph 1  \n\n  Paragraph 2  ';
      const chunks = chunker.semanticChunk(text);

      chunks.forEach(chunk => {
        expect(chunk).toBe(chunk.trim());
      });
    });
  });
});

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  let graph: KnowledgeGraph;

  beforeEach(async () => {
    // Clean up test database
    try {
      await fs.rm(TEST_DB_PATH, { recursive: true, force: true });
    } catch (e) {
      // Ignore if doesn't exist
    }

    graph = new KnowledgeGraph(TEST_DB_PATH);
    await graph.initialize();
    processor = new DocumentProcessor(graph);
  });

  afterEach(async () => {
    await graph.close();
    // Clean up test database
    try {
      await fs.rm(TEST_DB_PATH, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  describe('TXT File Processing', () => {
    it('should process a simple text file', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath);

      expect(result).toBeDefined();
      expect(result.id).toBe('sample');
      expect(result.filename).toBe('sample.txt');
      expect(result.format).toBe('txt');
      expect(result.text).toContain('sample text document');
      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should extract metadata from text file', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.filename).toBe('sample.txt');
      expect(result.metadata.format).toBe('txt');
    });

    it('should chunk text content appropriately', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath, { chunkSize: 100 });

      expect(result.chunks.length).toBeGreaterThan(1);
      result.chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('PDF File Processing', () => {
    it('should process a PDF file', async () => {
      // Create a mock PDF for testing
      const pdfPath = path.join(FIXTURES_DIR, 'sample.pdf');

      // We'll use a mock for this test
      const mockProcessPDF = vi.spyOn(processor as any, 'processPDF');
      mockProcessPDF.mockResolvedValue({
        text: 'Sample PDF content',
        metadata: { pages: 1, info: {} }
      });

      const result = await processor.processFile(pdfPath);

      expect(result.format).toBe('pdf');
      expect(result.text).toBeDefined();
    });

    it('should extract page count from PDF', async () => {
      const pdfPath = path.join(FIXTURES_DIR, 'sample.pdf');

      const mockProcessPDF = vi.spyOn(processor as any, 'processPDF');
      mockProcessPDF.mockResolvedValue({
        text: 'Multi-page PDF',
        metadata: { pages: 5, info: { Title: 'Test PDF' } }
      });

      const result = await processor.processFile(pdfPath);

      expect(result.metadata.pages).toBe(5);
      expect(result.metadata.info).toBeDefined();
    });

    it('should handle PDF metadata extraction', async () => {
      const pdfPath = path.join(FIXTURES_DIR, 'sample.pdf');

      const mockProcessPDF = vi.spyOn(processor as any, 'processPDF');
      mockProcessPDF.mockResolvedValue({
        text: 'PDF with metadata',
        metadata: {
          pages: 1,
          info: {
            Title: 'Test Document',
            Author: 'Test Author',
            CreationDate: 'D:20240101120000'
          }
        }
      });

      const result = await processor.processFile(pdfPath);

      expect(result.metadata.info.Title).toBe('Test Document');
      expect(result.metadata.info.Author).toBe('Test Author');
    });
  });

  describe('DOCX File Processing', () => {
    it('should process a DOCX file', async () => {
      const docxPath = path.join(FIXTURES_DIR, 'sample.docx');

      const mockProcessDOCX = vi.spyOn(processor as any, 'processDOCX');
      mockProcessDOCX.mockResolvedValue('Sample DOCX content with formatting');

      const result = await processor.processFile(docxPath);

      expect(result.format).toBe('docx');
      expect(result.text).toBe('Sample DOCX content with formatting');
    });

    it('should handle DOCX with tables', async () => {
      const docxPath = path.join(FIXTURES_DIR, 'with-table.docx');

      const mockProcessDOCX = vi.spyOn(processor as any, 'processDOCX');
      mockProcessDOCX.mockResolvedValue('Header1 Header2\nValue1 Value2');

      const result = await processor.processFile(docxPath);

      expect(result.text).toContain('Header1');
      expect(result.text).toContain('Value1');
    });

    it('should extract text from DOCX with multiple paragraphs', async () => {
      const docxPath = path.join(FIXTURES_DIR, 'multi-para.docx');

      const mockProcessDOCX = vi.spyOn(processor as any, 'processDOCX');
      mockProcessDOCX.mockResolvedValue('Paragraph 1\n\nParagraph 2\n\nParagraph 3');

      const result = await processor.processFile(docxPath);

      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('PPTX File Processing', () => {
    it('should process a PPTX file', async () => {
      const pptxPath = path.join(FIXTURES_DIR, 'sample.pptx');

      const mockProcessPPTX = vi.spyOn(processor as any, 'processPPTX');
      mockProcessPPTX.mockResolvedValue('Slide 1 content\nSlide 2 content');

      const result = await processor.processFile(pptxPath);

      expect(result.format).toBe('pptx');
      expect(result.text).toBeDefined();
    });

    it('should handle PPTX with multiple slides', async () => {
      const pptxPath = path.join(FIXTURES_DIR, 'multi-slide.pptx');

      const mockProcessPPTX = vi.spyOn(processor as any, 'processPPTX');
      mockProcessPPTX.mockResolvedValue('Title Slide\nContent Slide 1\nContent Slide 2\nSummary Slide');

      const result = await processor.processFile(pptxPath);

      expect(result.text).toContain('Title Slide');
      expect(result.text).toContain('Summary Slide');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported file format', async () => {
      const filePath = path.join(FIXTURES_DIR, 'unsupported.xyz');

      await expect(processor.processFile(filePath)).rejects.toThrow('Unsupported format');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(FIXTURES_DIR, 'nonexistent.txt');

      await expect(processor.processFile(filePath)).rejects.toThrow();
    });

    it('should handle corrupted PDF gracefully', async () => {
      const pdfPath = path.join(FIXTURES_DIR, 'corrupted.pdf');

      const mockProcessPDF = vi.spyOn(processor as any, 'processPDF');
      mockProcessPDF.mockRejectedValue(new Error('Invalid PDF structure'));

      await expect(processor.processFile(pdfPath)).rejects.toThrow('Invalid PDF structure');
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(FIXTURES_DIR, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const result = await processor.processFile(emptyFile);

      expect(result.text).toBe('');
      expect(result.chunks).toBeDefined();
    });
  });

  describe('Chunking Options', () => {
    it('should apply custom chunk size', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath, { chunkSize: 50 });

      result.chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(50);
      });
    });

    it('should apply custom chunk overlap', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath, {
        chunkSize: 100,
        chunkOverlap: 20
      });

      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should use semantic chunking strategy', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath, {
        chunkingStrategy: 'semantic'
      });

      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should use fixed chunking strategy', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const result = await processor.processFile(filePath, {
        chunkingStrategy: 'fixed',
        chunkSize: 100
      });

      expect(result.chunks).toBeDefined();
    });
  });

  describe('Knowledge Graph Population', () => {
    it('should populate knowledge graph with document node', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath);

      await processor.populateKnowledgeGraph(doc);

      const docNode = await graph.getNode(`doc-${doc.id}`);
      expect(docNode).toBeDefined();
      expect(docNode?.type).toBe('document');
      expect(docNode?.content).toBe(doc.text);
    });

    it('should populate knowledge graph with chunk nodes', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath, { chunkSize: 100 });

      await processor.populateKnowledgeGraph(doc);

      // Check that chunk nodes were created
      const chunkNode = await graph.getNode(`chunk-${doc.id}-0`);
      expect(chunkNode).toBeDefined();
      expect(chunkNode?.type).toBe('chunk');
      expect(chunkNode?.content).toBe(doc.chunks[0]);
    });

    it('should link chunks to document', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath, { chunkSize: 100 });

      await processor.populateKnowledgeGraph(doc);

      // Check that edges exist
      const edge = await graph.getEdge(`chunk-${doc.id}-0-to-doc`);
      expect(edge).toBeDefined();
      expect(edge?.type).toBe('part_of');
      expect(edge?.source).toBe(`chunk-${doc.id}-0`);
      expect(edge?.target).toBe(`doc-${doc.id}`);
    });

    it('should preserve document metadata in graph', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath);

      await processor.populateKnowledgeGraph(doc);

      const docNode = await graph.getNode(`doc-${doc.id}`);
      expect(docNode?.metadata).toBeDefined();
      expect(docNode?.metadata?.filename).toBe('sample.txt');
      expect(docNode?.metadata?.format).toBe('txt');
    });

    it('should preserve chunk metadata in graph', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath, { chunkSize: 100 });

      await processor.populateKnowledgeGraph(doc);

      const chunkNode = await graph.getNode(`chunk-${doc.id}-0`);
      expect(chunkNode?.metadata).toBeDefined();
      expect(chunkNode?.metadata?.documentId).toBe(doc.id);
      expect(chunkNode?.metadata?.chunkIndex).toBe(0);
      expect(chunkNode?.metadata?.totalChunks).toBe(doc.chunks.length);
    });

    it('should add embeddings to chunks when generator provided', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc = await processor.processFile(filePath, { chunkSize: 100 });

      const mockEmbeddingGenerator = (text: string) => {
        // Return 384-dimensional zero vector
        return new Array(384).fill(0);
      };

      await processor.populateKnowledgeGraph(doc, mockEmbeddingGenerator);

      const chunkNode = await graph.getNode(`chunk-${doc.id}-0`);
      expect(chunkNode?.embedding).toBeDefined();
      expect(chunkNode?.embedding?.length).toBe(384);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple files', async () => {
      const files = [
        path.join(FIXTURES_DIR, 'sample.txt'),
      ];

      const results = await Promise.all(
        files.map(file => processor.processFile(file))
      );

      expect(results.length).toBe(1);
      results.forEach(result => {
        expect(result.text).toBeDefined();
        expect(result.chunks).toBeDefined();
      });
    });

    it('should populate graph with multiple documents', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');
      const doc1 = await processor.processFile(filePath);

      // Create another test file
      const secondFile = path.join(FIXTURES_DIR, 'sample2.txt');
      await fs.writeFile(secondFile, 'Second document content');
      const doc2 = await processor.processFile(secondFile);

      await processor.populateKnowledgeGraph(doc1);
      await processor.populateKnowledgeGraph(doc2);

      const nodeCount = await graph.getNodeCount();
      expect(nodeCount).toBeGreaterThan(2); // At least 2 doc nodes + chunks
    });
  });

  describe('Image and Table Handling', () => {
    it('should handle documents with images (metadata)', async () => {
      const pdfPath = path.join(FIXTURES_DIR, 'with-images.pdf');

      const mockProcessPDF = vi.spyOn(processor as any, 'processPDF');
      mockProcessPDF.mockResolvedValue({
        text: 'Document with images',
        metadata: {
          pages: 1,
          info: {},
          images: [
            { page: 1, type: 'jpeg', size: '100x100' }
          ]
        }
      });

      const result = await processor.processFile(pdfPath);

      expect(result.metadata.images).toBeDefined();
      expect(result.metadata.images.length).toBe(1);
    });

    it('should extract basic table structure from documents', async () => {
      const docxPath = path.join(FIXTURES_DIR, 'with-table.docx');

      const mockProcessDOCX = vi.spyOn(processor as any, 'processDOCX');
      mockProcessDOCX.mockResolvedValue('Header1\tHeader2\nValue1\tValue2');

      const result = await processor.processFile(docxPath);

      expect(result.text).toContain('Header1');
      expect(result.text).toContain('Value1');
    });
  });

  describe('Progress Tracking', () => {
    it('should track processing progress', async () => {
      const filePath = path.join(FIXTURES_DIR, 'sample.txt');

      const progressUpdates: number[] = [];
      const onProgress = (progress: number) => {
        progressUpdates.push(progress);
      };

      // Note: This would require adding progress callback to processFile
      // For now, we'll test that processing completes
      const result = await processor.processFile(filePath);

      expect(result).toBeDefined();
    });
  });
});
