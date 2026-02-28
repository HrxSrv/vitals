import { z } from 'zod';

/**
 * Validation schema for updating notification preferences
 */
export const updateNotificationPreferencesSchema = z.object({
  emailDigestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['monthly', 'quarterly']).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
