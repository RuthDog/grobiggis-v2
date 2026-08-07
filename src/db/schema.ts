import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const authUser = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const authSession = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_token_unique").on(table.token), index("session_user_id_idx").on(table.userId)],
);

export const authAccount = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const authVerification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const growingBatches = sqliteTable(
  "growing_batches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    plantId: text("plant_id").notNull(),
    variety: text("variety"),
    startType: text("start_type").notNull(),
    startDate: text("start_date").notNull(),
    status: text("status").notNull(),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("growing_batches_user_id_idx").on(table.userId),
    index("growing_batches_user_id_id_idx").on(table.userId, table.id),
  ],
);

export const growingEvents = sqliteTable(
  "growing_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    batchId: text("batch_id")
      .notNull()
      .references(() => growingBatches.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull(),
    source: text("source").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("growing_events_user_id_idx").on(table.userId),
    index("growing_events_batch_id_idx").on(table.batchId),
  ],
);

export const growingBatchRelations = relations(growingBatches, ({ many }) => ({
  events: many(growingEvents),
}));

export const growingEventRelations = relations(growingEvents, ({ one }) => ({
  batch: one(growingBatches, {
    fields: [growingEvents.batchId],
    references: [growingBatches.id],
  }),
}));

export type GrowingBatchRow = typeof growingBatches.$inferSelect;
export type NewGrowingBatchRow = typeof growingBatches.$inferInsert;
export type GrowingEventRow = typeof growingEvents.$inferSelect;
export type NewGrowingEventRow = typeof growingEvents.$inferInsert;
