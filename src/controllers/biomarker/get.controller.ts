import { Request, Response, NextFunction } from 'express';
import { biomarkerService } from '@services/biomarker.service';
import { HttpError } from '@utils/httpError';

/**
 * GET /api/biomarkers/trend
 * Get biomarker trend data for visualization
 * Query params: profile_id (required), biomarker (required)
 */
export async function getBiomarkerTrend(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.query.profile_id as string;
    const biomarkerName = req.query.biomarker as string;

    if (!profileId) {
      throw new HttpError(400, 'profile_id query parameter is required', 'VALIDATION_ERROR');
    }

    if (!biomarkerName) {
      throw new HttpError(400, 'biomarker query parameter is required', 'VALIDATION_ERROR');
    }

    // Get trend data
    const trendData = await biomarkerService.getBiomarkerTrend(profileId, biomarkerName);

    res.json({
      biomarker: biomarkerName,
      profileId,
      dataPoints: trendData.length,
      trend: trendData,
    });
  } catch (error) {
    next(error);
  }
}
