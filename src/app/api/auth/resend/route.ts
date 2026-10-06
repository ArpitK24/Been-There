import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { resendVerificationSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resendVerificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const supabase = await createServerSupabaseClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      const isRateLimit = error.message.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        return NextResponse.json(
          { error: 'Please wait a moment before requesting another link.' },
          { status: 429 }
        );
      }
    }

    // Always return safe success message to avoid email enumeration
    return NextResponse.json({
      success: true,
      message: 'If your account is registered and unconfirmed, a verification link has been sent.',
    });
  } catch (error) {
    console.error('API Error in /api/auth/resend:', error);
    return NextResponse.json(
      { error: 'Unable to resend verification link. Please try again later.' },
      { status: 500 }
    );
  }
}
