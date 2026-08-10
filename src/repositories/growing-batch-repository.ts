import { and, eq } from "drizzle-orm";
import type { GrobiggisDb } from "../db/client.ts";
import { growingBatches, growingEvents, type GrowingBatchRow, type GrowingEventRow } from "../db/schema.ts";
import type {
  ActualGrowingEvent,
  GrowingBatch,
  GrowingBatchStatus,
  GrowingEventType,
  GrowingStartType,
} from "../domain/growing-types.ts";

const startTypes = ["seed", "direct", "purchased", "divided", "established"] as const;
const batchStatuses = ["active", "completed"] as const;
const eventTypes = ["sådd", "direktsådd", "inköp", "plantering", "omplantering", "avhärdning", "utplantering", "blomning", "frukt", "skörd", "avslutad"] as const;
const eventStatuses = ["planned", "done", "postponed", "irrelevant"] as const;
const eventSources = ["actual", "calculated"] as const;

export interface GrowingBatchRepository {
  create(userId: string, batch: GrowingBatch): Promise<GrowingBatch>;
  createForUser(userId: string, batch: GrowingBatch): Promise<GrowingBatch>;
  getByIdForUser(userId: string, batchId: string): Promise<GrowingBatch | null>;
  listForUser(userId: string): Promise<GrowingBatch[]>;
  save(userId: string, batch: GrowingBatch): Promise<GrowingBatch>;
  saveForUser(userId: string, batch: GrowingBatch): Promise<GrowingBatch>;
  addActualEventForUser(userId: string, batchId: string, event: ActualGrowingEvent): Promise<GrowingBatch | null>;
  complete(userId: string, batchId: string, completedAt: string): Promise<GrowingBatch | null>;
  completeForUser(userId: string, batchId: string, completedAt: string): Promise<GrowingBatch | null>;
}

function assertOneOf<T extends readonly string[]>(value: string, allowed: T, field: string): T[number] {
  if (!allowed.includes(value)) throw new Error(`Invalid ${field}: ${value}`);
  return value as T[number];
}

const titleForEvent = (event: ActualGrowingEvent) => {
  const titles: Record<GrowingEventType, string> = {
    "sådd": "Sådd",
    "direktsådd": "Direktsådd",
    "inköp": "Köpt planta",
    "plantering": "Plantering",
    "omplantering": "Omplantering",
    "avhärdning": "Avhärdning",
    "utplantering": "Utplantering",
    "blomning": "Blomning",
    "frukt": "Fruktsättning",
    "skörd": "Skörd",
    "avslutad": "Avslutad",
  };
  return titles[event.type];
};

