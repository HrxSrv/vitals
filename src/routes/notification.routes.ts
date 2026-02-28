import { Router } from 'express';
import * as notificationController from '../controllers/notification';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { updateNotificationPreferencesSchema } from '../validations/notification.validations';

const router = Router();

// GET /api/settings/notifications - Get notification preferences
router.get(
  '/',
  authMiddleware,
  notificationController.getNotificationPreferences
);

// PATCH /api/settings/notifications - Update notification preferences
router.patch(
  '/',
  authMiddleware,
  validateRequest(updateNotificationPreferencesSchema),
  notificationController.updateNotificationPreferences
);

export default router;
