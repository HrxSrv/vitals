import { supabaseAdmin } from '../services/supabase.service';
import { Report, ReportStatus } from '../types/domain.types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

/**
 * Repository for managing report data in the database
 * Handles CRUD operations and status transitions
 */
export class ReportRepository {
  /**
   * Create a new report record
   */
  async create(data: {
    userId: string;
    profileId: string;
    fileUrl: string;
    reportDate?: Date;
  }): Promise<Report> {
    try {
      const { data: report, error } = await supabaseAdmin
        .from('reports')
        .insert({
          user_id: data.userId,
          profile_id: data.profileId,
          file_url: data.fileUrl,
          report_date: data.reportDate?.toISOString().split('T')[0],
          processing_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create report:', error);
        throw new HttpError(500, `Failed to create report: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToReport(report);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error creating report:', error);
      throw new HttpError(500, 'Failed to create report', 'DB_ERROR');
    }
  }

  /**
   * Find all reports for a specific profile
   */
  async findByProfileId(profileId: string): Promise<Report[]> {
    try {
      const { data: reports, error } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('profile_id', profileId)
        .order('report_date', { ascending: false, nullsFirst: false })
        .order('uploaded_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch reports:', error);
        throw new HttpError(500, `Failed to fetch reports: ${error.message}`, 'DB_ERROR');
      }

      return reports.map(this.mapToReport);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching reports:', error);
      throw new HttpError(500, 'Failed to fetch reports', 'DB_ERROR');
    }
  }

  /**
   * Find a report by ID
   */
  async findById(reportId: string): Promise<Report | null> {
    try {
      const { data: report, error } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Failed to fetch report:', error);
        throw new HttpError(500, `Failed to fetch report: ${error.message}`, 'DB_ERROR');
      }

      return this.mapToReport(report);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching report:', error);
      throw new HttpError(500, 'Failed to fetch report', 'DB_ERROR');
    }
  }

  /**
   * Update report status
   */
  async updateStatus(reportId: string, status: ReportStatus): Promise<Report> {
    try {
      const { data: report, error } = await supabaseAdmin
        .from('reports')
        .update({ processing_status: status })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update report status:', error);
        throw new HttpError(500, `Failed to update report status: ${error.message}`, 'DB_ERROR');
      }

      logger.info(`Report ${reportId} status updated to: ${status}`);
      return this.mapToReport(report);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error updating report status:', error);
      throw new HttpError(500, 'Failed to update report status', 'DB_ERROR');
    }
  }

  /**
   * Update report with OCR markdown
   */
  async updateOcrMarkdown(reportId: string, markdown: string): Promise<Report> {
    try {
      const { data: report, error } = await supabaseAdmin
        .from('reports')
        .update({ raw_ocr_markdown: markdown })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update report OCR markdown:', error);
        throw new HttpError(500, `Failed to update report OCR markdown: ${error.message}`, 'DB_ERROR');
      }

      logger.info(`Report ${reportId} OCR markdown updated`);
      return this.mapToReport(report);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error updating report OCR markdown:', error);
      throw new HttpError(500, 'Failed to update report OCR markdown', 'DB_ERROR');
    }
  }

  /**
   * Update report date (extracted from OCR or user-provided)
   */
  async updateReportDate(reportId: string, reportDate: Date): Promise<Report> {
    try {
      const { data: report, error } = await supabaseAdmin
        .from('reports')
        .update({ report_date: reportDate.toISOString().split('T')[0] })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update report date:', error);
        throw new HttpError(500, `Failed to update report date: ${error.message}`, 'DB_ERROR');
      }

      logger.info(`Report ${reportId} date updated to: ${reportDate.toISOString().split('T')[0]}`);
      return this.mapToReport(report);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error updating report date:', error);
      throw new HttpError(500, 'Failed to update report date', 'DB_ERROR');
    }
  }

  /**
   * Delete a report
   * Note: Associated biomarkers and embeddings will be cascade deleted by database
   */
  async delete(reportId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        logger.error('Failed to delete report:', error);
        throw new HttpError(500, `Failed to delete report: ${error.message}`, 'DB_ERROR');
      }

      logger.info(`Report ${reportId} deleted successfully`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error deleting report:', error);
      throw new HttpError(500, 'Failed to delete report', 'DB_ERROR');
    }
  }

  /**
   * Find all reports with a specific status
   * Useful for background job processing
   */
  async findByStatus(status: ReportStatus): Promise<Report[]> {
    try {
      const { data: reports, error } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('processing_status', status)
        .order('uploaded_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch reports by status:', error);
        throw new HttpError(500, `Failed to fetch reports by status: ${error.message}`, 'DB_ERROR');
      }

      return reports.map(this.mapToReport);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error fetching reports by status:', error);
      throw new HttpError(500, 'Failed to fetch reports by status', 'DB_ERROR');
    }
  }

  /**
   * Count total reports for a profile
   */
  async countByProfile(profileId: string): Promise<number> {
    try {
      const { count, error } = await supabaseAdmin
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (error) {
        logger.error('Failed to count reports:', error);
        throw new HttpError(500, `Failed to count reports: ${error.message}`, 'DB_ERROR');
      }

      return count || 0;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error counting reports:', error);
      throw new HttpError(500, 'Failed to count reports', 'DB_ERROR');
    }
  }


  /**
   * Map database row to Report domain object
   */
  private mapToReport(row: any): Report {
    return {
      id: row.id,
      userId: row.user_id,
      profileId: row.profile_id,
      fileUrl: row.file_url,
      reportDate: row.report_date ? new Date(row.report_date) : undefined,
      rawOcrMarkdown: row.raw_ocr_markdown,
      processingStatus: row.processing_status as ReportStatus,
      uploadedAt: new Date(row.uploaded_at),
    };
  }
}

// Export singleton instance
export const reportRepository = new ReportRepository();

