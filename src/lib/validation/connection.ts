import { z } from 'zod';

export const connectionStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'BLOCKED',
  'REMOVED',
]);

export const connectionActionSchema = z.enum([
  'ACCEPT',
  'REJECT',
  'CANCEL',
  'REMOVE',
]);

export const createConnectionSchema = z
  .object({
    targetUserId: z.string().uuid('Target user ID must be a valid UUID').optional(),
    recipientId: z.string().uuid('Recipient ID must be a valid UUID').optional(),
  })
  .refine((data) => Boolean(data.targetUserId || data.recipientId), {
    message: 'Either targetUserId or recipientId is required',
    path: ['targetUserId'],
  });

export const updateConnectionSchema = z
  .object({
    status: connectionStatusSchema.optional(),
    action: connectionActionSchema.optional(),
  })
  .refine((data) => Boolean(data.status || data.action), {
    message: 'Either status or action must be provided',
  });

export const userSearchQuerySchema = z.object({
  username: z.string().trim().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type ConnectionAction = z.infer<typeof connectionActionSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;

