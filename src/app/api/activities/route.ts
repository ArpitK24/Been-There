import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ActivitiesService } from '@/server/activities';
import { createActivitySchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid activity data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const activity = await ActivitiesService.recordActivity(user.id, validation.data);
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('API Error /api/activities:', error);
    return NextResponse.json(
      { error: 'Failed to record activity' },
      { status: 500 }
    );
  }
}
