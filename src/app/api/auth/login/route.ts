import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { UsersService } from '@/server/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Please enter a valid email and password.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const isUnverified = error.message.toLowerCase().includes('email not confirmed');
      if (isUnverified) {
        return NextResponse.json(
          {
            error: 'Your email address has not been confirmed yet.',
            requiresVerification: true,
            email,
          },
          { status: 403 }
        );
      }

      // Safe generic message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check email confirmation status on the user record
    const isEmailVerified = Boolean(
      data.user.email_confirmed_at || data.user.confirmed_at
    );

    // Synchronize Been-There profile
    await UsersService.ensureProfile({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    });

    if (!isEmailVerified) {
      return NextResponse.json(
        {
          error: 'Your email address has not been confirmed yet.',
          requiresVerification: true,
          email,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('API Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
