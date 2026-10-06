import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createConnectionSchema,
  updateConnectionSchema,
  userSearchQuerySchema,
} from '@/lib/validation';
import { ConnectionsService } from '@/server/connections';
import { UsersService } from '@/server/users';
import { canViewerAccessActivity, filterVisibleActivities } from '@/lib/privacy/visibility';
import { aggregateConnectedActivityForPlace } from '@/lib/trust/aggregator';
import { Activity } from '@/lib/types';

// Mock database layer
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  connections: {
    id: 'id',
    requesterId: 'requester_id',
    recipientId: 'recipient_id',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  users: {
    id: 'id',
    username: 'username',
    displayName: 'display_name',
    avatarUrl: 'avatar_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

import { db } from '@/lib/db';

describe('Phase 3: Trusted Connections & Social Graph', () => {
  const userA = '00000000-0000-4000-a000-000000000001';
  const userB = '00000000-0000-4000-a000-000000000002';
  const userC = '00000000-0000-4000-a000-000000000003';
  const connId = '11111111-1111-4000-a000-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_MODE = 'test';
  });

  describe('Validation Schemas', () => {
    it('validates connection request with targetUserId or recipientId', () => {
      const valid1 = createConnectionSchema.safeParse({ targetUserId: userB });
      expect(valid1.success).toBe(true);

      const valid2 = createConnectionSchema.safeParse({ recipientId: userB });
      expect(valid2.success).toBe(true);

      const invalidNoId = createConnectionSchema.safeParse({});
      expect(invalidNoId.success).toBe(false);

      const invalidUuid = createConnectionSchema.safeParse({ targetUserId: 'not-a-uuid' });
      expect(invalidUuid.success).toBe(false);
    });

    it('validates connection update actions and statuses', () => {
      expect(updateConnectionSchema.safeParse({ action: 'ACCEPT' }).success).toBe(true);
      expect(updateConnectionSchema.safeParse({ action: 'REJECT' }).success).toBe(true);
      expect(updateConnectionSchema.safeParse({ action: 'CANCEL' }).success).toBe(true);
      expect(updateConnectionSchema.safeParse({ action: 'REMOVE' }).success).toBe(true);
      expect(updateConnectionSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(true);
      expect(updateConnectionSchema.safeParse({}).success).toBe(false);
      expect(updateConnectionSchema.safeParse({ action: 'INVALID' }).success).toBe(false);
    });

    it('validates user search query parameters and limit bounds', () => {
      const valid = userSearchQuerySchema.safeParse({ username: 'rahul', limit: '5' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.limit).toBe(5);
      }

      const defaultLimit = userSearchQuerySchema.safeParse({ username: 'priya' });
      expect(defaultLimit.success).toBe(true);
      if (defaultLimit.success) {
        expect(defaultLimit.data.limit).toBe(10);
      }
    });
  });

  describe('User Discovery & Search Logic', () => {
    it('normalizes search terms by trimming and stripping leading @', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: userB,
                  username: 'rahul',
                  displayName: 'Rahul Sharma',
                  avatarUrl: null,
                },
              ]),
            }),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const results = await UsersService.searchByUsername(userA, '  @Rahul  ');
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('rahul');
    });

    it('returns empty array when search query is empty', async () => {
      const results = await UsersService.searchByUsername(userA, '   ');
      expect(results).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('does not leak emails or private fields in search projection', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: userB,
                  username: 'rahul',
                  displayName: 'Rahul Sharma',
                  avatarUrl: null,
                },
              ]),
            }),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const results = await UsersService.searchByUsername(userA, 'rahul');
      expect(results[0]).not.toHaveProperty('email');
      expect(results[0]).not.toHaveProperty('createdAt');
      expect(results[0]).not.toHaveProperty('password');
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('username');
      expect(results[0]).toHaveProperty('displayName');
    });
  });

  describe('Connection Request Creation', () => {
    it('creates a pending connection request from User A to User B', async () => {
      let callCount = 0;
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: userB }]);
              return Promise.resolve([]); // No existing connection
            }),
          }),
        }),
      }));

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: connId,
              requesterId: userA,
              recipientId: userB,
              status: 'PENDING',
              createdAt: new Date(),
            },
          ]),
        }),
      });
      (db.insert as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const result = await ConnectionsService.requestConnection(userA, userB);
      expect(result.status).toBe('PENDING');
      expect(result.requesterId).toBe(userA);
      expect(result.recipientId).toBe(userB);
    });

    it('rejects self-connection attempt', async () => {
      await expect(
        ConnectionsService.requestConnection(userA, userA)
      ).rejects.toThrow('INVALID_REQUEST: Self-connections are forbidden');
    });

    it('rejects connection when target user does not exist', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // User not found
          }),
        }),
      });

      await expect(
        ConnectionsService.requestConnection(userA, userB)
      ).rejects.toThrow('NOT_FOUND: Target user does not exist');
    });

    it('rejects duplicate pending request from the same requester', async () => {
      let callCount = 0;
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: userB }]);
              return Promise.resolve([
                {
                  id: connId,
                  requesterId: userA,
                  recipientId: userB,
                  status: 'PENDING',
                },
              ]);
            }),
          }),
        }),
      }));

      await expect(
        ConnectionsService.requestConnection(userA, userB)
      ).rejects.toThrow('CONFLICT: Connection request already sent');
    });

    it('rejects request when users are already connected', async () => {
      let callCount = 0;
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([{ id: userB }]);
              return Promise.resolve([
                {
                  id: connId,
                  requesterId: userA,
                  recipientId: userB,
                  status: 'ACCEPTED',
                },
              ]);
            }),
          }),
        }),
      }));

      await expect(
        ConnectionsService.requestConnection(userA, userB)
      ).rejects.toThrow('CONFLICT: You are already connected with this user');
    });
  });

  describe('Accept Request Authorization', () => {
    it('allows recipient B to accept pending request from A', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'ACCEPTED',
              },
            ]),
          }),
        }),
      });

      const result = await ConnectionsService.acceptRequest(userB, connId);
      expect(result.status).toBe('ACCEPTED');
    });

    it('rejects requester A attempting to accept their own request', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      await expect(
        ConnectionsService.acceptRequest(userA, connId)
      ).rejects.toThrow('FORBIDDEN: Only the recipient can accept a connection request');
    });

    it('rejects third-party user C attempting to accept A and B request', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      await expect(
        ConnectionsService.acceptRequest(userC, connId)
      ).rejects.toThrow('FORBIDDEN: You do not have permission to alter this connection');
    });
  });

  describe('Reject Request Authorization', () => {
    it('allows recipient B to decline pending request', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'REJECTED',
              },
            ]),
          }),
        }),
      });

      const result = await ConnectionsService.rejectRequest(userB, connId);
      expect(result.status).toBe('REJECTED');
    });

    it('rejects requester A attempting to reject on recipient B behalf', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      await expect(
        ConnectionsService.rejectRequest(userA, connId)
      ).rejects.toThrow('FORBIDDEN: Only the recipient can decline a connection request');
    });
  });

  describe('Cancel Outgoing Request Authorization', () => {
    it('allows requester A to cancel their own outgoing pending request', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      (db.delete as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockDelete);

      await expect(ConnectionsService.cancelRequest(userA, connId)).resolves.not.toThrow();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('prevents recipient B from cancelling requester A request', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });

      await expect(
        ConnectionsService.cancelRequest(userB, connId)
      ).rejects.toThrow('FORBIDDEN: Only the requester can cancel their connection request');
    });
  });

  describe('Remove Connection Authorization', () => {
    it('allows participant A to remove an accepted connection', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'ACCEPTED',
              },
            ]),
          }),
        }),
      });

      (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: connId,
                status: 'REMOVED',
              },
            ]),
          }),
        }),
      });

      const result = await ConnectionsService.removeConnection(userA, connId);
      expect(result.status).toBe('REMOVED');
    });

    it('allows participant B to remove an accepted connection', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'ACCEPTED',
              },
            ]),
          }),
        }),
      });

      (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: connId,
                status: 'REMOVED',
              },
            ]),
          }),
        }),
      });

      const result = await ConnectionsService.removeConnection(userB, connId);
      expect(result.status).toBe('REMOVED');
    });

    it('rejects third-party user C from removing A and B connection', async () => {
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'ACCEPTED',
              },
            ]),
          }),
        }),
      });

      await expect(
        ConnectionsService.removeConnection(userC, connId)
      ).rejects.toThrow('FORBIDDEN: You do not have permission to alter this connection');
    });
  });

  describe('Trust Graph Compatibility & Privacy Boundaries', () => {
    it('only considers ACCEPTED status as trusted, never PENDING, REJECTED, or REMOVED', async () => {
      // Mock db returning only ACCEPTED connection for getAcceptedConnectionIds
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: connId,
              requesterId: userA,
              recipientId: userB,
              status: 'ACCEPTED',
            },
          ]),
        }),
      });

      const trustedIds = await ConnectionsService.getAcceptedConnectionIds(userA);
      expect(trustedIds.has(userB)).toBe(true);
      expect(trustedIds.has(userC)).toBe(false);
    });

    it('integrates seamlessly with activity privacy filtering and evidence aggregation', () => {
      const placeId = 'plc_tokyo_coffee';

      const activityB: Activity = {
        id: 'act_01',
        userId: userB,
        placeId,
        type: 'VISITED',
        visitCount: 4,
        recommendation: 'RECOMMEND',
        visibility: 'CONNECTIONS',
        activityDate: '2026-03-15',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const activityC: Activity = {
        id: 'act_02',
        userId: userC,
        placeId,
        type: 'VISITED',
        visitCount: 2,
        recommendation: 'RECOMMEND',
        visibility: 'CONNECTIONS',
        activityDate: '2026-03-15',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Case 1: userB is ACCEPTED, userC is REMOVED/unconnected
      const acceptedConnectionIds = new Set([userB]);

      const visible = filterVisibleActivities(
        userA,
        [activityB, activityC],
        acceptedConnectionIds
      );

      // Only activity from userB is visible
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe(userB);

      // Aggregator calculates evidence exclusively from authorized connection
      const summary = aggregateConnectedActivityForPlace(userA, placeId, [
        {
          user: { id: userB, displayName: 'User B', avatarUrl: null },
          activity: activityB,
          isAcceptedConnection: true,
        },
        {
          user: { id: userC, displayName: 'User C', avatarUrl: null },
          activity: activityC,
          isAcceptedConnection: false,
        },
      ]);

      expect(summary.totalVisits).toBe(4);
      expect(summary.connectionCount).toBe(1);
      expect(summary.repeatVisitorCount).toBe(1);
      expect(summary.recentActivities).toHaveLength(1);
      expect(summary.recentActivities[0].userId).toBe(userB);
    });

    it('immediately hides activities when connection is removed', () => {
      const activity: Activity = {
        id: 'act_01',
        userId: userB,
        placeId: 'plc_tokyo_coffee',
        type: 'VISITED',
        visitCount: 3,
        recommendation: 'RECOMMEND',
        visibility: 'CONNECTIONS',
        activityDate: '2026-03-15',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // When connected: visible
      expect(canViewerAccessActivity(userA, activity, true)).toBe(true);

      // Once connection transitions to REMOVED (isAcceptedConnection = false): hidden
      expect(canViewerAccessActivity(userA, activity, false)).toBe(false);
    });
  });

  describe('End-to-End Relationship State Transitions', () => {
    it('accurately resolves relationship states across lifecycle', async () => {
      // 1. Viewer vs Self
      const selfState = await ConnectionsService.getRelationshipState(userA, userA);
      expect(selfState.state).toBe('SELF');

      // 2. Outgoing Pending (A -> B)
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });
      const outgoingState = await ConnectionsService.getRelationshipState(userA, userB);
      expect(outgoingState.state).toBe('OUTGOING_PENDING');
      expect(outgoingState.connectionId).toBe(connId);

      // 3. Incoming Pending from B perspective (B viewing A)
      const incomingState = await ConnectionsService.getRelationshipState(userB, userA);
      expect(incomingState.state).toBe('INCOMING_PENDING');

      // 4. Connected (status = ACCEPTED)
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'ACCEPTED',
              },
            ]),
          }),
        }),
      });
      const connectedState = await ConnectionsService.getRelationshipState(userA, userB);
      expect(connectedState.state).toBe('CONNECTED');

      // 5. Removed
      (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connId,
                requesterId: userA,
                recipientId: userB,
                status: 'REMOVED',
              },
            ]),
          }),
        }),
      });
      const removedState = await ConnectionsService.getRelationshipState(userA, userB);
      expect(removedState.state).toBe('NO_CONNECTION');
    });
  });
});
