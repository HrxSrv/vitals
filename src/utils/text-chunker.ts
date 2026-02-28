/**
 * Text Chunking Utility
 * 
 * Splits OCR markdown text into chunks of maximum token size while preserving context.
 * Used for generating embeddings from report content.
 * 
 * Requirements: 10.1
 */

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
}

export interface ChunkingOptions {
  /**
   * Maximum tokens per chunk
   * Default: 500
   */
  maxTokens?: number;

  /**
   * Overlap tokens between chunks to preserve context
   * Default: 50
   */
  overlapTokens?: number;

  /**
   * Token estimator function
   * Default: rough estimate (1 token ≈ 4 characters)
   */
  tokenEstimator?: (text: string) => number;
}

/**
 * Default token estimator using character-based approximation
 * Rough estimate: 1 token ≈ 4 characters for English text
 */
export function defaultTokenEstimator(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks at natural boundaries (paragraphs, sentences)
 */
function splitAtBoundaries(text: string, maxChars: number = 2000): string[] {
  // First try to split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  
  const segments: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) continue;
    
    // If paragraph is long, split by sentences
    if (paragraph.length > maxChars) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      // If sentences are still too long, split by character limit
      for (const sentence of sentences) {
        if (sentence.trim().length === 0) continue;
        
        if (sentence.length > maxChars) {
          // Split long sentence into smaller chunks
          for (let i = 0; i < sentence.length; i += maxChars) {
            segments.push(sentence.slice(i, i + maxChars));
          }
        } else {
          segments.push(sentence);
        }
      }
    } else {
      segments.push(paragraph);
    }
  }
  
  return segments;
}

/**
 * Chunk text into segments of maximum token size
 * 
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    maxTokens = 500,
    overlapTokens = 50,
    tokenEstimator = defaultTokenEstimator,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const maxCharsPerSegment = maxTokens * 4; // Rough estimate for splitting
  const segments = splitAtBoundaries(text, maxCharsPerSegment);
  
  let currentChunk = '';
  let currentStartIndex = 0;
  let absolutePosition = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const separator = currentChunk.length > 0 ? '\n\n' : '';
    const segmentWithSeparator = separator + segment;
    
    // Check if adding this segment would exceed max tokens
    const potentialChunk = currentChunk + segmentWithSeparator;
    const potentialTokens = tokenEstimator(potentialChunk);
    
    if (potentialTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      const chunkTokens = tokenEstimator(currentChunk);
      chunks.push({
        text: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
        tokenCount: chunkTokens,
      });
      
      absolutePosition += currentChunk.length;
      
      // Start new chunk with optional overlap
      if (overlapTokens > 0) {
        // Calculate overlap text from end of previous chunk
        const overlapChars = Math.min(overlapTokens * 4, currentChunk.length);
        const overlapText = currentChunk.slice(-overlapChars).trim();
        
        // Only add overlap if it doesn't make the new chunk too large
        const testChunk = overlapText + '\n\n' + segment;
        if (tokenEstimator(testChunk) <= maxTokens) {
          currentChunk = testChunk;
          currentStartIndex = absolutePosition - overlapChars;
        } else {
          currentChunk = segment;
          currentStartIndex = absolutePosition;
        }
      } else {
        currentChunk = segment;
        currentStartIndex = absolutePosition;
      }
    } else {
      // Add segment to current chunk
      currentChunk = potentialChunk;
    }
  }
  
  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    const chunkTokens = tokenEstimator(currentChunk);
    chunks.push({
      text: currentChunk.trim(),
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + currentChunk.length,
      tokenCount: chunkTokens,
    });
  }
  
  return chunks;
}

/**
 * Chunk text and return only the text strings (simplified interface)
 */
export function chunkTextSimple(
  text: string,
  maxTokens: number = 500
): string[] {
  return chunkText(text, { maxTokens }).map(chunk => chunk.text);
}
