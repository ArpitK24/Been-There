import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  date,
  timestamp,
  pgEnum,
  uniqueIndex,
  check,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export const connectionStatusEnum = pgEnum('connection_status', [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'BLOCKED',
  'REMOVED',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'VISITED',
  'ORDERED',
]);

export const recommendationEnum = pgEnum('recommendation_status', [
  'RECOMMEND',
  'NEUTRAL',
  'DO_NOT_RECOMMEND',
]);

export const visibilityEnum = pgEnum('visibility_level', [
  'PRIVATE',
  'CONNECTIONS',
]);

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------

/**
 * User Entity
 * Primary profile record linked with Supabase Auth id.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Connection Entity
 * Models unidirectional/bidirectional connections between users.
 * Enforces:
 *  - No self-connections (requester != recipient)
 *  - Unique connection pair regardless of orientation: LEAST/GREATEST unique index
 */
export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: connectionStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Prevent self-connection at database level
    check('chk_no_self_connection', sql`${table.requesterId} <> ${table.recipientId}`),
    // Prevent duplicate relationship between the same two users regardless of direction
    uniqueIndex('idx_unique_connection_pair').on(
      sql`LEAST(${table.requesterId}, ${table.recipientId})`,
      sql`GREATEST(${table.requesterId}, ${table.recipientId})`
    ),
  ]
);

/**
 * Place Entity
 * Canonical real-world place record identified internally by Been-There UUID.
 * Preserves provider identity without leaking provider structures.
 */
export const places = pgTable(
  'places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    providerPlaceId: text('provider_place_id').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    branch: text('branch'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Prevent duplicate records for the same provider place
    uniqueIndex('idx_unique_provider_place').on(table.provider, table.providerPlaceId),
  ]
);

/**
 * Activity Entity
 * Models experience summaries for a user at a place (not raw review posts).
 * Enforces:
 *  - One summary row per (user, place)
 *  - Minimum visit count >= 1
 */
export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    placeId: uuid('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'cascade' }),
    type: activityTypeEnum('type').notNull().default('VISITED'),
    recommendation: recommendationEnum('recommendation').notNull().default('RECOMMEND'),
    visitCount: integer('visit_count').notNull().default(1),
    activityDate: date('activity_date').notNull(),
    visibility: visibilityEnum('visibility').notNull().default('CONNECTIONS'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('chk_positive_visit_count', sql`${table.visitCount} >= 1`),
    // Exactly one experience summary per user per place in the MVP model
    uniqueIndex('idx_unique_user_place_activity').on(table.userId, table.placeId),
  ]
);

/**
 * PrivacySetting Entity
 * User-level privacy preferences, controlling default activity visibility.
 */
export const privacySettings = pgTable('privacy_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityDefaultVisibility: visibilityEnum('activity_default_visibility')
    .notNull()
    .default('CONNECTIONS'),
  hidePreciseLocations: boolean('hide_precise_locations').notNull().default(false),
  hideExactTimestamps: boolean('hide_exact_timestamps').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  sentConnections: many(connections, { relationName: 'sentConnections' }),
  receivedConnections: many(connections, { relationName: 'receivedConnections' }),
  activities: many(activities),
  privacySetting: one(privacySettings, {
    fields: [users.id],
    references: [privacySettings.userId],
  }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: 'sentConnections',
  }),
  recipient: one(users, {
    fields: [connections.recipientId],
    references: [users.id],
    relationName: 'receivedConnections',
  }),
}));

export const placesRelations = relations(places, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  place: one(places, {
    fields: [activities.placeId],
    references: [places.id],
  }),
}));

export const privacySettingsRelations = relations(privacySettings, ({ one }) => ({
  user: one(users, {
    fields: [privacySettings.userId],
    references: [users.id],
  }),
}));
