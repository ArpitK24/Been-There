import { describe, it, expect } from 'vitest';
import {
  createActivitySchema,
  updateActivitySchema,
  createConnectionSchema,
  placeSearchQuerySchema,
  updatePrivacySchema,
} from '@/lib/validation';

describe('Domain Validation Foundation', () => {
  const validUUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  describe('Activity Validation', () => {
    it('should validate valid activity input', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'RECOMMEND',
        visitCount: 3,
        activityDate: '2026-10-01',
        visibility: 'CONNECTIONS',
        note: 'Loved the cold brew',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid visit count (< 1)', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'RECOMMEND',
        visitCount: 0,
        activityDate: '2026-10-01',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer visit count', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'RECOMMEND',
        visitCount: 2.5,
        activityDate: '2026-10-01',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid recommendation values', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'FIVE_STARS', // Not an allowed enum
        activityDate: '2026-10-01',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject unsupported visibility values', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'RECOMMEND',
        visibility: 'PUBLIC', // Only PRIVATE and CONNECTIONS allowed in MVP
        activityDate: '2026-10-01',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid activity type values', () => {
      const input = {
        placeId: validUUID,
        type: 'REVIEW', // Not a supported activity type
        recommendation: 'RECOMMEND',
        activityDate: '2026-10-01',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const input = {
        placeId: validUUID,
        type: 'VISITED',
        recommendation: 'RECOMMEND',
        activityDate: '10/01/2026',
      };

      const result = createActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate partial update input', () => {
      const input = {
        recommendation: 'NEUTRAL' as const,
        visitCount: 5,
      };

      const result = updateActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Connection Validation', () => {
    it('should validate valid recipient UUID', () => {
      const input = {
        recipientId: validUUID,
      };

      const result = createConnectionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject non-uuid recipient ID', () => {
      const input = {
        recipientId: 'not-a-valid-uuid',
      };

      const result = createConnectionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Place Search Validation', () => {
    it('should validate search query string', () => {
      const result = placeSearchQuerySchema.safeParse({ q: 'Coffee' });
      expect(result.success).toBe(true);
    });

    it('should reject empty search query', () => {
      const result = placeSearchQuerySchema.safeParse({ q: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('Privacy Setting Validation', () => {
    it('should validate privacy update with CONNECTIONS default', () => {
      const result = updatePrivacySchema.safeParse({
        activityDefaultVisibility: 'CONNECTIONS',
        hidePreciseLocations: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
