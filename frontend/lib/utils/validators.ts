import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  relationship: z.enum(['self', 'mother', 'father', 'spouse', 'grandmother', 'grandfather', 'other']),
  dob: z.string().optional().default(''),
  gender: z.enum(['male', 'female', 'other']),
});

export type LoginFormData   = z.infer<typeof loginSchema>;
export type SignupFormData  = z.infer<typeof signupSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
