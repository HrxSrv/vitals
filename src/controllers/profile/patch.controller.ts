import { Request, Response, NextFunction } from 'express';
import profileService from '@services/profile.service';

/**
 * PATCH /api/profiles/:id
 * Update a profile
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.params.id;

    const profile = await profileService.updateProfile(
      userId,
      profileId,
      req.body
    );

    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/profiles/:id/default
 * Set a profile as the default profile
 */
export async function setDefaultProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.params.id;

    await profileService.setDefaultProfile(userId, profileId);

    res.json({ message: 'Default profile updated successfully' });
  } catch (error) {
    next(error);
  }
}
