import { Router, type Router as RouterType } from 'express';
import * as biomarkerController from '@controllers/biomarker';
import { authMiddleware } from '@middlewares/auth.middleware';

const router: RouterType = Router();

/**
 * All biomarker routes require authentication
 */

/**
 * GET /api/biomarkers/trend
 * Get biomarker trend data for a specific biomarker and profile
 * Query params: profile_id (required), biomarker (required)
 */
router.get('/trend', authMiddleware, biomarkerController.getBiomarkerTrend);

export default router;
