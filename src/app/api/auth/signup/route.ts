import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { signupSchema } from '@/lib/validation';
import { UsersService } from '@/server/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, password, displayName, username } = validation.data;

    // 1. Verify username availability in the Been-There database
    const isAvailable = await UsersService.isUsernameAvailable(username);
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'Username is already taken. Please choose another username.',
        },
        { status: 409 }
      );
    }

    // 2. Perform Supabase Auth signup
    const supabase = await createServerSupabaseClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username,
        },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      // Do not leak exact internal errors; provide clear user-facing messages
      const isRateLimit = error.message.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        return NextResponse.json(
          { error: 'Too many signup attempts. Please try again later.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Unable to complete signup. Please verify your details or try logging in.' },
        { status: 400 }
      );
    }

    // 3. If Supabase created the user, establish the initial Been-There profile
    if (data.user) {
      try {
        await UsersService.createProfile(data.user.id, {
          username,
          displayName,
        });
      } catch {
        // If initial profile creation collided or already exists, ensureProfile will self-heal
        await UsersService.ensureProfile({
          id: data.user.id,
          email,
          user_metadata: { username, display_name: displayName },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      requiresVerification: true,
      email,
    });
  } catch (error) {
    console.error('API Error in /api/auth/signup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
