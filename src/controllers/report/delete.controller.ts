import { Request, Response, NextFunction } from 'express';
import { reportService } from '../../services/report.service';

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
export async function deleteReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const reportId = req.params.id;

    await reportService.deleteReport(userId, reportId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
