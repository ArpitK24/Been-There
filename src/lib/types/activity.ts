export type ActivityType = 'VISITED' | 'ORDERED';

export type Recommendation = 'RECOMMEND' | 'NEUTRAL' | 'DO_NOT_RECOMMEND';

export type Visibility = 'PRIVATE' | 'CONNECTIONS';

export interface Activity {
  id: string;
  userId: string;
  placeId: string;
  type: ActivityType;
  recommendation: Recommendation;
  visitCount: number;
  activityDate: string; // ISO date string YYYY-MM-DD
  visibility: Visibility;
  note?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ActivityWithPlace extends Activity {
  place: {
    id: string;
    name: string;
    category: string;
    address: string;
  };
}
