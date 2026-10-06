import { db, activities, users } from '@/lib/db';
import { Activity, PlaceTrustSummary } from '@/lib/types';
import { CreateActivityInput, UpdateActivityInput } from '@/lib/validation';
import { ConnectionsService } from '@/server/connections';
import { aggregateConnectedActivityForPlace } from '@/lib/trust';
import { eq, and } from 'drizzle-orm';

export class ActivitiesService {
  /**
   * MVP Experience Summary Model:
   * Inserts or updates the single activity summary for (userId, placeId).
   * Enforces that one user has one primary experience summary per place.
   */
  static async recordActivity(
    userId: string,
    input: CreateActivityInput
  ): Promise<Activity> {
    const [existing] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.userId, userId), eq(activities.placeId, input.placeId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(activities)
        .set({
          type: input.type,
          recommendation: input.recommendation,
          visitCount: existing.visitCount + (input.visitCount || 1),
          activityDate: input.activityDate,
          visibility: input.visibility,
          note: input.note !== undefined ? input.note : existing.note,
          updatedAt: new Date(),
        })
        .where(eq(activities.id, existing.id))
        .returning();
      return updated as Activity;
    }

    const [created] = await db
      .insert(activities)
      .values({
        userId,
        placeId: input.placeId,
        type: input.type,
        recommendation: input.recommendation,
        visitCount: input.visitCount,
        activityDate: input.activityDate,
        visibility: input.visibility,
        note: input.note,
      })
      .returning();

    return created as Activity;
  }

  /**
   * Update an existing activity with strict server-side ownership validation.
   * Prevents users from modifying activities they do not own.
   */
  static async updateActivity(
    actorUserId: string,
    activityId: string,
    input: UpdateActivityInput
  ): Promise<Activity> {
    const [existing] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!existing) {
      throw new Error('NOT_FOUND: Activity does not exist');
    }

    if (existing.userId !== actorUserId) {
      throw new Error('FORBIDDEN: You do not have permission to modify this activity');
    }

    const [updated] = await db
      .update(activities)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId))
      .returning();

    return updated as Activity;
  }

  /**
   * Delete an activity with strict server-side ownership validation.
   */
  static async deleteActivity(
    actorUserId: string,
    activityId: string
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!existing) {
      throw new Error('NOT_FOUND: Activity does not exist');
    }

    if (existing.userId !== actorUserId) {
      throw new Error('FORBIDDEN: You do not have permission to delete this activity');
    }

    await db.delete(activities).where(eq(activities.id, activityId));
  }

  /**
   * Critical Backend Query (Architecture Section 12):
   * Given user U and place P, find the connected users of U who have visible activity for P.
   * Sequence:
   * 1. Resolve accepted connections for viewer.
   * 2. Find activities for place belonging to those users.
   * 3. Apply server-side visibility rules BEFORE aggregation.
   * 4. Aggregate safe summary metrics.
   */
  static async getVisibleConnectedActivityForPlace(
    viewerId: string,
    placeId: string
  ): Promise<PlaceTrustSummary> {
    const acceptedConnectionIds = await ConnectionsService.getAcceptedConnectionIds(viewerId);

    const rows = await db
      .select({
        activity: activities,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.placeId, placeId));

    const input = rows.map((r) => ({
      user: r.user,
      activity: r.activity as Activity,
      isAcceptedConnection: acceptedConnectionIds.has(r.activity.userId),
    }));

    return aggregateConnectedActivityForPlace(viewerId, placeId, input);
  }
}
