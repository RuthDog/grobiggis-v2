import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plants } from "../src/data/plants.ts";
import { startTypeLabels } from "../src/domain/growing-display.ts";
import { createGrowingBatch, planBatch, recordActualEvent } from "../src/domain/growing-plan.ts";
import { visiblePlanEventsForBatches } from "../src/domain/task-visibility.ts";
import { growingSessionReducer, initialGrowingSessionState } from "../src/state/growing-session-reducer.ts";
import type { GrowingBatch } from "../src/domain/growing-types.ts";

const batch = (patch: Partial<GrowingBatch> = {}): GrowingBatch => ({
  id: "batch-a",
  plantId: "tomat",
  startType: "seed",
  startDate: "2026-08-07",
  status: "active",
  actualEvents: [],
  ...patch,
});

test("a batch can be added to session state", () => {
  const added = batch();
  const state = growingSessionReducer(initialGrowingSessionState, { type: "batch-added", batch: added });

  assert.deepEqual(state.batches, [added]);
  assert.deepEqual(initialGrowingSessionState.batches, []);
});

test("two batches with the same plant id remain separate", () => {
  const first = batch({ id: "tomat-a", variety: "Gardener's Delight" });
  const second = batch({ id: "tomat-b", variety: "Sungold", startDate: "2026-08-20" });
  const state = [first, second].reduce(
    (current, item) => growingSessionReducer(current, { type: "batch-added", batch: item }),
    initialGrowingSessionState,
  );

  assert.deepEqual(state.batches.map((item) => [item.id, item.plantId, item.variety, item.startDate]), [
    ["tomat-a", "tomat", "Gardener's Delight", "2026-08-07"],
    ["tomat-b", "tomat", "Sungold", "2026-08-20"],
  ]);
});

test("plans are generated for each session batch with the correct batch id", () => {
  const first = batch({ id: "tomat-a", startDate: "2026-08-07" });
  const second = batch({ id: "tomat-b", startDate: "2026-08-20" });
  const firstPlan = planBatch(first, plants);
  const secondPlan = planBatch(second, plants);

  assert.ok(firstPlan.events.every((event) => event.batchId === "tomat-a"));
  assert.ok(secondPlan.events.every((event) => event.batchId === "tomat-b"));
  assert.notEqual(
    firstPlan.events.find((event) => event.type === "skörd")?.from,
    secondPlan.events.find((event) => event.type === "skörd")?.from,
  );
});

test("completion affects only the selected batch", () => {
  const original = { batches: [batch({ id: "tomat-a" }), batch({ id: "tomat-b" })] };
  const updated = growingSessionReducer(original, { type: "batch-completed", batchId: "tomat-a", completedAt: "2026-09-01" });

  assert.deepEqual(updated.batches.map((item) => [item.id, item.status, item.completedAt]), [
    ["tomat-a", "completed", "2026-09-01"],
    ["tomat-b", "active", undefined],
  ]);
  assert.equal(original.batches[0].status, "active");
});

test("completed batches can be separated from active batches in state", () => {
  const state = growingSessionReducer({ batches: [batch({ id: "tomat-a" }), batch({ id: "tomat-b" })] }, {
    type: "batch-completed",
    batchId: "tomat-a",
    completedAt: "2026-09-01",
  });

  assert.deepEqual(state.batches.filter((item) => item.status === "active").map((item) => item.id), ["tomat-b"]);
  assert.deepEqual(state.batches.filter((item) => item.status === "completed").map((item) => item.id), ["tomat-a"]);
});

test("future events are hidden for completed batches while done history remains", () => {
  const withHistory = recordActualEvent(batch({ id: "tomat-a" }), "sådd", "2026-08-07", () => "actual-a");
  const completedState = growingSessionReducer({ batches: [withHistory] }, {
    type: "batch-completed",
    batchId: "tomat-a",
    completedAt: "2026-09-01",
  });
  const plan = planBatch(completedState.batches[0], plants);

  assert.ok(plan.events.every((event) => event.status === "done"));
  assert.ok(plan.events.some((event) => event.type === "sådd"));
  assert.ok(plan.events.some((event) => event.type === "avslutad"));
  assert.deepEqual(visiblePlanEventsForBatches(plan.events, completedState.batches), plan.events);
});

test("unknown batch id is handled without mutating state", () => {
  const original = { batches: [batch()] };
  const updated = growingSessionReducer(original, { type: "batch-completed", batchId: "saknas", completedAt: "2026-09-01" });

  assert.strictEqual(updated, original);
});

test("creating a batch trims empty variety and keeps valid start data", () => {
  const created = createGrowingBatch(
    { plantId: "tomat", variety: undefined, startType: "direct", startDate: "2026-08-07" },
    () => "created-id",
  );

  assert.equal(created.id, "created-id");
  assert.equal(created.plantId, "tomat");
  assert.equal(created.startType, "direct");
  assert.equal(created.startDate, "2026-08-07");
});

test("start types have Swedish display labels", () => {
  assert.deepEqual(startTypeLabels, {
    seed: "Frö / förodling",
    direct: "Direktsådd",
    purchased: "Köpt planta",
    divided: "Delad/förökad planta",
    established: "Redan etablerad",
  });
});

test("session layer does not implement reload persistence", () => {
  const provider = readFileSync(new URL("../src/state/growing-session.tsx", import.meta.url), "utf8");
  const reducer = readFileSync(new URL("../src/state/growing-session-reducer.ts", import.meta.url), "utf8");

  assert.doesNotMatch(`${provider}\n${reducer}`, /localStorage|sessionStorage|indexedDB|cookie/i);
});
