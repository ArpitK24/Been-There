import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ActivitiesService } from '@/server/activities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: placeId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const summary = await ActivitiesService.getVisibleConnectedActivityForPlace(
      user.id,
      placeId
    );

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('API Error /api/places/[id]/activity-summary:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve place activity summary' },
      { status: 500 }
    );
  }
}
