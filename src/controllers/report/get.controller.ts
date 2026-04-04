import { Request, Response, NextFunction } from 'express';
import { reportService } from '../../services/report.service';

/**
 * GET /api/reports?profileId=xxx
 * Get all reports for a profile
 */
export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { profileId } = req.query;

    const reports = await reportService.getReports(userId, profileId as string);

    res.json({
      reports: reports.map((report) => ({
        id: report.id,
        profileId: report.profileId,
        fileUrl: report.fileUrl,
        reportDate: report.reportDate,
        processingStatus: report.processingStatus,
        uploadedAt: report.uploadedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/:id
 * Get a specific report by ID
 */
export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const reportId = req.params.id;

    const report = await reportService.getReportById(userId, reportId);

    res.json({
      report: {
        id: report.id,
        profileId: report.profileId,
        fileUrl: report.fileUrl,
        reportDate: report.reportDate,
        rawOcrMarkdown: report.rawOcrMarkdown,
        processingStatus: report.processingStatus,
        uploadedAt: report.uploadedAt,
        biomarkers: report.biomarkers || [], // Include biomarkers
      },
    });
  } catch (error) {
    next(error);
  }
}
