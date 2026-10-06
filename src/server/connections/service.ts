import { db, connections, users } from '@/lib/db';
import {
  Connection,
  ConnectionStatus,
  ConnectionWithUser,
  RelationshipState,
  IncomingConnectionRequest,
  OutgoingConnectionRequest,
} from '@/lib/types';
import { eq, or, and, inArray, desc } from 'drizzle-orm';

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
   * Computes relationship state between a viewer and a target user.
   */
  static async getRelationshipState(
    viewerId: string,
    targetUserId: string
  ): Promise<{ state: RelationshipState; connectionId: string | null }> {
    if (viewerId === targetUserId) {
      return { state: 'SELF', connectionId: null };
    }

    const [record] = await db
      .select()
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, viewerId), eq(connections.recipientId, targetUserId)),
          and(eq(connections.requesterId, targetUserId), eq(connections.recipientId, viewerId))
        )
      )
      .limit(1);

    if (!record || record.status === 'REMOVED') {
      return { state: 'NO_CONNECTION', connectionId: null };
    }

    if (record.status === 'ACCEPTED') {
      return { state: 'CONNECTED', connectionId: record.id };
    }

    if (record.status === 'PENDING') {
      if (record.requesterId === viewerId) {
        return { state: 'OUTGOING_PENDING', connectionId: record.id };
      }
      return { state: 'INCOMING_PENDING', connectionId: record.id };
    }

    if (record.status === 'REJECTED') {
      return { state: 'REJECTED', connectionId: record.id };
    }

    if (record.status === 'BLOCKED') {
      return { state: 'BLOCKED', connectionId: record.id };
    }

    return { state: 'NO_CONNECTION', connectionId: null };
  }

  /**
   * Batch resolves relationship states for a set of target users.
   */
  static async getRelationshipStatesBatch(
    viewerId: string,
    targetUserIds: string[]
  ): Promise<Map<string, { state: RelationshipState; connectionId: string | null }>> {
    const resultMap = new Map<string, { state: RelationshipState; connectionId: string | null }>();

    if (targetUserIds.length === 0) {
      return resultMap;
    }

    // Default each to NO_CONNECTION (or SELF)
    for (const tid of targetUserIds) {
      if (tid === viewerId) {
        resultMap.set(tid, { state: 'SELF', connectionId: null });
      } else {
        resultMap.set(tid, { state: 'NO_CONNECTION', connectionId: null });
      }
    }

    const externalTargetIds = targetUserIds.filter((tid) => tid !== viewerId);
    if (externalTargetIds.length === 0) {
      return resultMap;
    }

    const records = await db
      .select()
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, viewerId), inArray(connections.recipientId, externalTargetIds)),
          and(inArray(connections.requesterId, externalTargetIds), eq(connections.recipientId, viewerId))
        )
      );

    for (const record of records) {
      const partnerId = record.requesterId === viewerId ? record.recipientId : record.requesterId;

      if (record.status === 'ACCEPTED') {
        resultMap.set(partnerId, { state: 'CONNECTED', connectionId: record.id });
      } else if (record.status === 'PENDING') {
        if (record.requesterId === viewerId) {
          resultMap.set(partnerId, { state: 'OUTGOING_PENDING', connectionId: record.id });
        } else {
          resultMap.set(partnerId, { state: 'INCOMING_PENDING', connectionId: record.id });
        }
      } else if (record.status === 'REJECTED') {
        resultMap.set(partnerId, { state: 'REJECTED', connectionId: record.id });
      } else if (record.status === 'BLOCKED') {
        resultMap.set(partnerId, { state: 'BLOCKED', connectionId: record.id });
      } else if (record.status === 'REMOVED') {
        resultMap.set(partnerId, { state: 'NO_CONNECTION', connectionId: null });
      }
    }

    return resultMap;
  }

  /**
   * Request a connection to another user.
   * Enforces:
   * - No self-connections
   * - Target user must exist
   * - Rejects duplicate requests or already-connected relationships
   * - Reactivates previous REMOVED/REJECTED connection row to avoid unique pair collisions
   */
  static async requestConnection(
    requesterId: string,
    recipientId: string
  ): Promise<Connection> {
    if (requesterId === recipientId) {
      throw new Error('INVALID_REQUEST: Self-connections are forbidden');
    }

    // Verify recipient user exists
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!targetUser) {
      throw new Error('NOT_FOUND: Target user does not exist');
    }

    // Check existing connection
    const [existing] = await db
      .select()
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, requesterId), eq(connections.recipientId, recipientId)),
          and(eq(connections.requesterId, recipientId), eq(connections.recipientId, requesterId))
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new Error('CONFLICT: You are already connected with this user');
      }

      if (existing.status === 'PENDING') {
        if (existing.requesterId === requesterId) {
          throw new Error('CONFLICT: Connection request already sent');
        }
        throw new Error('CONFLICT: This user has already sent you a connection request');
      }

      if (existing.status === 'BLOCKED') {
        throw new Error('FORBIDDEN: Cannot request connection with this user');
      }

      // If REMOVED or REJECTED, reactivate as PENDING request
      const [updated] = await db
        .update(connections)
        .set({
          requesterId,
          recipientId,
          status: 'PENDING',
          updatedAt: new Date(),
        })
        .where(eq(connections.id, existing.id))
        .returning();

      return updated as Connection;
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
   * Accept an incoming connection request.
   * Enforces:
   * - Only the recipient can accept
   * - Connection must be in PENDING state
   */
  static async acceptRequest(
    actorId: string,
    connectionId: string
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

    if (existing.recipientId !== actorId) {
      throw new Error('FORBIDDEN: Only the recipient can accept a connection request');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('INVALID_REQUEST: Connection is not in pending state');
    }

    const [record] = await db
      .update(connections)
      .set({ status: 'ACCEPTED', updatedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    return record as Connection;
  }

  /**
   * Decline an incoming connection request.
   * Enforces:
   * - Only the recipient can decline/reject
   * - Connection must be in PENDING state
   */
  static async rejectRequest(
    actorId: string,
    connectionId: string
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

    if (existing.recipientId !== actorId) {
      throw new Error('FORBIDDEN: Only the recipient can decline a connection request');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('INVALID_REQUEST: Connection is not in pending state');
    }

    const [record] = await db
      .update(connections)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    return record as Connection;
  }

  /**
   * Cancel an outgoing connection request.
   * Enforces:
   * - Only the requester can cancel
   * - Connection must be in PENDING state
   */
  static async cancelRequest(
    actorId: string,
    connectionId: string
  ): Promise<void> {
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

    if (existing.requesterId !== actorId) {
      throw new Error('FORBIDDEN: Only the requester can cancel their connection request');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('INVALID_REQUEST: Only pending requests can be cancelled');
    }

    await db.delete(connections).where(eq(connections.id, connectionId));
  }

  /**
   * Remove an accepted connection.
   * Enforces:
   * - Only participants of the connection can remove it
   * - Connection must be in ACCEPTED state
   */
  static async removeConnection(
    actorId: string,
    connectionId: string
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

    if (existing.status !== 'ACCEPTED') {
      throw new Error('INVALID_REQUEST: Only accepted connections can be removed');
    }

    const [record] = await db
      .update(connections)
      .set({ status: 'REMOVED', updatedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    return record as Connection;
  }

  /**
   * Update the status of a connection with server-side actor verification.
   * Backward-compatible delegation for existing tests and endpoints.
   */
  static async updateConnectionStatus(
    actorId: string,
    connectionId: string,
    status: ConnectionStatus
  ): Promise<Connection> {
    if (status === 'ACCEPTED') {
      return this.acceptRequest(actorId, connectionId);
    }
    if (status === 'REJECTED') {
      return this.rejectRequest(actorId, connectionId);
    }
    if (status === 'REMOVED') {
      return this.removeConnection(actorId, connectionId);
    }

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

  /**
   * Returns list of accepted connections with partner profiles for the authenticated user.
   */
  static async getAcceptedConnections(userId: string): Promise<ConnectionWithUser[]> {
    const connectionRows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.status, 'ACCEPTED'),
          or(eq(connections.requesterId, userId), eq(connections.recipientId, userId))
        )
      )
      .orderBy(desc(connections.updatedAt));

    if (connectionRows.length === 0) {
      return [];
    }

    const partnerIds = connectionRows.map((c) =>
      c.requesterId === userId ? c.recipientId : c.requesterId
    );

    const partnerUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(inArray(users.id, partnerIds));

    const userMap = new Map(partnerUsers.map((u) => [u.id, u]));

    const result: ConnectionWithUser[] = [];
    for (const c of connectionRows) {
      const partnerId = c.requesterId === userId ? c.recipientId : c.requesterId;
      const partner = userMap.get(partnerId);
      if (partner) {
        result.push({
          id: c.id,
          requesterId: c.requesterId,
          recipientId: c.recipientId,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          connectedUser: partner,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves incoming pending connection requests for the authenticated user.
   */
  static async getIncomingPendingRequests(
    userId: string
  ): Promise<IncomingConnectionRequest[]> {
    const requestRows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.recipientId, userId),
          eq(connections.status, 'PENDING')
        )
      )
      .orderBy(desc(connections.createdAt));

    if (requestRows.length === 0) {
      return [];
    }

    const requesterIds = requestRows.map((r) => r.requesterId);
    const requesterUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(inArray(users.id, requesterIds));

    const userMap = new Map(requesterUsers.map((u) => [u.id, u]));

    const result: IncomingConnectionRequest[] = [];
    for (const r of requestRows) {
      const requester = userMap.get(r.requesterId);
      if (requester) {
        result.push({
          id: r.id,
          requester,
          createdAt: r.createdAt,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves outgoing pending connection requests initiated by the authenticated user.
   */
  static async getOutgoingPendingRequests(
    userId: string
  ): Promise<OutgoingConnectionRequest[]> {
    const requestRows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.requesterId, userId),
          eq(connections.status, 'PENDING')
        )
      )
      .orderBy(desc(connections.createdAt));

    if (requestRows.length === 0) {
      return [];
    }

    const recipientIds = requestRows.map((r) => r.recipientId);
    const recipientUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(inArray(users.id, recipientIds));

    const userMap = new Map(recipientUsers.map((u) => [u.id, u]));

    const result: OutgoingConnectionRequest[] = [];
    for (const r of requestRows) {
      const recipient = userMap.get(r.recipientId);
      if (recipient) {
        result.push({
          id: r.id,
          recipient,
          createdAt: r.createdAt,
        });
      }
    }

    return result;
  }
}

