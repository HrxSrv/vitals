import { Request, Response, NextFunction } from 'express';
import { deviceTokenRepository } from '../../repositories/device-token.repository';

/**
 * POST /api/devices
 * Register (or refresh) the authenticated user's Expo push token.
 *
 * Request body:
 * {
 *   expoPushToken: string;
 *   platform: 'ios' | 'android';
 * }
 */
export async function registerDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { expoPushToken, platform } = req.body;

    await deviceTokenRepository.upsert(userId, expoPushToken, platform);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
