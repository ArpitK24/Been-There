import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { createConnectionSchema } from '@/lib/validation';
import { ConnectionsService } from '@/server/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const connectionsList = await ConnectionsService.getAcceptedConnections(user.id);

    return NextResponse.json({ connections: connectionsList });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    console.error('API Error in GET /api/connections:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const body = await request.json();

    const validation = createConnectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid connection request',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const targetUserId = (validation.data.targetUserId || validation.data.recipientId)!;

    const connection = await ConnectionsService.requestConnection(
      user.id,
      targetUserId
    );

    return NextResponse.json({ success: true, connection }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    if (msg.includes('INVALID_REQUEST')) {
      return NextResponse.json({ error: msg.replace('INVALID_REQUEST: ', '') }, { status: 400 });
    }
    if (msg.includes('NOT_FOUND')) {
      return NextResponse.json({ error: msg.replace('NOT_FOUND: ', '') }, { status: 404 });
    }
    if (msg.includes('CONFLICT')) {
      return NextResponse.json({ error: msg.replace('CONFLICT: ', '') }, { status: 409 });
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json({ error: msg.replace('FORBIDDEN: ', '') }, { status: 403 });
    }

    console.error('API Error in POST /api/connections:', error);
    return NextResponse.json(
      { error: 'Failed to create connection request' },
      { status: 500 }
    );
  }
}
