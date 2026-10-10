import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export const itineraryStatusEnum = pgEnum('itinerary_status', [
  'upcoming',
  'traveling',
  'completed',
]);

export const sharePermissionEnum = pgEnum('share_permission', [
  'view',
  'edit',
]);

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').defaultRandom().primaryKey(),
  name:         varchar('name', { length: 100 }).notNull(),
  username:     varchar('username', { length: 50 }).notNull().unique(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl:    text('avatar_url'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

// ─── PUSH TOKENS ──────────────────────────────────────────────────────────────
export const pushTokens = pgTable('push_tokens', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── ITINERARIES ──────────────────────────────────────────────────────────────
export const itineraries = pgTable('itineraries', {
  id:          uuid('id').defaultRandom().primaryKey(),
  ownerId:     uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 150 }).notNull(),
  destination: varchar('destination', { length: 200 }).notNull(),
  emotion:     varchar('emotion', { length: 50 }).notNull().default('map-outline'),
  coverColor:  varchar('cover_color', { length: 7 }),
  startDate:   varchar('start_date', { length: 10 }).notNull(),
  endDate:     varchar('end_date', { length: 10 }).notNull(),
  status:      itineraryStatusEnum('status').notNull().default('upcoming'),
  isPublic:    boolean('is_public').notNull().default(false),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

// ─── ITINERARY DAYS ───────────────────────────────────────────────────────────
export const itineraryDays = pgTable('itinerary_days', {
  id:          uuid('id').defaultRandom().primaryKey(),
  itineraryId: uuid('itinerary_id').notNull().references(() => itineraries.id, { onDelete: 'cascade' }),
  dayNumber:   integer('day_number').notNull(),
  date:        varchar('date', { length: 10 }).notNull(),
  title:       varchar('title', { length: 150 }),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export const activities = pgTable('activities', {
  id:           uuid('id').defaultRandom().primaryKey(),
  dayId:        uuid('day_id').notNull().references(() => itineraryDays.id, { onDelete: 'cascade' }),
  title:        varchar('title', { length: 200 }).notNull(),
  locationName: varchar('location_name', { length: 300 }),
  latitude:     doublePrecision('latitude'),
  longitude:    doublePrecision('longitude'),
  startTime:    varchar('start_time', { length: 5 }),
  endTime:      varchar('end_time', { length: 5 }),
  notes:        text('notes'),
  orderIndex:   integer('order_index').notNull().default(0),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

// ─── ITINERARY SHARES ─────────────────────────────────────────────────────────
export const itineraryShares = pgTable('itinerary_shares', {
  id:           uuid('id').defaultRandom().primaryKey(),
  itineraryId:  uuid('itinerary_id').notNull().references(() => itineraries.id, { onDelete: 'cascade' }),
  ownerId:      uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedWithId: uuid('shared_with_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission:   sharePermissionEnum('permission').notNull().default('view'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  itineraries:    many(itineraries),
  pushTokens:     many(pushTokens),
  sharesGiven:    many(itineraryShares, { relationName: 'owner' }),
  sharesReceived: many(itineraryShares, { relationName: 'sharedWith' }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
}));

export const itinerariesRelations = relations(itineraries, ({ one, many }) => ({
  owner:  one(users, { fields: [itineraries.ownerId], references: [users.id] }),
  days:   many(itineraryDays),
  shares: many(itineraryShares),
}));

export const itineraryDaysRelations = relations(itineraryDays, ({ one, many }) => ({
  itinerary:  one(itineraries, { fields: [itineraryDays.itineraryId], references: [itineraries.id] }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  day: one(itineraryDays, { fields: [activities.dayId], references: [itineraryDays.id] }),
}));

export const itinerarySharesRelations = relations(itineraryShares, ({ one }) => ({
  itinerary:  one(itineraries, { fields: [itineraryShares.itineraryId], references: [itineraries.id] }),
  owner:      one(users, { fields: [itineraryShares.ownerId],      references: [users.id], relationName: 'owner' }),
  sharedWith: one(users, { fields: [itineraryShares.sharedWithId], references: [users.id], relationName: 'sharedWith' }),
}));

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type PushToken         = typeof pushTokens.$inferSelect;
export type NewPushToken      = typeof pushTokens.$inferInsert;
export type Itinerary         = typeof itineraries.$inferSelect;
export type NewItinerary      = typeof itineraries.$inferInsert;
export type ItineraryDay      = typeof itineraryDays.$inferSelect;
export type NewItineraryDay   = typeof itineraryDays.$inferInsert;
export type Activity          = typeof activities.$inferSelect;
export type NewActivity       = typeof activities.$inferInsert;
export type ItineraryShare    = typeof itineraryShares.$inferSelect;
export type NewItineraryShare = typeof itineraryShares.$inferInsert;