import { Activity } from '@/lib/types';

/**
 * Server-side privacy enforcement: determines if a viewer can access an activity.
 * Strict privacy rules (Architecture Doc Section 9 & 12):
 * - Activity owner can always see their own activity.
 * - 'PRIVATE': Only owner can ever see this activity.
 * - 'CONNECTIONS': Only accepted connections can see this activity.
 *
 * "The API must enforce visibility server-side; hiding an item in the UI is not a privacy control."
 */
export function canViewerAccessActivity(
  viewerId: string,
  activity: Pick<Activity, 'userId' | 'visibility'>,
  isAcceptedConnection: boolean
): boolean {
  // Activity owner always has access to their own data
  if (viewerId === activity.userId) {
    return true;
  }

  const visibility = activity.visibility.toUpperCase();

  switch (visibility) {
    case 'PRIVATE':
      return false;
    case 'CONNECTIONS':
      return isAcceptedConnection;
    default:
      return false;
  }
}

/**
 * Filters a list of activities based on server-side visibility rules.
 */
export function filterVisibleActivities<T extends Pick<Activity, 'userId' | 'visibility'>>(
  viewerId: string,
  activitiesList: T[],
  acceptedConnectionUserIds: Set<string>
): T[] {
  return activitiesList.filter((act) => {
    const isConnection = acceptedConnectionUserIds.has(act.userId);
    return canViewerAccessActivity(viewerId, act, isConnection);
  });
}
