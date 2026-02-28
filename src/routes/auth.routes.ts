import { Router, type Router as RouterType } from 'express';
import * as authController from '@controllers/auth';

const router: RouterType = Router();

/**
 * GET /api/auth/session
 * Get current user session information
 * No auth middleware needed - token verification is done in the controller
 */
router.get('/session', authController.getSession);

export default router;
