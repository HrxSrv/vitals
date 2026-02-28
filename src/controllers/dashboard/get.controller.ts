import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '@services/dashboard.service';
import { HttpError } from '@utils/httpError';

/**
 * GET /api/dashboard
 * Get dashboard data for a specific profile
 * Query params: profile_id (required)
 */
export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.query.profile_id as string;

    if (!profileId) {
      throw new HttpError(400, 'profile_id query parameter is required', 'VALIDATION_ERROR');
    }

    const dashboardData = await dashboardService.getDashboard(userId, profileId);

    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/all
 * Get dashboard data for all profiles of the authenticated user
 */
export async function getAllDashboards(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const dashboards = await dashboardService.getAllDashboards(userId);

    res.json({ dashboards });
  } catch (error) {
    next(error);
  }
}
