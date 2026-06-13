import { Router, type Router as RouterType } from 'express';
import * as deviceController from '../controllers/device';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { registerDeviceSchema } from '../validations/device.validations';

const router: RouterType = Router();

// POST /api/devices - Register an Expo push token for the authenticated user
router.post(
  '/',
  authMiddleware,
  validateRequest(registerDeviceSchema),
  deviceController.registerDevice
);

export default router;
