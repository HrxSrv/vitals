import { Job } from 'bullmq';
import { createWorker, ProcessReportJobData } from '../lib/queue';
import { reportRepository } from '../repositories/report.repository';
import { storageService } from '../services/storage.service';
import { mistralOCRService } from '../services/mistral-ocr.service';
import { openAIOCRService } from '../services/openai-ocr.service';
import { Report } from '../types/domain.types';

const ocrService =
  (process.env.AI_PROVIDER ?? 'mistral').toLowerCase() === 'openai'
    ? openAIOCRService
    : mistralOCRService;
import { biomarkerService, PatientContext } from '../services/biomarker.service';
import { emailService } from '../services/email.service';
import { pushService } from '../services/push.service';
import { notificationRepository } from '../repositories/notification.repository';
import profileRepository from '../repositories/profile.repository';
import { queueService } from '../services/queue.service';
import { dashboardService } from '../services/dashboard.service';
import { supabaseAdmin } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * Returns true if the newly extracted patient context conflicts with the
 * source-of-truth report for this profile.
 *
 * DOB is the primary anchor (reliable, stable). Name is the fallback.
 * If neither field is available on both sides we cannot determine a mismatch,
 * so we allow the upload through.
 */
function isPersonMismatch(extracted: { patientName?: string; patientDob?: Date }, source: Report): boolean {
  const toDateStr = (d?: Date) => d?.toISOString().split('T')[0];
  const extractedDob = toDateStr(extracted.patientDob);
  const sourceDob = toDateStr(source.patientDob);

  if (extractedDob && sourceDob) {
    return extractedDob !== sourceDob;
  }

  if (extracted.patientName && source.patientName) {
    const normalize = (s: string) => s.toLowerCase().replace(/[\s,.-]/g, '');
    return normalize(extracted.patientName) !== normalize(source.patientName);
  }

  return false;
}

