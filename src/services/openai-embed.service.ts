import OpenAI from 'openai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';
import type { AIEmbedProvider, EmbeddingResult } from './ai-provider';

export class OpenAIEmbedService implements AIEmbedProvider {
  private client: OpenAI;
  private readonly model: string;
  private readonly EMBEDDING_DIMENSIONS = 1024;
  private readonly MAX_BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per request

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
    this.client = new OpenAI({ apiKey });
    // text-embedding-3-small supports dimensions param; falls back to 1536 if model doesn't support it
    this.model = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
  }

  async embed(text: string): Promise<number[]> {
    try {
      const result = await withRetry(
        async () => {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: text,
            dimensions: this.EMBEDDING_DIMENSIONS,
          });
          const embedding = response.data[0]?.embedding;
          if (!embedding) throw new ExternalServiceError('OpenAI Embed', 'No embedding generated');
          return embedding;
        },
        { maxAttempts: 3, initialDelayMs: 1000, backoffMultiplier: 2, shouldRetry: isRetryable }
      );
      return result;
    } catch (error: any) {
      logger.error('OpenAI embedding failed', { error: error.message });
      throw error instanceof ExternalServiceError
        ? error
        : new ExternalServiceError('OpenAI Embed', error.message);
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += this.MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + this.MAX_BATCH_SIZE);
      logger.info('Processing OpenAI embedding batch', {
        batch: Math.floor(i / this.MAX_BATCH_SIZE) + 1,
        size: batch.length,
      });
      const batchResults = await withRetry(
        async () => {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: batch,
            dimensions: this.EMBEDDING_DIMENSIONS,
          });
          return batch.map((text, idx) => ({
            text,
            embedding: response.data[idx].embedding,
          }));
        },
        { maxAttempts: 3, initialDelayMs: 1000, backoffMultiplier: 2, shouldRetry: isRetryable }
      );
      results.push(...batchResults);
    }
    return results;
  }

  getEmbeddingDimensions(): number {
    return this.EMBEDDING_DIMENSIONS;
  }
}

function isRetryable(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  return [429, 500, 502, 503, 504].includes(status);
}

export const openAIEmbedService = new OpenAIEmbedService();
