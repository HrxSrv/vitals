import { Request, Response, NextFunction } from 'express';
import profileService from '@services/profile.service';

/**
 * POST /api/profiles
 * Create a new profile for the authenticated user
 */
export async function createProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await profileService.createProfile(userId, req.body);

    res.status(201).json({ profile });
  } catch (error) {
    next(error);
  }
}
