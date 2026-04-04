import { z } from 'zod';

/**
 * Validation schema for report upload
 */
export const uploadReportSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format'),
  reportDate: z.string().datetime().optional(),
});

/**
 * Validation schema for report query parameters
 */
export const getReportsQuerySchema = z.object({
  profileId: z.string().uuid('Invalid profile ID format'),
});

/**
 * Type inference from schemas
 */
export type UploadReportDto = z.infer<typeof uploadReportSchema>;
export type GetReportsQueryDto = z.infer<typeof getReportsQuerySchema>;
