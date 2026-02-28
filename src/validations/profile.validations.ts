import { z } from 'zod';

/**
 * Validation schemas for profile operations
 */

// Relationship enum schema
export const relationshipSchema = z.enum([
  'self',
  'mother',
  'father',
  'spouse',
  'grandmother',
  'grandfather',
  'other',
]);

// Gender enum schema
export const genderSchema = z.enum(['male', 'female', 'other']);

// Create profile schema
export const createProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  relationship: relationshipSchema,
  dob: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable(),
  gender: genderSchema.optional().nullable(),
});

// Update profile schema (all fields optional)
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  relationship: relationshipSchema.optional(),
  dob: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable(),
  gender: genderSchema.optional().nullable(),
});

// Profile ID parameter schema
export const profileIdParamSchema = z.object({
  id: z.string().uuid('Invalid profile ID format'),
});

// Export types inferred from schemas
export type CreateProfileDto = z.infer<typeof createProfileSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ProfileIdParam = z.infer<typeof profileIdParamSchema>;
