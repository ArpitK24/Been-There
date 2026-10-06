import { db, connections } from '@/lib/db';
import { Connection, ConnectionStatus } from '@/lib/types';
import { eq, or, and } from 'drizzle-orm';

export class ConnectionsService {
  /**
   * Returns list of user IDs that have an ACCEPTED connection with the given user.
   * Enforces that pending, rejected, or blocked connections are never included.
   */
  static async getAcceptedConnectionIds(userId: string): Promise<Set<string>> {
    const acceptedIds = new Set<string>();

    const records = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.status, 'ACCEPTED'),
          or(eq(connections.requesterId, userId), eq(connections.recipientId, userId))
        )
      );

    for (const rec of records) {
      const partnerId = rec.requesterId === userId ? rec.recipientId : rec.requesterId;
      acceptedIds.add(partnerId);
    }

    return acceptedIds;
  }

  /**
   * Request a connection to another user.
   * Enforces database-level constraint: self-connections are forbidden.
   */
  static async requestConnection(
    requesterId: string,
    recipientId: string
  ): Promise<Connection> {
    if (requesterId === recipientId) {
      throw new Error('INVALID_REQUEST: Self-connections are forbidden');
    }

    const [record] = await db
      .insert(connections)
      .values({
        requesterId,
        recipientId,
        status: 'PENDING',
      })
      .returning();

    return record as Connection;
  }

  /**
   * Update the status of a connection with server-side actor verification.
   * Enforces that third parties cannot alter connection state.
   */
  static async updateConnectionStatus(
    actorId: string,
    connectionId: string,
    status: ConnectionStatus
  ): Promise<Connection> {
    const [existing] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!existing) {
      throw new Error('NOT_FOUND: Connection does not exist');
    }

    if (existing.requesterId !== actorId && existing.recipientId !== actorId) {
      throw new Error('FORBIDDEN: You do not have permission to alter this connection');
    }

    const [record] = await db
      .update(connections)
      .set({ status, updatedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    return record as Connection;
  }
}
