import { db, users } from '@/lib/db';
import { User } from '@/lib/types';
import { UpdateProfileInput } from '@/lib/validation';
import { eq, and, ne, sql } from 'drizzle-orm';

export class UsersService {
  /**
   * Retrieve user profile by internal UUID.
   */
  static async getById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return (user as User) || null;
  }

  /**
   * Retrieve user profile by unique username.
   */
  static async getByUsername(username: string): Promise<User | null> {
    const normalized = username.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = ${normalized}`)
      .limit(1);

    return (user as User) || null;
  }

  /**
   * Checks whether a username is available.
   * Optionally excludes an existing user ID (for username updates).
   */
  static async isUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    const conditions = [sql`LOWER(${users.username}) = ${normalized}`];

    if (excludeUserId) {
      conditions.push(ne(users.id, excludeUserId));
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return !existing;
  }

  /**
   * Creates an initial profile record linked to the Supabase Auth user ID.
   */
  static async createProfile(
    userId: string,
    data: {
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    }
  ): Promise<User> {
    const isAvailable = await this.isUsernameAvailable(data.username);
    if (!isAvailable) {
      throw new Error('CONFLICT: Username is already taken');
    }

    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        username: data.username.trim().toLowerCase(),
        displayName: data.displayName.trim(),
        avatarUrl: data.avatarUrl || null,
      })
      .returning();

    return created as User;
  }

  /**
   * Self-healing profile synchronization:
   * Ensures a Been-There application profile exists for the authenticated Supabase user.
   * If initial profile creation failed, this safely resolves from user_metadata.
   */
  static async ensureProfile(authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }): Promise<User> {
    const existing = await this.getById(authUser.id);
    if (existing) {
      return existing;
    }

    // Attempt recovery from auth user_metadata
    const metaUsername =
      typeof authUser.user_metadata?.username === 'string'
        ? authUser.user_metadata.username.trim().toLowerCase()
        : null;

    const metaDisplayName =
      typeof authUser.user_metadata?.display_name === 'string'
        ? authUser.user_metadata.display_name.trim()
        : authUser.email?.split('@')[0] || 'Member';

    // If metadata username is available, verify or synthesize a valid unique fallback
    let candidateUsername = metaUsername || (authUser.email?.split('@')[0] || 'user').toLowerCase();
    candidateUsername = candidateUsername.replace(/[^a-z0-9_]/g, '_').slice(0, 25);
    if (candidateUsername.length < 3) {
      candidateUsername = `user_${authUser.id.slice(0, 6)}`;
    }

    const isAvailable = await this.isUsernameAvailable(candidateUsername);
    if (!isAvailable) {
      candidateUsername = `${candidateUsername}_${authUser.id.slice(0, 4)}`;
    }

    const [created] = await db
      .insert(users)
      .values({
        id: authUser.id,
        username: candidateUsername,
        displayName: metaDisplayName,
        avatarUrl: null,
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      return created as User;
    }

    // If onConflictDoNothing occurred (e.g. race condition), retrieve existing record
    const reloaded = await this.getById(authUser.id);
    if (!reloaded) {
      throw new Error('FAILED_PROFILE_CREATION: Could not synchronize profile');
    }
    return reloaded;
  }

  /**
   * Update user profile with strict server-side actor validation.
   * Enforces:
   * - Actor cannot modify another user's profile
   * - Username changes must maintain database uniqueness
   */
  static async updateProfile(
    actorUserId: string,
    targetUserId: string,
    input: UpdateProfileInput
  ): Promise<User> {
    if (actorUserId !== targetUserId) {
      throw new Error('FORBIDDEN: You do not have permission to modify this profile');
    }

    if (input.username) {
      const isAvailable = await this.isUsernameAvailable(input.username, targetUserId);
      if (!isAvailable) {
        throw new Error('CONFLICT: Username is already taken');
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName.trim();
    }
    if (input.username !== undefined) {
      updateData.username = input.username.trim().toLowerCase();
    }
    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = input.avatarUrl;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId))
      .returning();

    if (!updated) {
      throw new Error('NOT_FOUND: Profile not found');
    }

    return updated as User;
  }
}
