import { Request, Response, NextFunction } from 'express';
import profileService from '@services/profile.service';

/**
 * DELETE /api/profiles/:id
 * Delete a profile and all associated data
 */
export async function deleteProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profileId = req.params.id;

    await profileService.deleteProfile(userId, profileId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
