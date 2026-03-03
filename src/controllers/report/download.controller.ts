import { Request, Response, NextFunction } from 'express';
import { reportService } from '@services/report.service';
import { storageService } from '@services/storage.service';

/**
 * GET /api/reports/:id/download
 * Download the original PDF file for a report
 */
export async function downloadReport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.id;
    const { id: reportId } = req.params;

    // Get report and verify ownership
    const report = await reportService.getReportById(userId, reportId);

    // Create a signed URL for temporary access (1 hour)
    const signedUrl = await storageService.createSignedUrl(report.fileUrl, 3600);

    // Redirect to the signed URL
    res.redirect(signedUrl);
  } catch (error) {
    next(error);
  }
}
