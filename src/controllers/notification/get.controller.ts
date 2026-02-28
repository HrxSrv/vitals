import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../../services/notification.service';

/**
 * GET /api/settings/notifications
 * Get notification preferences for the authenticated user
 */
export async function getNotificationPreferences(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;

    const preferences = await notificationService.getPreferences(userId);

    res.json({ preferences });
  } catch (error) {
    next(error);
  }
}
