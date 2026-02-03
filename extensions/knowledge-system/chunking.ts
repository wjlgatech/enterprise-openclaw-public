/**
 * Document Chunking Module
 * Provides various text chunking strategies for document processing
 */

/**
 * Options for configuring text chunking
 */
export interface ChunkingOptions {
  /** Size of each chunk in characters (default: 500) */
  chunkSize?: number;

  /** Overlap between consecutive chunks in characters (default: 50) */
  chunkOverlap?: number;

  /** Chunking strategy to use (default: 'semantic') */
  strategy?: 'fixed' | 'semantic';
}

/**
 * DocumentChunker provides text chunking functionality
 * with support for fixed-size and semantic chunking strategies
 */
export class DocumentChunker {
  /**
   * Chunk text using fixed-size strategy with overlap
   *
   * @param text - The text to chunk
   * @param options - Chunking configuration options
   * @returns Array of text chunks
   */
  chunk(text: string, options?: ChunkingOptions): string[] {
    const size = options?.chunkSize ?? 500;
    const overlap = options?.chunkOverlap ?? 50;
    const chunks: string[] = [];

    if (text.length === 0) {
      return [''];
    }

    if (text.length <= size) {
      return [text];
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      chunks.push(text.substring(start, end));

      if (end === text.length) {
        break;
      }

      // Move forward by chunk size minus overlap
      // If overlap is 0, move by full chunk size
      const step = overlap === 0 ? size : size - overlap;
      start += step;
    }

    return chunks;
  }

  /**
   * Chunk text using semantic strategy (paragraph-based)
   * Attempts to preserve paragraph boundaries for better context
   *
   * @param text - The text to chunk
   * @param options - Chunking configuration options
   * @returns Array of text chunks
   */
  semanticChunk(text: string, options?: ChunkingOptions): string[] {
    const maxSize = options?.chunkSize ?? 500;

    // Split by paragraph breaks (double newline or more)
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();

      if (!trimmedPara) {
        continue;
      }

      // If adding this paragraph would exceed max size
      if (currentChunk.length + trimmedPara.length > maxSize) {
        // If we have accumulated content, save it as a chunk
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If the paragraph itself is larger than maxSize, we need to split it
        if (trimmedPara.length > maxSize) {
          // Fall back to fixed-size chunking for large paragraphs
          const paraChunks = this.chunk(trimmedPara, { chunkSize: maxSize, chunkOverlap: 0 });
          chunks.push(...paraChunks.map(c => c.trim()));
        } else {
          // Start new chunk with this paragraph
          currentChunk = trimmedPara;
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk) {
          currentChunk += '\n\n' + trimmedPara;
        } else {
          currentChunk = trimmedPara;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    // Handle edge case of no chunks (empty or whitespace-only text)
    if (chunks.length === 0 && text.length > 0) {
      chunks.push(text.trim());
    }

    return chunks;
  }
}
