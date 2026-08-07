import test from "node:test";
import assert from "node:assert/strict";
import { growingBatches, growingEvents } from "../src/db/schema.ts";
import {
  actualEventToRow,
  batchToRow,
  rowToActualEvent,
  rowToBatch,
} from "../src/repositories/growing-batch-repository.ts";
import { plants } from "../src/data/plants.ts";
import { planBatch } from "../src/domain/growing-plan.ts";
import type { GrowingBatch, ActualGrowingEvent } from "../src/domain/growing-types.ts";
import type { GrowingBatchRow, GrowingEventRow } from "../src/db/schema.ts";

const seedEventType = "s\u00e5dd";
const harvestEventType = "sk\u00f6rd";

const batch = (patch: Partial<GrowingBatch> = {}): GrowingBatch => ({
  id: "batch-a",
  plantId: "tomat",
  variety: "Sungold",
  startType: "seed",
  startDate: "2026-03-10",
  status: "active",
  actualEvents: [],
  ...patch,
});

const batchRow = (patch: Partial<GrowingBatchRow> = {}): GrowingBatchRow => ({
  id: "batch-a",
  userId: "user-a",
  plantId: "tomat",
  variety: "Sungold",
  startType: "seed",
  startDate: "2026-03-10",
  status: "active",
  completedAt: null,
  createdAt: "2026-03-10T08:00:00.000Z",
  updatedAt: "2026-03-10T08:00:00.000Z",
  ...patch,
});

const actualEvent = (patch: Partial<ActualGrowingEvent> = {}): ActualGrowingEvent => ({
  id: "event-a",
  batchId: "batch-a",
  plantId: "tomat",
  type: seedEventType,
  occurredOn: "2026-03-10",
  note: "Started indoors",
  ...patch,
});

const eventRow = (patch: Partial<GrowingEventRow> = {}): GrowingEventRow => ({
  id: "event-a",
  userId: "user-a",
  batchId: "batch-a",
  eventType: seedEventType,
  title: "S\u00e5dd",
  startDate: "2026-03-10",
  endDate: "2026-03-10",
  status: "done",
  source: "actual",
  note: "Started indoors",
  createdAt: "2026-03-10T08:00:00.000Z",
  updatedAt: "2026-03-10T08:00:00.000Z",
  ...patch,
});

test("growing batch schema keeps user-scoped identity columns", () => {
  assert.equal(growingBatches.id.name, "id");
  assert.equal(growingBatches.userId.name, "user_id");
  assert.equal(growingBatches.plantId.name, "plant_id");
  assert.equal(growingBatches.status.name, "status");
});

test("growing event schema links actual events to batches and users", () => {
  assert.equal(growingEvents.id.name, "id");
  assert.equal(growingEvents.userId.name, "user_id");
  assert.equal(growingEvents.batchId.name, "batch_id");
  assert.equal(growingEvents.source.name, "source");
});

test("batchToRow maps a domain batch to a D1 insert row", () => {
  assert.deepEqual(batchToRow("user-a", batch(), "2026-03-10T08:00:00.000Z"), batchRow());
});

test("batchToRow stores absent optional values as nullable or empty D1 values", () => {
  const row = batchToRow("user-a", batch({ variety: undefined, startDate: undefined, completedAt: undefined }), "now");

  assert.equal(row.variety, null);
  assert.equal(row.startDate, "");
  assert.equal(row.completedAt, null);
});

test("batchToRow preserves completed batch metadata", () => {
  const row = batchToRow("user-a", batch({ status: "completed", completedAt: "2026-08-01" }), "now");

  assert.equal(row.status, "completed");
  assert.equal(row.completedAt, "2026-08-01");
});

test("actualEventToRow persists actual history as done source events", () => {
  assert.deepEqual(actualEventToRow("user-a", actualEvent(), "2026-03-10T08:00:00.000Z"), eventRow());
});

test("actualEventToRow keeps event rows user scoped", () => {
  const row = actualEventToRow("user-b", actualEvent({ id: "event-b" }), "now");

  assert.equal(row.userId, "user-b");
  assert.equal(row.batchId, "batch-a");
});

test("rowToActualEvent restores persisted history without D1-only fields", () => {
  assert.deepEqual(rowToActualEvent(eventRow()), actualEvent({ plantId: "" }));
});

test("rowToActualEvent turns null notes into omitted notes", () => {
  const event = rowToActualEvent(eventRow({ note: null }));

  assert.equal(event.note, undefined);
});

test("rowToBatch restores a batch without events", () => {
  assert.deepEqual(rowToBatch(batchRow()), batch({ actualEvents: [] }));
});

test("rowToBatch restores actual event history with the batch plant id", () => {
  const restored = rowToBatch(batchRow({ plantId: "chili" }), [eventRow()]);

  assert.equal(restored.actualEvents[0].plantId, "chili");
  assert.equal(restored.actualEvents[0].type, seedEventType);
});

test("rowToBatch preserves completed status and completion date", () => {
  const restored = rowToBatch(batchRow({ status: "completed", completedAt: "2026-08-01" }));

  assert.equal(restored.status, "completed");
  assert.equal(restored.completedAt, "2026-08-01");
});

test("rowToBatch ignores calculated rows because future plans are reconstructed", () => {
  const restored = rowToBatch(batchRow(), [
    eventRow({ id: "actual-a", source: "actual" }),
    eventRow({ id: "calculated-a", source: "calculated", status: "planned", eventType: harvestEventType }),
  ]);

  assert.deepEqual(restored.actualEvents.map((event) => event.id), ["actual-a"]);
});

test("a restored batch can reconstruct calculated plan events from catalog rules", () => {
  const restored = rowToBatch(batchRow(), [eventRow()]);
  const plan = planBatch(restored, plants);

  assert.equal(plan.history.length, 1);
  assert.ok(plan.events.some((event) => event.source === "calculated"));
});

test("rowToBatch rejects invalid start types from storage", () => {
  assert.throws(() => rowToBatch(batchRow({ startType: "invalid" })), /Invalid start type/);
});

test("rowToBatch rejects invalid batch statuses from storage", () => {
  assert.throws(() => rowToBatch(batchRow({ status: "archived" })), /Invalid batch status/);
});

test("rowToActualEvent rejects calculated rows when actual history is requested", () => {
  assert.throws(() => rowToActualEvent(eventRow({ source: "calculated" })), /Invalid actual event source/);
});

test("rowToActualEvent rejects invalid event types from storage", () => {
  assert.throws(() => rowToActualEvent(eventRow({ eventType: "watering" })), /Invalid event type/);
});

test("actual event rows carry one-day start and end dates", () => {
  const row = actualEventToRow("user-a", actualEvent({ occurredOn: "2026-04-01" }), "now");

  assert.equal(row.startDate, "2026-04-01");
  assert.equal(row.endDate, "2026-04-01");
});

test("persistence mapping does not mutate the source batch", () => {
  const source = batch({ actualEvents: [actualEvent()] });
  batchToRow("user-a", source, "now");
  actualEventToRow("user-a", source.actualEvents[0], "now");

  assert.deepEqual(source, batch({ actualEvents: [actualEvent()] }));
});
