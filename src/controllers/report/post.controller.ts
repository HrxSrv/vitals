import { Request, Response, NextFunction, RequestHandler } from 'express';
import { reportService } from '../../services/report.service';
import { HttpError } from '../../utils/httpError';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new HttpError(400, 'Only PDF files are allowed', 'INVALID_FILE_TYPE'));
    }
  },
});

/**
 * Multer middleware for single file upload
 */
export const uploadMiddleware: RequestHandler = upload.single('file');

/**
 * POST /api/reports
 * Upload a new health report PDF
 */
export async function uploadReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { profileId, reportDate } = req.body;

    // Validate file was uploaded
    if (!req.file) {
      throw new HttpError(400, 'No file uploaded', 'NO_FILE');
    }

    // Parse report date if provided
    const parsedReportDate = reportDate ? new Date(reportDate) : undefined;

    // Upload report
    const report = await reportService.uploadReport(
      userId,
      profileId,
      req.file.buffer,
      req.file.originalname,
      parsedReportDate
    );

    res.status(201).json({
      message: 'Report uploaded successfully',
      report: {
        id: report.id,
        profileId: report.profileId,
        fileUrl: report.fileUrl,
        reportDate: report.reportDate,
        processingStatus: report.processingStatus,
        uploadedAt: report.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
