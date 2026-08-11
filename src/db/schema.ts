import { relations, sql } from "drizzle-orm";
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

export const growingSpaces = sqliteTable(
  "growing_spaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("growing_spaces_user_id_idx").on(table.userId)],
);

export const plantPlacements = sqliteTable(
  "plant_placements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    spaceId: text("space_id")
      .notNull()
      .references(() => growingSpaces.id, { onDelete: "restrict" }),
    batchId: text("batch_id")
      .notNull()
      .references(() => growingBatches.id, { onDelete: "restrict" }),
    placedAt: text("placed_at").notNull(),
    removedAt: text("removed_at"),
  },
  (table) => [
    index("plant_placements_user_id_idx").on(table.userId),
    index("plant_placements_space_id_idx").on(table.spaceId),
    index("plant_placements_batch_id_idx").on(table.batchId),
    index("plant_placements_removed_at_idx").on(table.removedAt),
    uniqueIndex("plant_placements_active_batch_unique").on(table.batchId).where(sql`${table.removedAt} IS NULL`),
  ],
);

export const shoppingListItems = sqliteTable(
  "shopping_list_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    plantId: text("plant_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("shopping_list_items_user_id_idx").on(table.userId),
    uniqueIndex("shopping_list_items_user_plant_unique").on(table.userId, table.plantId),
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

export const growingSpaceRelations = relations(growingSpaces, ({ many }) => ({
  placements: many(plantPlacements),
}));

export const plantPlacementRelations = relations(plantPlacements, ({ one }) => ({
  space: one(growingSpaces, {
    fields: [plantPlacements.spaceId],
    references: [growingSpaces.id],
  }),
  batch: one(growingBatches, {
    fields: [plantPlacements.batchId],
    references: [growingBatches.id],
  }),
}));

export type GrowingBatchRow = typeof growingBatches.$inferSelect;
export type NewGrowingBatchRow = typeof growingBatches.$inferInsert;
export type GrowingEventRow = typeof growingEvents.$inferSelect;
export type NewGrowingEventRow = typeof growingEvents.$inferInsert;
export type GrowingSpaceRow = typeof growingSpaces.$inferSelect;
export type NewGrowingSpaceRow = typeof growingSpaces.$inferInsert;
export type PlantPlacementRow = typeof plantPlacements.$inferSelect;
export type NewPlantPlacementRow = typeof plantPlacements.$inferInsert;
export type ShoppingListItemRow = typeof shoppingListItems.$inferSelect;
export type NewShoppingListItemRow = typeof shoppingListItems.$inferInsert;
