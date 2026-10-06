import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { updateConnectionSchema } from '@/lib/validation';
import { ConnectionsService } from '@/server/connections';
import { db, connections } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedUser();
    const { id: connectionId } = await context.params;

    const body = await request.json();
    const validation = updateConnectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid connection update parameters',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { action, status } = validation.data;

    let result;
    if (action === 'ACCEPT' || status === 'ACCEPTED') {
      result = await ConnectionsService.acceptRequest(user.id, connectionId);
    } else if (action === 'REJECT' || status === 'REJECTED') {
      result = await ConnectionsService.rejectRequest(user.id, connectionId);
    } else if (action === 'CANCEL') {
      await ConnectionsService.cancelRequest(user.id, connectionId);
      return NextResponse.json({ success: true, message: 'Connection request cancelled' });
    } else if (action === 'REMOVE' || status === 'REMOVED') {
      result = await ConnectionsService.removeConnection(user.id, connectionId);
    } else {
      return NextResponse.json({ error: 'Unsupported action or status' }, { status: 400 });
    }

    return NextResponse.json({ success: true, connection: result });
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
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json({ error: msg.replace('FORBIDDEN: ', '') }, { status: 403 });
    }

    console.error('API Error in PATCH /api/connections/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedUser();
    const { id: connectionId } = await context.params;

    // Check existing connection status to decide cancel vs remove
    const [existing] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (existing.status === 'PENDING') {
      await ConnectionsService.cancelRequest(user.id, connectionId);
      return NextResponse.json({ success: true, message: 'Request cancelled successfully' });
    }

    if (existing.status === 'ACCEPTED') {
      await ConnectionsService.removeConnection(user.id, connectionId);
      return NextResponse.json({ success: true, message: 'Connection removed successfully' });
    }

    return NextResponse.json(
      { error: 'Connection cannot be deleted or cancelled in its current state' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json({ error: msg.replace('FORBIDDEN: ', '') }, { status: 403 });
    }
    if (msg.includes('NOT_FOUND')) {
      return NextResponse.json({ error: msg.replace('NOT_FOUND: ', '') }, { status: 404 });
    }

    console.error('API Error in DELETE /api/connections/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
