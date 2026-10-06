import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivitiesService } from '@/server/activities';
import { ConnectionsService } from '@/server/connections';

// Mock the database client to test domain logic and authorization guards
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
  activities: {
    id: 'id',
    userId: 'user_id',
    placeId: 'place_id',
  },
  connections: {
    id: 'id',
    requesterId: 'requester_id',
    recipientId: 'recipient_id',
  },
}));

import { db } from '@/lib/db';

describe('Server-Side Ownership & Relationship Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Activity Ownership Guards', () => {
    const ownerId = 'usr_owner_01';
    const attackerId = 'usr_attacker_02';
    const activityId = 'act_123';

    it('rejects updates when actor is not the activity owner', async () => {
      // Mock db returning an activity owned by ownerId
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: activityId,
                userId: ownerId,
                placeId: 'place_xyz',
                visitCount: 2,
              },
            ]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      await expect(
        ActivitiesService.updateActivity(attackerId, activityId, { visitCount: 10 })
      ).rejects.toThrow('FORBIDDEN: You do not have permission to modify this activity');
    });

    it('rejects deletion when actor is not the activity owner', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: activityId,
                userId: ownerId,
              },
            ]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      await expect(
        ActivitiesService.deleteActivity(attackerId, activityId)
      ).rejects.toThrow('FORBIDDEN: You do not have permission to delete this activity');
    });
  });

  describe('Connection Integrity Guards', () => {
    it('rejects self-connection attempts', async () => {
      const userId = 'usr_self_01';
      await expect(
        ConnectionsService.requestConnection(userId, userId)
      ).rejects.toThrow('INVALID_REQUEST: Self-connections are forbidden');
    });

    it('rejects status updates from third parties not involved in the connection', async () => {
      const requesterId = 'usr_req_01';
      const recipientId = 'usr_rec_02';
      const thirdPartyId = 'usr_third_03';
      const connectionId = 'conn_123';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: connectionId,
                requesterId,
                recipientId,
                status: 'PENDING',
              },
            ]),
          }),
        }),
      });
      (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      await expect(
        ConnectionsService.updateConnectionStatus(thirdPartyId, connectionId, 'ACCEPTED')
      ).rejects.toThrow('FORBIDDEN: You do not have permission to alter this connection');
    });
  });
});