export function batchToRow(userId: string, batch: GrowingBatch, now = new Date().toISOString()) {
  return {
    id: batch.id,
    userId,
    plantId: batch.plantId,
    variety: batch.variety ?? null,
    startType: batch.startType,
    startDate: batch.startDate ?? "",
    status: batch.status,
    completedAt: batch.completedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function batchToUpdateSet(batch: GrowingBatch, now = new Date().toISOString()) {
  return {
    plantId: batch.plantId,
    variety: batch.variety ?? null,
    startType: batch.startType,
    startDate: batch.startDate ?? "",
    status: batch.status,
    completedAt: batch.completedAt ?? null,
    updatedAt: now,
  };
}

export function actualEventToRow(userId: string, event: ActualGrowingEvent, now = new Date().toISOString()) {
  return {
    id: event.id,
    userId,
    batchId: event.batchId,
    eventType: event.type,
    title: titleForEvent(event),
    startDate: event.occurredOn,
    endDate: event.occurredOn,
    status: "done",
    source: "actual",
    note: event.note ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function rowToActualEvent(row: GrowingEventRow): ActualGrowingEvent {
  const source = assertOneOf(row.source, eventSources, "event source");
  if (source !== "actual") throw new Error(`Invalid actual event source: ${row.source}`);
  assertOneOf(row.status, eventStatuses, "event status");

  return {
    id: row.id,
    batchId: row.batchId,
    plantId: "",
    type: assertOneOf(row.eventType, eventTypes, "event type") as GrowingEventType,
    occurredOn: row.startDate,
    note: row.note ?? undefined,
  };
}

export function rowToBatch(row: GrowingBatchRow, events: GrowingEventRow[] = []): GrowingBatch {
  const startType = assertOneOf(row.startType, startTypes, "start type") as GrowingStartType;
  const status = assertOneOf(row.status, batchStatuses, "batch status") as GrowingBatchStatus;
  const batch: GrowingBatch = {
    id: row.id,
    plantId: row.plantId,
    variety: row.variety ?? undefined,
    startType,
    startDate: row.startDate,
    status,
    actualEvents: events
      .filter((event) => event.source === "actual")
      .map((event) => ({ ...rowToActualEvent(event), plantId: row.plantId })),
  };

  if (row.completedAt) batch.completedAt = row.completedAt;

  return batch;
}

export class DrizzleGrowingBatchRepository implements GrowingBatchRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async create(userId: string, batch: GrowingBatch) {
    const snapshot = structuredClone(batch);
    await this.db.insert(growingBatches).values(batchToRow(userId, snapshot));
    if (snapshot.actualEvents.length) {
      await this.db.insert(growingEvents).values(snapshot.actualEvents.map((event) => actualEventToRow(userId, event)));
    }
    return snapshot;
  }

  async createForUser(userId: string, batch: GrowingBatch) {
    return this.create(userId, batch);
  }

  async getByIdForUser(userId: string, batchId: string) {
    const [batch] = await this.db
      .select()
      .from(growingBatches)
      .where(and(eq(growingBatches.userId, userId), eq(growingBatches.id, batchId)))
      .limit(1);

    if (!batch) return null;

    const events = await this.db
      .select()
      .from(growingEvents)
      .where(and(eq(growingEvents.userId, userId), eq(growingEvents.batchId, batchId)));

    return rowToBatch(batch, events);
  }

  async listForUser(userId: string) {
    const rows = await this.db.select().from(growingBatches).where(eq(growingBatches.userId, userId));
    const eventRows = await this.db.select().from(growingEvents).where(eq(growingEvents.userId, userId));
    return rows.map((row) => rowToBatch(row, eventRows.filter((event) => event.batchId === row.id)));
  }

  async save(userId: string, batch: GrowingBatch) {
    const snapshot = structuredClone(batch);
    const [existing] = await this.db
      .select({ id: growingBatches.id })
      .from(growingBatches)
      .where(and(eq(growingBatches.userId, userId), eq(growingBatches.id, snapshot.id)))
      .limit(1);

    if (!existing) throw new Error(`Growing batch not found for user: ${snapshot.id}`);

    await this.db
      .update(growingBatches)
      .set(batchToUpdateSet(snapshot))
      .where(and(eq(growingBatches.userId, userId), eq(growingBatches.id, snapshot.id)));
    await this.db.delete(growingEvents).where(and(eq(growingEvents.userId, userId), eq(growingEvents.batchId, snapshot.id)));
    if (snapshot.actualEvents.length) {
      await this.db.insert(growingEvents).values(snapshot.actualEvents.map((event) => actualEventToRow(userId, event)));
    }
    return snapshot;
  }

  async saveForUser(userId: string, batch: GrowingBatch) {
    return this.save(userId, batch);
  }

  async addActualEventForUser(userId: string, batchId: string, event: ActualGrowingEvent) {
    const batch = await this.getByIdForUser(userId, batchId);
    if (!batch) return null;
    if (batch.actualEvents.some((existing) => existing.type === event.type)) return batch;

    await this.db.insert(growingEvents).values(actualEventToRow(userId, { ...event, batchId, plantId: batch.plantId }));
    return this.getByIdForUser(userId, batchId);
  }

  async complete(userId: string, batchId: string, completedAt: string) {
    const batch = await this.getByIdForUser(userId, batchId);
    if (!batch) return null;
    const completed: GrowingBatch = { ...batch, status: "completed", completedAt };
    return this.save(userId, completed);
  }

  async completeForUser(userId: string, batchId: string, completedAt: string) {
    return this.complete(userId, batchId, completedAt);
  }
}
