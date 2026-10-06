import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signupSchema, updateProfileSchema } from '@/lib/validation';
import { UsersService } from '@/server/users';
import { requireAuthenticatedUser, requireVerifiedUser } from '@/lib/auth';

// Mock DB for UsersService testing
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  users: {
    id: 'id',
    username: 'username',
    displayName: 'display_name',
    avatarUrl: 'avatar_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

import { db } from '@/lib/db';

describe('Phase 2: Authentication & Profiles Domain Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TEST_AUTH_STATE;
    process.env.APP_MODE = 'test';
  });

  describe('Username Validation & Constraints', () => {
    it('accepts valid alphanumeric usernames with underscores', () => {
      const validUsernames = ['alex_mercer', 'john_doe123', 'sarah99', 'user_name'];
      for (const u of validUsernames) {
        const result = signupSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          displayName: 'Test User',
          username: u,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects usernames that are too short, have special characters, or spaces', () => {
      const invalidUsernames = [
        'ab', // < 3 chars
        'alex mercer', // spaces
        'alex-mercer', // hyphens (only underscores allowed)
        'alex@mercer', // special characters
        'alex.mercer', // dots
        '', // empty
      ];

      for (const u of invalidUsernames) {
        const result = signupSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          displayName: 'Test User',
          username: u,
        });
        expect(result.success).toBe(false);
      }
    });

    it('normalizes uppercase usernames to lowercase', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'Test User',
        username: 'ALEX_MERCER',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('alex_mercer');
      }
    });

    it('detects duplicate usernames via UsersService.isUsernameAvailable', async () => {
      // Mock db returning existing record for username 'taken_user'
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'usr_existing' }]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const isAvailable = await UsersService.isUsernameAvailable('taken_user');
      expect(isAvailable).toBe(false);
    });

    it('returns true when username is not taken', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const isAvailable = await UsersService.isUsernameAvailable('new_unique_user');
      expect(isAvailable).toBe(true);
    });
  });

  describe('Profile Authorization Guards', () => {
    const ownerId = 'usr_owner_01';
    const attackerId = 'usr_attacker_02';

    it('allows a user to update their own profile', async () => {
      // Mock availability check returning true (empty)
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: ownerId,
                username: 'alex_updated',
                displayName: 'Alex New',
                avatarUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      });
      (db.update as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUpdate);

      const updated = await UsersService.updateProfile(ownerId, ownerId, {
        displayName: 'Alex New',
        username: 'alex_updated',
      });

      expect(updated.displayName).toBe('Alex New');
      expect(updated.username).toBe('alex_updated');
    });

    it('strictly forbids a user from modifying another user profile', async () => {
      await expect(
        UsersService.updateProfile(attackerId, ownerId, {
          displayName: 'Hacked Name',
        })
      ).rejects.toThrow('FORBIDDEN: You do not have permission to modify this profile');
    });

    it('rejects profile update if target username is already taken by another user', async () => {
      // Mock db returning an existing record for username check
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'other_user_id' }]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      await expect(
        UsersService.updateProfile(ownerId, ownerId, {
          username: 'already_taken',
        })
      ).rejects.toThrow('CONFLICT: Username is already taken');
    });

    it('validates profile update input via updateProfileSchema', () => {
      const valid = updateProfileSchema.safeParse({
        displayName: 'New Name',
        username: 'NEW_HANDLE',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.username).toBe('new_handle');
      }

      const invalid = updateProfileSchema.safeParse({
        username: 'invalid handle with spaces',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Verification & Authentication Gating', () => {
    it('rejects unauthenticated user in requireAuthenticatedUser and requireVerifiedUser', async () => {
      process.env.TEST_AUTH_STATE = 'unauthenticated';

      await expect(requireAuthenticatedUser()).rejects.toThrow(
        'UNAUTHENTICATED: Authentication required'
      );
      await expect(requireVerifiedUser()).rejects.toThrow(
        'UNAUTHENTICATED: Authentication required'
      );
    });

    it('authenticated but unverified user passes requireAuthenticatedUser but is blocked by requireVerifiedUser', async () => {
      process.env.TEST_AUTH_STATE = 'unverified';

      const user = await requireAuthenticatedUser();
      expect(user).toBeDefined();
      expect(user.isEmailVerified).toBe(false);

      await expect(requireVerifiedUser()).rejects.toThrow(
        'EMAIL_NOT_VERIFIED: Email confirmation required'
      );
    });

    it('verified user accesses protected functionality via requireVerifiedUser', async () => {
      process.env.TEST_AUTH_STATE = 'verified';

      const user = await requireVerifiedUser();
      expect(user).toBeDefined();
      expect(user.isEmailVerified).toBe(true);
      expect(user.id).toBe('a0000000-0000-4000-a000-000000000001');
    });
  });
});
