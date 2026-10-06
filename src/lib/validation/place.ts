import { z } from 'zod';

export const placeSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query must not be empty').max(100),
  category: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
});

export const createPlaceSchema = z.object({
  provider: z.string().min(1),
  providerPlaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  branch: z.string().optional(),
});

export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
