import { z } from 'zod';
import { validateSignupEmail } from '@/lib/auth/email-policy';

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .superRefine((val, ctx) => {
        const policy = validateSignupEmail(val);
        if (!policy.isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: policy.error || 'Invalid email address',
          });
        }
      })
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must not exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    displayName: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name must not exceed 50 characters'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must not exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      )
      .transform((val) => val.toLowerCase()),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase()),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
