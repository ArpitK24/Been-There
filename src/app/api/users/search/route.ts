import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { userSearchQuerySchema } from '@/lib/validation';
import { UsersService } from '@/server/users';
import { ConnectionsService } from '@/server/connections';
import { UserSearchResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireVerifiedUser();

    const searchParams = request.nextUrl.searchParams;
    const rawUsername = searchParams.get('username') || searchParams.get('q') || '';
    const rawLimit = searchParams.get('limit') || '10';

    const validation = userSearchQuerySchema.safeParse({
      username: rawUsername,
      limit: rawLimit,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const query = (validation.data.username || validation.data.q || '').trim();
    if (!query) {
      return NextResponse.json({ users: [] });
    }

    const candidateUsers = await UsersService.searchByUsername(
      user.id,
      query,
      validation.data.limit
    );

    if (candidateUsers.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Resolve relationship states in batch
    const candidateIds = candidateUsers.map((u) => u.id);
    const relationshipMap = await ConnectionsService.getRelationshipStatesBatch(
      user.id,
      candidateIds
    );

    const results: UserSearchResult[] = candidateUsers.map((u) => {
      const rel = relationshipMap.get(u.id) || {
        state: 'NO_CONNECTION',
        connectionId: null,
      };

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        connectionState: rel.state,
        connectionId: rel.connectionId,
      };
    });

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return NextResponse.json(
        { error: 'Email confirmation required to search people' },
        { status: 403 }
      );
    }
    console.error('API Error in GET /api/users/search:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
