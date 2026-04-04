import { Router, type Router as RouterType } from 'express';
import * as profileController from '@controllers/profile';
import { authMiddleware } from '@middlewares/auth.middleware';
import { validateRequest } from '@middlewares/validation.middleware';
import { createProfileSchema, updateProfileSchema } from '@validations/profile.validations';

const router: RouterType = Router();

/**
 * All profile routes require authentication
 */

/**
 * GET /api/profiles
 * Get all profiles for the authenticated user
 */
router.get('/', authMiddleware, profileController.getProfiles);

/**
 * POST /api/profiles
 * Create a new profile
 */
router.post(
  '/',
  authMiddleware,
  validateRequest(createProfileSchema),
  profileController.createProfile
);

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
router.get('/:id', authMiddleware, profileController.getProfile);

/**
 * PATCH /api/profiles/:id
 * Update a profile
 */
router.patch(
  '/:id',
  authMiddleware,
  validateRequest(updateProfileSchema),
  profileController.updateProfile
);

/**
 * PATCH /api/profiles/:id/default
 * Set a profile as the default profile
 */
router.patch('/:id/default', authMiddleware, profileController.setDefaultProfile);

/**
 * DELETE /api/profiles/:id
 * Delete a profile and all associated data
 */
router.delete('/:id', authMiddleware, profileController.deleteProfile);

export default router;
