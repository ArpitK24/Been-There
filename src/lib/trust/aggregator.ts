import { Activity, ConnectedPersonActivityEvidence, PlaceTrustSummary, User } from '@/lib/types';
import { canViewerAccessActivity } from '@/lib/privacy/visibility';

export interface ConnectedUserActivityInput {
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  activity: Activity;
  isAcceptedConnection: boolean;
}

/**
 * Computes the trusted evidence layer for a place given the viewer and activities from connected people.
 * Preserves privacy by filtering out unpermitted/private activities before aggregation.
 */
export function aggregateConnectedActivityForPlace(
  viewerId: string,
  placeId: string,
  records: ConnectedUserActivityInput[]
): PlaceTrustSummary {
  const visibleEvidence: ConnectedPersonActivityEvidence[] = [];
  const uniqueConnectedUsers = new Set<string>();

  let totalVisits = 0;
  let recommendCount = 0;
  let neutralCount = 0;
  let doNotRecommendCount = 0;
  let repeatVisitorCount = 0;

  for (const item of records) {
    if (item.activity.placeId !== placeId) continue;

    // Server-side privacy validation
    const canAccess = canViewerAccessActivity(
      viewerId,
      item.activity,
      item.isAcceptedConnection
    );

    if (!canAccess) continue;

    uniqueConnectedUsers.add(item.user.id);
    totalVisits += item.activity.visitCount;

    if (item.activity.visitCount > 1) {
      repeatVisitorCount += 1;
    }

    const rec = item.activity.recommendation.toUpperCase();
    if (rec === 'RECOMMEND') {
      recommendCount += 1;
    } else if (rec === 'NEUTRAL') {
      neutralCount += 1;
    } else if (rec === 'DO_NOT_RECOMMEND') {
      doNotRecommendCount += 1;
    }

    visibleEvidence.push({
      userId: item.user.id,
      displayName: item.user.displayName,
      avatarUrl: item.user.avatarUrl,
      activityType: item.activity.type,
      recommendation: item.activity.recommendation,
      visitCount: item.activity.visitCount,
      activityDate: item.activity.activityDate,
      isRepeatVisitor: item.activity.visitCount > 1,
    });
  }

  // Transparent sorting: prioritize repeat visitors then most recent activity
  visibleEvidence.sort((a, b) => {
    if (a.isRepeatVisitor !== b.isRepeatVisitor) {
      return a.isRepeatVisitor ? -1 : 1;
    }
    return (b.activityDate || '').localeCompare(a.activityDate || '');
  });

  return {
    placeId,
    connectionCount: uniqueConnectedUsers.size,
    totalVisits,
    recommendationCounts: {
      recommend: recommendCount,
      neutral: neutralCount,
      doNotRecommend: doNotRecommendCount,
    },
    repeatVisitorCount,
    recentActivities: visibleEvidence,
  };
}
