import { Router, type Router as RouterType } from 'express';
import * as dashboardController from '@controllers/dashboard';
import { authMiddleware } from '@middlewares/auth.middleware';

const router: RouterType = Router();

/**
 * All dashboard routes require authentication
 */

/**
 * GET /api/dashboard
 * Get dashboard data for a specific profile
 * Query params: profile_id (required)
 */
router.get('/', authMiddleware, dashboardController.getDashboard);

/**
 * GET /api/dashboard/all
 * Get dashboard data for all profiles of the authenticated user
 */
router.get('/all', authMiddleware, dashboardController.getAllDashboards);

export default router;
