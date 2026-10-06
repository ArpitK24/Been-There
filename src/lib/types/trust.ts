import { ActivityType, Recommendation } from './activity';

export interface ConnectedPersonActivityEvidence {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  activityType: ActivityType;
  recommendation: Recommendation;
  visitCount: number;
  activityDate?: string;
  isRepeatVisitor: boolean;
}

export interface PlaceTrustSummary {
  placeId: string;
  connectionCount: number;
  totalVisits: number;
  recommendationCounts: {
    recommend: number;
    neutral: number;
    doNotRecommend: number;
  };
  repeatVisitorCount: number;
  recentActivities: ConnectedPersonActivityEvidence[];
}
