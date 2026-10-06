import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validation';
import { UsersService } from '@/server/users';

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const profile = await UsersService.getById(user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    console.error('API Error in GET /api/me/profile:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid profile data',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updated = await UsersService.updateProfile(
      user.id,
      user.id,
      validation.data
    );

    return NextResponse.json({
      success: true,
      profile: {
        ...updated,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    if (msg.includes('CONFLICT')) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('API Error in PATCH /api/me/profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
