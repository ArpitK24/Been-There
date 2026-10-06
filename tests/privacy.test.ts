import { describe, it, expect } from 'vitest';
import { canViewerAccessActivity, filterVisibleActivities } from '@/lib/privacy';

describe('Server-Side Privacy Boundary', () => {
  const ownerId = 'usr_owner_01';
  const friendId = 'usr_friend_02';
  const strangerId = 'usr_stranger_03';

  const privateActivity = {
    userId: ownerId,
    visibility: 'PRIVATE' as const,
  };

  const connectionsActivity = {
    userId: ownerId,
    visibility: 'CONNECTIONS' as const,
  };

  it('allows owner to always access their own activities regardless of visibility', () => {
    expect(canViewerAccessActivity(ownerId, privateActivity, false)).toBe(true);
    expect(canViewerAccessActivity(ownerId, connectionsActivity, false)).toBe(true);
  });

  it('strictly blocks anyone other than owner from accessing PRIVATE activities', () => {
    expect(canViewerAccessActivity(friendId, privateActivity, true)).toBe(false);
    expect(canViewerAccessActivity(strangerId, privateActivity, false)).toBe(false);
  });

  it('allows accepted connections to access CONNECTIONS activities', () => {
    expect(canViewerAccessActivity(friendId, connectionsActivity, true)).toBe(true);
  });

  it('blocks non-connections from accessing CONNECTIONS activities', () => {
    expect(canViewerAccessActivity(strangerId, connectionsActivity, false)).toBe(false);
  });

  it('filters a collection of activities securely without leaking private entries', () => {
    const list = [
      { id: '1', userId: ownerId, visibility: 'PRIVATE' as const },
      { id: '2', userId: ownerId, visibility: 'CONNECTIONS' as const },
      { id: '3', userId: 'other_owner', visibility: 'CONNECTIONS' as const },
    ];

    const acceptedConnections = new Set([ownerId]); // viewer is connected to ownerId only
    const filtered = filterVisibleActivities(friendId, list, acceptedConnections);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });
});
