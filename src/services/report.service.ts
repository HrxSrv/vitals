import { reportRepository } from '../repositories/report.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { storageService } from './storage.service';
import { queueService } from './queue.service';
import profileRepository from '../repositories/profile.repository';
import { Report } from '../types/domain.types';
import { HttpError, NotFoundError, AuthorizationError } from '../utils/httpError';
import { logger } from '../utils/logger';

/**
 * Service for managing health report uploads and processing
 */
export class ReportService {
  /**
   * Upload a new report PDF
   * 
   * @param userId - Authenticated user ID
   * @param profileId - Profile to associate the report with
   * @param file - Uploaded file buffer
   * @param filename - Original filename
   * @param reportDate - Optional report date
   * @returns Created report record
   */
  async uploadReport(
    userId: string,
    profileId: string,
    file: Buffer,
    filename: string,
    reportDate?: Date
  ): Promise<Report> {
    try {
      // Verify profile belongs to user
      const profile = await profileRepository.findById(profileId);
      
      if (!profile) {
        throw new NotFoundError('Profile');
      }
      
      if (profile.userId !== userId) {
        throw new AuthorizationError('Unauthorized to upload reports for this profile');
      }

      // Upload file to storage
      const fileUrl = await storageService.uploadFile(userId, profileId, file, filename);

      // Create report record
      const report = await reportRepository.create({
        userId,
        profileId,
        fileUrl,
        reportDate,
      });

      logger.info(`Report uploaded successfully: ${report.id}`);

      // Enqueue background job for OCR processing
      await queueService.enqueueProcessReport({
        reportId: report.id,
        userId,
        profileId,
      });

      logger.info(`Process report job enqueued for report: ${report.id}`);

      return report;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error uploading report:', error);
      throw new HttpError(500, 'Failed to upload report', 'UPLOAD_ERROR');
    }
  }

  /**
   * Get all reports for a profile
   * 
   * @param userId - Authenticated user ID
   * @param profileId - Profile ID to fetch reports for
   * @returns List of reports
   */
  async getReports(userId: string, profileId: string): Promise<Report[]> {
    try {
      // Verify profile belongs to user
      const profile = await profileRepository.findById(profileId);
      
      if (!profile) {
        throw new NotFoundError('Profile');
      }
      
      if (profile.userId !== userId) {
        throw new AuthorizationError('Unauthorized to access reports for this profile');
      }

      return await reportRepository.findByProfileId(profileId);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching reports:', error);
      throw new HttpError(500, 'Failed to fetch reports', 'FETCH_ERROR');
    }
  }

  /**
   * Get a specific report by ID
   * 
   * @param userId - Authenticated user ID
   * @param reportId - Report ID to fetch
   * @returns Report details
   */
  async getReportById(userId: string, reportId: string): Promise<Report> {
    try {
      const report = await reportRepository.findById(reportId);
      
      if (!report) {
        throw new NotFoundError('Report');
      }
      
      if (report.userId !== userId) {
        throw new AuthorizationError('Unauthorized to access this report');
      }

      return report;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching report:', error);
      throw new HttpError(500, 'Failed to fetch report', 'FETCH_ERROR');
    }
  }

  /**
   * Delete a report
   * 
   * @param userId - Authenticated user ID
   * @param reportId - Report ID to delete
   */
  async deleteReport(userId: string, reportId: string): Promise<void> {
    try {
      const report = await reportRepository.findById(reportId);
      
      if (!report) {
        throw new NotFoundError('Report');
      }
      
      if (report.userId !== userId) {
        throw new AuthorizationError('Unauthorized to delete this report');
      }

      // Delete embeddings associated with the report
      await embeddingRepository.deleteByReport(reportId);
      logger.info(`Embeddings deleted for report: ${reportId}`);

      // Delete file from storage
      await storageService.deleteFile(report.fileUrl);

      // Delete report record (cascade deletes biomarkers)
      await reportRepository.delete(reportId);

      logger.info(`Report deleted successfully: ${reportId}`);

      // TODO: Enqueue LHM update job to recalculate without deleted data
      // This will be implemented in task 10 (Implement Living Health Markdown system)
      // await queueService.enqueueUpdateLHM(report.profileId);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error deleting report:', error);
      throw new HttpError(500, 'Failed to delete report', 'DELETE_ERROR');
    }
  }
}

// Export singleton instance
export const reportService = new ReportService();

