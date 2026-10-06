import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must not exceed 50 characters')
    .optional(),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    )
    .transform((val) => (val ? val.toLowerCase() : val))
    .optional(),
  avatarUrl: z.string().url('Must be a valid URL').nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
