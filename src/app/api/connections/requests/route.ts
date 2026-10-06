import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { ConnectionsService } from '@/server/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireVerifiedUser();

    const [incomingRequests, outgoingRequests] = await Promise.all([
      ConnectionsService.getIncomingPendingRequests(user.id),
      ConnectionsService.getOutgoingPendingRequests(user.id),
    ]);

    return NextResponse.json({
      requests: incomingRequests,
      incoming: incomingRequests,
      outgoing: outgoingRequests,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json({ error: 'Email confirmation required' }, { status: 403 });
    }
    console.error('API Error in GET /api/connections/requests:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve connection requests' },
      { status: 500 }
    );
  }
}
