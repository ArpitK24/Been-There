import { z } from 'zod';
import { visibilitySchema } from './activity';

export const updatePrivacySchema = z.object({
  activityDefaultVisibility: visibilitySchema.optional(),
  hidePreciseLocations: z.boolean().optional(),
  hideExactTimestamps: z.boolean().optional(),
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
