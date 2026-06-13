import { z } from 'zod';

/**
 * Validation schema for registering a device push token.
 */
export const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(1, 'expoPushToken is required'),
  platform: z.enum(['ios', 'android']),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
