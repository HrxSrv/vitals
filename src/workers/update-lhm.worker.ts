import { Job } from 'bullmq';
import { createWorker, UpdateLHMJobData } from '../lib/queue';
import { reportRepository } from '../repositories/report.repository';
import { biomarkerRepository } from '../repositories/biomarker.repository';
import { lhmService } from '../services/lhm.service';
import { queueService } from '../services/queue.service';
import { logger } from '../utils/logger';

/**
 * Update LHM Worker
 * 
 * Updates the Living Health Markdown document for a profile with new biomarker data
 * This worker is triggered after report processing completes
 * 
 * Pipeline:
 * 1. Fetch biomarkers for the report
 * 2. Get report metadata (date, lab name)
 * 3. Update LHM using LLM merge logic
 * 4. Check if compression is needed
 * 5. Trigger embeddings generation
 */

async function updateLHMJob(job: Job<UpdateLHMJobData>): Promise<void> {
  const { profileId, userId, reportId } = job.data;

  logger.info('Starting LHM update', { profileId, userId, reportId });

  try {
    // Step 1: Fetch the report to get metadata
    await job.updateProgress(10);
    const report = await reportRepository.findById(reportId);
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    if (!report.reportDate) {
      logger.warn('Report has no date, using current date', { reportId });
    }

    logger.info('Report fetched for LHM update', {
      reportId,
      reportDate: report.reportDate,
    });
    await job.updateProgress(20);

    // Step 2: Fetch biomarkers for this report
    const biomarkers = await biomarkerRepository.findByReport(reportId);
    
    if (biomarkers.length === 0) {
      logger.warn('No biomarkers found for report, skipping LHM update', {
        reportId,
      });
      return;
    }

    logger.info('Biomarkers fetched for LHM update', {
      reportId,
      count: biomarkers.length,
    });
    await job.updateProgress(40);

    // Step 3: Extract lab name from OCR markdown if available
    let labName: string | undefined;
    if (report.rawOcrMarkdown) {
      // Try to extract lab name from markdown (simple heuristic)
      const labMatch = report.rawOcrMarkdown.match(
        /(?:lab|laboratory|diagnostic|pathology|clinic)[\s:]+([A-Za-z\s&]+)/i
      );
      if (labMatch) {
        labName = labMatch[1].trim();
      }
    }

    logger.info('Lab name extracted', { reportId, labName: labName || 'Unknown' });
    await job.updateProgress(50);

    // Step 4: Update LHM with new biomarker data
    const reportDate = report.reportDate || new Date();
    
    await lhmService.updateLHM(
      profileId,
      biomarkers,
      reportDate,
      labName
    );

    logger.info('LHM updated successfully', { profileId, reportId });
    await job.updateProgress(80);

    // Step 5: Check if LHM needs compression
    const needsCompression = await lhmService.needsCompression(profileId);
    
    if (needsCompression) {
      logger.info('LHM exceeds token limit, triggering compression', {
        profileId,
      });
      
      try {
        await lhmService.compressLHM(profileId);
        logger.info('LHM compression completed', { profileId });
      } catch (compressionError) {
        // Log but don't fail the job if compression fails
        logger.error('LHM compression failed', {
          profileId,
          error: compressionError instanceof Error ? compressionError.message : compressionError,
        });
      }
    }

    await job.updateProgress(90);

    // Step 6: Enqueue embeddings generation job
    await queueService.enqueueGenerateEmbeddings({
      reportId,
      userId,
      profileId,
    });

    logger.info('Embeddings generation job enqueued', { reportId });
    await job.updateProgress(100);

    logger.info('LHM update completed successfully', {
      profileId,
      reportId,
    });

  } catch (error: any) {
    logger.error('LHM update failed', {
      profileId,
      reportId,
      error: error.message,
      stack: error.stack,
    });

    // Re-throw error to trigger BullMQ retry mechanism
    throw error;
  }
}

// Create and start the worker
export const updateLHMWorker = createWorker(
  'update-lhm',
  updateLHMJob,
  {
    concurrency: 2, // Process up to 2 LHM updates concurrently (LLM calls are expensive)
  }
);

logger.info('Update LHM worker started');
