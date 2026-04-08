import { z } from 'zod';

/**
 * Validation schema for updating notification preferences
 */
export const updateNotificationPreferencesSchema = z.object({
  emailDigestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['monthly', 'quarterly']).optional(),
  reportReadyEmailEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
