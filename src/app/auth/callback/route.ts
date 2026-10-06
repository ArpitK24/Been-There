import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { UsersService } from '@/server/users';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as 'signup' | 'email' | null;
  const next = requestUrl.searchParams.get('next') || '/profile';

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure application profile is synchronized upon confirmation
      await UsersService.ensureProfile({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      });
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) {
      await UsersService.ensureProfile({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      });
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If verification failed or expired, redirect to verify-email with error state
  return NextResponse.redirect(
    new URL('/verify-email?error=invalid_or_expired', requestUrl.origin)
  );
}
