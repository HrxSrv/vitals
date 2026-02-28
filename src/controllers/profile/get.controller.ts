import { Request, Response, NextFunction } from 'express';
import profileService from '@services/profile.service';

/**
 * GET /api/profiles
 * Get all profiles for the authenticated user
 */
export async function getProfiles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profiles = await profileService.getProfiles(userId);

    res.json({ profiles });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.params.id;

    const profile = await profileService.getProfileById(userId, profileId);

    res.json({ profile });
  } catch (error) {
    next(error);
  }
}
