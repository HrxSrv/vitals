import { Job } from 'bullmq';
import { createWorker, GenerateEmbeddingsJobData } from '../lib/queue';
import { reportRepository } from '../repositories/report.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { mistralEmbedService } from '../services/mistral-embed.service';
import { chunkText } from '../utils/text-chunker';
import { logger } from '../utils/logger';

/**
 * Generate Embeddings Worker
 * 
 * Generates vector embeddings for report OCR content to enable RAG-powered Q&A
 * 
 * Pipeline:
 * 1. Fetch report OCR markdown
 * 2. Chunk text into segments (max 500 tokens)
 * 3. Generate embeddings using Mistral Embed API
 * 4. Store embeddings with profile and report associations
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

async function generateEmbeddingsJob(job: Job<GenerateEmbeddingsJobData>): Promise<void> {
  const { reportId, userId, profileId } = job.data;

  logger.info('Starting embeddings generation', { reportId, userId, profileId });

  try {
    // Step 1: Fetch report from database
    await job.updateProgress(10);
    const report = await reportRepository.findById(reportId);
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    if (!report.rawOcrMarkdown) {
      logger.warn('Report has no OCR markdown, skipping embeddings generation', {
        reportId,
      });
      return;
    }

    logger.info('Report fetched for embeddings generation', {
      reportId,
      markdownLength: report.rawOcrMarkdown.length,
    });
    await job.updateProgress(20);

    // Step 2: Chunk text into segments
    const chunks = chunkText(report.rawOcrMarkdown, {
      maxTokens: 500,
      overlapTokens: 50,
    });

    if (chunks.length === 0) {
      logger.warn('No chunks generated from OCR markdown', { reportId });
      return;
    }

    logger.info('Text chunked for embeddings', {
      reportId,
      chunkCount: chunks.length,
      avgTokens: Math.round(
        chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length
      ),
    });
    await job.updateProgress(40);

    // Step 3: Generate embeddings using Mistral Embed API
    const chunkTexts = chunks.map(c => c.text);
    const embeddingResults = await mistralEmbedService.embedBatch(chunkTexts);

    logger.info('Embeddings generated', {
      reportId,
      embeddingCount: embeddingResults.length,
    });
    await job.updateProgress(70);

    // Step 4: Store embeddings in database
    const embeddingsToCreate = embeddingResults.map((result) => ({
      reportId,
      userId,
      profileId,
      chunkText: result.text,
      embedding: result.embedding,
    }));

    await embeddingRepository.createBatch(embeddingsToCreate);

    logger.info('Embeddings stored successfully', {
      reportId,
      count: embeddingsToCreate.length,
    });
    await job.updateProgress(100);

    logger.info('Embeddings generation completed successfully', {
      reportId,
      profileId,
      totalEmbeddings: embeddingsToCreate.length,
    });

  } catch (error: any) {
    logger.error('Embeddings generation failed', {
      reportId,
      error: error.message,
      stack: error.stack,
    });

    // Re-throw error to trigger BullMQ retry mechanism
    throw error;
  }
}

// Create and start the worker
export const generateEmbeddingsWorker = createWorker(
  'generate-embeddings',
  generateEmbeddingsJob,
  {
    concurrency: 2, // Process up to 2 embedding jobs concurrently (API rate limits)
  }
);

logger.info('Generate embeddings worker started');
