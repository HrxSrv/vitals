import { Router, IRouter } from 'express';
import * as reportController from '../controllers/report';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { uploadReportSchema, getReportsQuerySchema } from '../validations/report.validations';

const router: IRouter = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/reports?profileId=xxx - Get all reports for a profile
router.get('/', validateRequest(getReportsQuerySchema, 'query'), reportController.getReports);

// POST /api/reports - Upload a new report
router.post(
  '/',
  reportController.uploadMiddleware,
  validateRequest(uploadReportSchema),
  reportController.uploadReport
);

// GET /api/reports/:id/download - Download report PDF (must come before /:id)
router.get('/:id/download', reportController.downloadReport);

// GET /api/reports/:id - Get a specific report
router.get('/:id', reportController.getReport);

// DELETE /api/reports/:id - Delete a report
router.delete('/:id', reportController.deleteReport);

export default router;
