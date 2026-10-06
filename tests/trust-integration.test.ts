import { describe, it, expect } from 'vitest';
import { aggregateConnectedActivityForPlace } from '@/lib/trust';
import { Activity } from '@/lib/types';

describe('Trust Graph & Evidence Layer Integration', () => {
  const userA = 'usr_alex_01'; // Viewer
  const userB = 'usr_priya_02'; // Potential connection
  const userC = 'usr_rohan_03'; // Potential connection
  const userD = 'usr_deepa_04'; // Potential connection
  const placeX = 'place_cafe_123';

  // Helper to create activity summaries
  function createActivity(
    id: string,
    userId: string,
    placeId: string,
    overrides?: Partial<Activity>
  ): Activity {
    return {
      id,
      userId,
      placeId,
      type: 'VISITED',
      recommendation: 'RECOMMEND',
      visitCount: 1,
      activityDate: '2026-10-01',
      visibility: 'CONNECTIONS',
      createdAt: new Date('2026-10-01'),
      ...overrides,
    };
  }

  // Case 1 — Accepted connection
  it('Case 1: Accepted connection — User B visible activity is returned to User A', () => {
    const activityB = createActivity('act_b', userB, placeX, {
      visibility: 'CONNECTIONS',
      recommendation: 'RECOMMEND',
      visitCount: 2,
    });

    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: activityB,
        isAcceptedConnection: true,
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(1);
    expect(result.totalVisits).toBe(2);
    expect(result.recentActivities).toHaveLength(1);
    expect(result.recentActivities[0].userId).toBe(userB);
    expect(result.recentActivities[0].displayName).toBe('Priya Sharma');
  });

  // Case 2 — Pending connection
  it('Case 2: Pending connection — User B activity is NOT visible when connection is pending', () => {
    const activityB = createActivity('act_b', userB, placeX, {
      visibility: 'CONNECTIONS',
    });

    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: activityB,
        isAcceptedConnection: false, // Connection is PENDING, not accepted
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(0);
    expect(result.totalVisits).toBe(0);
    expect(result.recentActivities).toHaveLength(0);
  });

  // Case 3 — Private activity
  it('Case 3: Private activity — User B PRIVATE activity is NOT visible even to accepted connection', () => {
    const activityB = createActivity('act_b', userB, placeX, {
      visibility: 'PRIVATE',
      recommendation: 'RECOMMEND',
      visitCount: 5,
    });

    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: activityB,
        isAcceptedConnection: true, // Accepted connection, but activity is PRIVATE
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(0);
    expect(result.totalVisits).toBe(0);
    expect(result.recommendationCounts.recommend).toBe(0);
    expect(result.recentActivities).toHaveLength(0);
  });

  // Case 4 — Unrelated user
  it('Case 4: Unrelated user — User C activity is NOT visible when not connected to User A', () => {
    const activityC = createActivity('act_c', userC, placeX, {
      visibility: 'CONNECTIONS',
    });

    const feed = [
      {
        user: { id: userC, displayName: 'Stranger C', avatarUrl: null },
        activity: activityC,
        isAcceptedConnection: false, // Not connected
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(0);
    expect(result.totalVisits).toBe(0);
    expect(result.recentActivities).toHaveLength(0);
  });

  // Case 5 — Multiple trusted people
  it('Case 5: Multiple trusted people — Aggregates 3 accepted connections with recommendation distribution', () => {
    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: createActivity('act_b', userB, placeX, {
          recommendation: 'RECOMMEND',
          visitCount: 3,
        }),
        isAcceptedConnection: true,
      },
      {
        user: { id: userC, displayName: 'Rohan Mehta', avatarUrl: null },
        activity: createActivity('act_c', userC, placeX, {
          recommendation: 'NEUTRAL',
          visitCount: 1,
        }),
        isAcceptedConnection: true,
      },
      {
        user: { id: userD, displayName: 'Deepa Patel', avatarUrl: null },
        activity: createActivity('act_d', userD, placeX, {
          recommendation: 'RECOMMEND',
          visitCount: 2,
        }),
        isAcceptedConnection: true,
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(3);
    expect(result.totalVisits).toBe(6); // 3 + 1 + 2
    expect(result.recommendationCounts.recommend).toBe(2);
    expect(result.recommendationCounts.neutral).toBe(1);
    expect(result.recommendationCounts.doNotRecommend).toBe(0);
    expect(result.repeatVisitorCount).toBe(2); // userB (3) and userD (2)
    expect(result.recentActivities).toHaveLength(3);
  });

  // Case 6 — Repeat visits
  it('Case 6: Repeat visits — Preserves repeat visit count (e.g. 8 visits) in evidence', () => {
    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: createActivity('act_b', userB, placeX, {
          visitCount: 8,
          recommendation: 'RECOMMEND',
        }),
        isAcceptedConnection: true,
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(1);
    expect(result.totalVisits).toBe(8);
    expect(result.repeatVisitorCount).toBe(1);
    expect(result.recentActivities[0].visitCount).toBe(8);
    expect(result.recentActivities[0].isRepeatVisitor).toBe(true);
  });

  // Case 7 — Private activity must not leak through aggregates
  it('Case 7: Private activity leakage prevention — Private activity does not affect any aggregate metrics', () => {
    const feed = [
      {
        user: { id: userB, displayName: 'Priya Sharma', avatarUrl: null },
        activity: createActivity('act_b', userB, placeX, {
          visibility: 'PRIVATE',
          recommendation: 'RECOMMEND',
          visitCount: 10,
        }),
        isAcceptedConnection: true, // Connected, but PRIVATE
      },
      {
        user: { id: userC, displayName: 'Rohan Mehta', avatarUrl: null },
        activity: createActivity('act_c', userC, placeX, {
          visibility: 'CONNECTIONS',
          recommendation: 'RECOMMEND',
          visitCount: 2,
        }),
        isAcceptedConnection: true, // Connected and CONNECTIONS
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);

    // Assert that User B's 10 visits and 1 recommendation did NOT leak into the aggregates
    expect(result.connectionCount).toBe(1); // Only Rohan
    expect(result.totalVisits).toBe(2); // Only Rohan's 2 visits (NOT 12)
    expect(result.repeatVisitorCount).toBe(1); // Only Rohan
    expect(result.recommendationCounts.recommend).toBe(1); // Only Rohan's (NOT 2)
    expect(result.recentActivities).toHaveLength(1);
    expect(result.recentActivities[0].userId).toBe(userC);
  });

  // Case 8 — Activity Owner viewing their own private activity
  it('Case 8: Activity owner can view their own private activity', () => {
    const feed = [
      {
        user: { id: userA, displayName: 'Alex Mercer', avatarUrl: null },
        activity: createActivity('act_a', userA, placeX, {
          visibility: 'PRIVATE',
          recommendation: 'RECOMMEND',
          visitCount: 4,
        }),
        isAcceptedConnection: false,
      },
    ];

    const result = aggregateConnectedActivityForPlace(userA, placeX, feed);
    expect(result.connectionCount).toBe(1);
    expect(result.totalVisits).toBe(4);
    expect(result.recentActivities).toHaveLength(1);
    expect(result.recentActivities[0].userId).toBe(userA);
  });
});
