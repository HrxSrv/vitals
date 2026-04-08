import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../../services/notification.service';

/**
 * PATCH /api/settings/notifications
 * Update notification preferences for the authenticated user
 *
 * Request body:
 * {
 *   emailDigestEnabled?: boolean;
 *   digestFrequency?: 'monthly' | 'quarterly';
 *   reportReadyEmailEnabled?: boolean;
 * }
 */
export async function updateNotificationPreferences(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { emailDigestEnabled, digestFrequency, reportReadyEmailEnabled } = req.body;

    const preferences = await notificationService.updatePreferences(userId, {
      emailDigestEnabled,
      digestFrequency,
      reportReadyEmailEnabled,
    });

    res.json({ preferences });
  } catch (error) {
    next(error);
  }
}
