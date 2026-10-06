import { z } from 'zod';

export const connectionStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'BLOCKED',
  'REMOVED',
]);

export const createConnectionSchema = z.object({
  recipientId: z.string().uuid('Recipient ID must be a valid UUID'),
});

export const updateConnectionSchema = z.object({
  status: connectionStatusSchema,
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
