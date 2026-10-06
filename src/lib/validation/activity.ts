import { z } from 'zod';

export const activityTypeSchema = z.enum([
  'VISITED',
  'ORDERED',
]);

export const recommendationSchema = z.enum([
  'RECOMMEND',
  'NEUTRAL',
  'DO_NOT_RECOMMEND',
]);

export const visibilitySchema = z.enum([
  'PRIVATE',
  'CONNECTIONS',
]);

export const createActivitySchema = z.object({
  placeId: z.string().uuid('Invalid place UUID'),
  type: activityTypeSchema.default('VISITED'),
  recommendation: recommendationSchema.default('RECOMMEND'),
  visitCount: z.number().int().min(1, 'Visit count must be at least 1').default(1),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  visibility: visibilitySchema.default('CONNECTIONS'),
  note: z.string().max(500, 'Note must not exceed 500 characters').optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
