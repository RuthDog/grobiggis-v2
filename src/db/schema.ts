import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
