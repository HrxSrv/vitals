import { Job } from 'bullmq';
import { createWorker, ProcessReportJobData } from '../lib/queue';
import { reportRepository } from '../repositories/report.repository';
import { storageService } from '../services/storage.service';
import { mistralOCRService } from '../services/mistral-ocr.service';
import { biomarkerService } from '../services/biomarker.service';
import { queueService } from '../services/queue.service';
import { logger } from '../utils/logger';

/**
 * Process Report Worker
 * 
 * Orchestrates the complete report processing pipeline:
 * 1. Fetch report and PDF from storage
 * 2. Extract text using Mistral OCR
 * 3. Store raw OCR markdown
 * 4. Extract biomarkers using LLM
 * 5. Normalize and store biomarkers
 * 6. Trigger LHM update
 * 7. Update report status
 */

async function processReportJob(job: Job<ProcessReportJobData>): Promise<void> {
  const { reportId, userId, profileId } = job.data;

  logger.info('Starting report processing', { reportId, userId, profileId });

  try {
    // Step 1: Update status to processing
    await reportRepository.updateStatus(reportId, 'processing');
    await job.updateProgress(10);

    // Step 2: Fetch report from database
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    logger.info('Report fetched', { reportId, fileUrl: report.fileUrl });
    await job.updateProgress(20);

    // Step 3: Download PDF from storage
    const pdfBuffer = await storageService.downloadFile(report.fileUrl);
    logger.info('PDF downloaded', { reportId, size: pdfBuffer.length });
    await job.updateProgress(30);

    // Step 4: Extract text using Mistral OCR
    const ocrMarkdown = await mistralOCRService.extractTextFromPDF(
      pdfBuffer,
      `report-${reportId}.pdf`
    );
    logger.info('OCR extraction completed', {
      reportId,
      textLength: ocrMarkdown.length,
    });
    await job.updateProgress(50);

    // Step 5: Store raw OCR markdown
    await reportRepository.updateOcrMarkdown(reportId, ocrMarkdown);
    logger.info('OCR markdown stored', { reportId });
    await job.updateProgress(60);

    // Step 6: Extract biomarkers and store them
    const { biomarkers, reportDate: extractedDate } = await biomarkerService.extractAndStore(
      ocrMarkdown,
      reportId,
      userId,
      profileId,
      report.reportDate
    );
    logger.info('Biomarkers extracted and stored', {
      reportId,
      count: biomarkers.length,
      finalDate: extractedDate,
    });
    await job.updateProgress(80);

    // Step 7: Enqueue LHM update job
    await queueService.enqueueUpdateLHM({
      profileId,
      userId,
      reportId,
    });
    logger.info('LHM update job enqueued', { reportId, profileId });
    await job.updateProgress(90);

    // Step 8: Update report status to done
    await reportRepository.updateStatus(reportId, 'done');
    logger.info('Report processing completed successfully', { reportId });
    await job.updateProgress(100);

  } catch (error: any) {
    logger.error('Report processing failed', {
      reportId,
      error: error.message,
      stack: error.stack,
    });

    // Update report status to failed
    try {
      await reportRepository.updateStatus(reportId, 'failed');
    } catch (statusError) {
      logger.error('Failed to update report status to failed', {
        reportId,
        error: statusError,
      });
    }

    // Re-throw error to trigger BullMQ retry mechanism
    throw error;
  }
}

// Create and start the worker
export const processReportWorker = createWorker(
  'process-report',
  processReportJob,
  {
    concurrency: 3, // Process up to 3 reports concurrently
  }
);

logger.info('Process report worker started');