/**
 * Process Report Worker
 *
 * Orchestrates the complete report processing pipeline:
 * 1. Fetch report metadata from database
 * 2. Create signed URL for temporary access
 * 3. Extract text using Mistral OCR API
 * 4. Store raw OCR markdown
 * 5. Extract biomarkers using LLM
 * 6. Normalize and store biomarkers
 * 7. Trigger LHM update
 * 8. Update report status
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

    // Step 3: Create a signed URL for Mistral OCR API access (valid for 1 hour)
    const signedUrl = await storageService.createSignedUrl(report.fileUrl, 3600);
    logger.info('Signed URL created for OCR', { reportId });
    await job.updateProgress(30);

    // Step 4: Extract text using OCR (Mistral or OpenAI vision based on AI_PROVIDER)
    const ocrMarkdown = await ocrService.extractTextFromPDF(signedUrl, `report-${reportId}.pdf`);
    logger.info('OCR extraction completed', {
      reportId,
      textLength: ocrMarkdown.length,
    });
    await job.updateProgress(50);

    // Step 5: Store raw OCR markdown
    await reportRepository.updateOcrMarkdown(reportId, ocrMarkdown);
    logger.info('OCR markdown stored', { reportId });
    await job.updateProgress(60);

    // Step 5.5: Build patient context for prompt enrichment.
    // Run profile fetch and PDF-based context extraction in parallel — both are
    // needed but neither depends on the other.
    //
    // Profile data (gender, age) is authoritative for who the report belongs to.
    // PDF-extracted data (lab name, collection date) adds provenance the profile
    // doesn't know. We merge them: profile wins for gender/age, PDF wins for lab
    // metadata.
    const [profile, pdfContext] = await Promise.all([
      profileRepository.findById(profileId).catch(() => null),
      biomarkerService.extractPatientContext(ocrMarkdown),
    ]);

    const reportDateForAge = report.reportDate ?? new Date();
    const profileAge = profile?.dob
      ? Math.floor(
          (reportDateForAge.getTime() - new Date(profile.dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : undefined;

    const patientContext: PatientContext = {
      // Profile is the source of truth for identity; fall back to PDF if unknown
      gender:
        profile?.gender === 'male' || profile?.gender === 'female'
          ? profile.gender
          : pdfContext.gender,
      ageAtTest: profileAge ?? pdfContext.ageAtTest,
      // Lab metadata only comes from the PDF
      labName: pdfContext.labName,
      collectionDate: pdfContext.collectionDate,
    };

    logger.info('Patient context built', {
      reportId,
      gender: patientContext.gender,
      ageAtTest: patientContext.ageAtTest,
      labName: patientContext.labName,
      patientName: pdfContext.patientName,
      patientDob: pdfContext.patientDob,
    });

    // Persist the patient identity fields extracted from the PDF
    await reportRepository.updatePatientContext(
      reportId,
      pdfContext.patientName,
      pdfContext.patientDob?.toISOString().split('T')[0],
    );

    // Step 5.6: Validate that this report belongs to the same person as existing reports.
    // The oldest successfully processed report in the profile is the source of truth.
    // If the person extracted from this PDF doesn't match, halt processing and surface
    // a specific status so the frontend can prompt the user.
    const sourceReport = await reportRepository.findOldestCompleted(profileId);
    if (sourceReport && isPersonMismatch(pdfContext, sourceReport)) {
      logger.warn('Person mismatch detected — report belongs to a different person', {
        reportId,
        profileId,
        extractedName: pdfContext.patientName,
        extractedDob: pdfContext.patientDob,
        sourceName: sourceReport.patientName,
        sourceDob: sourceReport.patientDob,
      });
      await reportRepository.updateStatus(reportId, 'person_mismatch');
      dashboardService.invalidateCache(profileId);
      return;
    }

    // Step 6: Extract biomarkers and store them (two-pass: patient context → biomarkers)
    const { biomarkers, reportDate: extractedDate } = await biomarkerService.extractAndStore(
      ocrMarkdown,
      reportId,
      userId,
      profileId,
      report.reportDate,
      patientContext,
    );
    logger.info('Biomarkers extracted and stored', {
      reportId,
      count: biomarkers.length,
      finalDate: extractedDate,
    });

    // Step 6.5: Update report date if not already set
    // This handles: extracted date from OCR or fallback to upload date
    if (extractedDate && !report.reportDate) {
      await reportRepository.updateReportDate(reportId, extractedDate);
      logger.info('Report date updated', {
        reportId,
        date: extractedDate.toISOString().split('T')[0],
        source: 'extracted-or-upload-date',
      });
    }
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

    // Invalidate dashboard cache so biomarker counts are fresh
    dashboardService.invalidateCache(profileId);

    const notificationPreferences = await notificationRepository.findByUserId(userId);
    if (notificationPreferences.reportReadyEmailEnabled) {
      try {
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (userError || !user?.user?.email) {
          logger.warn('Skipping report ready email because user email could not be fetched', {
            reportId,
            userId,
            error: userError?.message,
          });
        } else {
          const frontendUrl = process.env.FRONTEND_URL || 'https://www.vithos.in';
          const reportUrl = new URL(`/reports/${reportId}`, frontendUrl).toString();
          const reportDateForEmail = extractedDate || report.reportDate;

          await emailService.sendReportReady(user.user.email, {
            reportId,
            reportDate: reportDateForEmail ?? undefined,
            reportUrl,
            userName: user.user.user_metadata?.name || user.user.email.split('@')[0],
            biomarkerCount: biomarkers.length,
          });
        }
      } catch (emailError) {
        logger.error('Failed to send report ready email', {
          reportId,
          userId,
          error: emailError instanceof Error ? emailError.message : emailError,
        });
      }
    }

    // Push notification — lets the mobile app surface "report ready" even when
    // closed/backgrounded. Best-effort: pushService never throws.
    if (notificationPreferences.pushNotificationsEnabled) {
      const name = profile?.name;
      await pushService.sendToUser(userId, {
        title: 'Report ready',
        body: name ? `${name}'s report has been analyzed` : 'Your report has been analyzed',
        data: { type: 'report-ready', reportId, profileId },
      });
    }

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
export const processReportWorker = createWorker('process-report', processReportJob, {
  concurrency: 3, // Process up to 3 reports concurrently
});

logger.info('Process report worker started');
