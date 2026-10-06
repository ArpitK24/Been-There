import { createServerSupabaseClient } from './supabase-server';
import { User } from '@/lib/types';
import { UsersService } from '@/server/users';

export interface AuthSessionUser extends User {
  email: string;
  isEmailVerified: boolean;
}

/**
 * Retrieves the full authenticated session user, including email verification state
 * and synchronized Been-There domain profile.
 */
export async function getAuthSession(): Promise<AuthSessionUser | null> {
  // Explicit test fixture mode (for automated unit & integration tests)
  if (process.env.APP_MODE === 'test') {
    const testMode = process.env.TEST_AUTH_STATE || 'verified';
    if (testMode === 'unauthenticated') {
      return null;
    }
    return {
      id: 'a0000000-0000-4000-a000-000000000001',
      username: 'alex_mercer',
      displayName: 'Alex Mercer',
      avatarUrl: null,
      email: 'alex@example.com',
      isEmailVerified: testMode === 'verified',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return null;
    }

    // Ensure Been-There application profile is synchronized
    const profile = await UsersService.ensureProfile({
      id: authUser.id,
      email: authUser.email,
      user_metadata: authUser.user_metadata,
    });

    const isEmailVerified = Boolean(
      authUser.email_confirmed_at || authUser.confirmed_at
    );

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      email: authUser.email || '',
      isEmailVerified,
      createdAt: profile.createdAt,
    };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string'
    ) {
      const digest = (err as { digest: string }).digest;
      if (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
    }

    if (process.env.NODE_ENV !== 'production' && process.env.APP_MODE === 'test') {
      return null;
    }
    console.error('Error retrieving auth session:', err);
    return null;
  }
}

/**
 * Backward-compatible helper returning the authenticated User model.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getAuthSession();
  if (!session) return null;
  return {
    id: session.id,
    username: session.username,
    displayName: session.displayName,
    avatarUrl: session.avatarUrl,
    createdAt: session.createdAt,
  };
}

/**
 * Enforces that a user is authenticated. Throws if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<AuthSessionUser> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('UNAUTHENTICATED: Authentication required');
  }
  return session;
}

/**
 * Enforces that a user is authenticated AND has confirmed their email address.
 * Throws EMAIL_NOT_VERIFIED if authenticated but unconfirmed.
 */
export async function requireVerifiedUser(): Promise<AuthSessionUser> {
  const session = await requireAuthenticatedUser();
  if (!session.isEmailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED: Email confirmation required');
  }
  return session;
}

/**
 * Backward-compatible requireAuth alias.
 */
export async function requireAuth(): Promise<User> {
  return requireVerifiedUser();
}
