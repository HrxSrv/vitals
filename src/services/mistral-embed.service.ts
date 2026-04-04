import { Mistral } from '@mistralai/mistralai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

export class MistralEmbedService {
  private client: Mistral;
  private readonly EMBED_MODEL = 'mistral-embed';
  private readonly EMBEDDING_DIMENSIONS = 1024;
  private readonly MAX_BATCH_SIZE = 16; // Mistral API batch limit

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    this.client = new Mistral({
      apiKey,
    });
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding vector (1024 dimensions)
   */
  async embed(text: string): Promise<number[]> {
    try {
      logger.info('Generating single embedding', {
        textLength: text.length,
      });

      const result = await withRetry(
        async () => {
          const response = await this.client.embeddings.create({
            model: this.EMBED_MODEL,
            inputs: [text],
          });

          const embedding = response.data?.[0]?.embedding;

          if (!embedding || !Array.isArray(embedding)) {
            throw new ExternalServiceError('Mistral Embed', 'No embedding generated');
          }

          if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
            throw new ExternalServiceError(
              'Mistral Embed',
              `Expected ${this.EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
            );
          }

          return embedding;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          shouldRetry: (error: any) => {
            const statusCode = error?.response?.status;
            const shouldRetry =
              statusCode === 429 || // Rate limit
              statusCode === 500 || // Server error
              statusCode === 502 || // Bad gateway
              statusCode === 503 || // Service unavailable
              statusCode === 504; // Gateway timeout

            if (shouldRetry) {
              logger.warn('Retrying embedding request', {
                statusCode,
                error: error.message,
              });
            }

            return shouldRetry;
          },
        }
      );

      logger.info('Embedding generated successfully', {
        dimensions: result.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Embedding generation failed', {
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Mistral Embed',
        error.message || 'Failed to generate embedding'
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param texts - Array of texts to embed
   * @returns Array of embedding results
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      logger.info('Generating batch embeddings', {
        totalTexts: texts.length,
        batchSize: this.MAX_BATCH_SIZE,
      });

      const results: EmbeddingResult[] = [];

      // Process in batches to respect API limits
      for (let i = 0; i < texts.length; i += this.MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + this.MAX_BATCH_SIZE);
        const batchNumber = Math.floor(i / this.MAX_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(texts.length / this.MAX_BATCH_SIZE);

        logger.info('Processing embedding batch', {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
        });

        const batchResults = await this.processBatch(batch);
        results.push(...batchResults);

        // Add small delay between batches to avoid rate limiting
        if (i + this.MAX_BATCH_SIZE < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      logger.info('Batch embeddings completed', {
        totalEmbeddings: results.length,
      });

      return results;
    } catch (error: any) {
      logger.error('Batch embedding failed', {
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Mistral Embed',
        error.message || 'Failed to generate batch embeddings'
      );
    }
  }

  /**
   * Process a single batch of texts
   * @param texts - Batch of texts to embed
   * @returns Array of embedding results for the batch
   */
  private async processBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return withRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model: this.EMBED_MODEL,
          inputs: texts,
        });

        if (!response.data || response.data.length !== texts.length) {
          throw new ExternalServiceError('Mistral Embed', 'Batch embedding count mismatch');
        }

        return texts.map((text, index) => {
          const embedding = response.data[index].embedding;

          if (!embedding || !Array.isArray(embedding)) {
            throw new ExternalServiceError(
              'Mistral Embed',
              `No embedding for text at index ${index}`
            );
          }

          if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
            throw new ExternalServiceError(
              'Mistral Embed',
              `Expected ${this.EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length} at index ${index}`
            );
          }

          return {
            text,
            embedding,
          };
        });
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        shouldRetry: (error: any) => {
          const statusCode = error?.response?.status;
          return (
            statusCode === 429 ||
            statusCode === 500 ||
            statusCode === 502 ||
            statusCode === 503 ||
            statusCode === 504
          );
        },
      }
    );
  }

  /**
   * Chunk text into segments suitable for embedding
   * @param text - Text to chunk
   * @param maxTokens - Maximum tokens per chunk (default: 500)
   * @returns Array of text chunks
   */
  chunkText(text: string, maxTokens: number = 500): string[] {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    const chunks: string[] = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If single paragraph exceeds max, split by sentences
      if (paragraph.length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChars) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }
      } else {
        // Add paragraph to current chunk if it fits
        if (currentChunk.length + paragraph.length + 2 > maxChars) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    logger.info('Text chunked for embedding', {
      originalLength: text.length,
      chunks: chunks.length,
      avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length),
    });

    return chunks;
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Health check for Mistral Embed service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.embed('test');
      return true;
    } catch (error) {
      logger.error('Mistral Embed health check failed', { error });
      return false;
    }
  }

  /**
   * Get embedding dimensions
   */
  getEmbeddingDimensions(): number {
    return this.EMBEDDING_DIMENSIONS;
  }
}

// Export singleton instance
export const mistralEmbedService = new MistralEmbedService();
