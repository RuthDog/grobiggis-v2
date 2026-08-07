import test from "node:test";
import assert from "node:assert/strict";
import { plants } from "../src/data/plants.ts";
import {
  completeGrowingBatch,
  createGrowingBatch,
  planBatch,
  planDateRangeForPlant,
  recordActualEvent,
} from "../src/domain/growing-plan.ts";
import { groupByMonth, formatSwedishDateRange, monthsForRange, sortPlanItems } from "../src/domain/plan-presentation.ts";
import {
  activeLibraryBatches,
  completedLibraryBatches,
  libraryBatchCard,
  selectedPlantIdsWithoutBatches,
} from "../src/domain/plant-library.ts";
import { addPlantPlacement, placementsForBatch, removePlantPlacement } from "../src/domain/plant-placement.ts";
import { visiblePlanEventsForBatches, visibleTodayTasksForBatches } from "../src/domain/task-visibility.ts";
import { completeTodayTask, postponeTodayTask, prioritizeTodayTasks, taskFromPlanEvent } from "../src/domain/today-tasks.ts";
import { activeBatchesForPlant, completeSpecificBatch, completionRequiredForPlant } from "../src/domain/batch-completion.ts";
import type { GrowingBatch, GrowingSpace, TodayTask } from "../src/domain/growing-types.ts";

const tomato = plants.find((plant) => plant.id === "tomat")!;
const batch = (patch: Partial<GrowingBatch> = {}): GrowingBatch => ({
  id: "batch-a",
  plantId: "tomat",
  startType: "seed",
  startDate: "2026-03-10",
  status: "active",
  actualEvents: [],
  ...patch,
});
const space = (placements: GrowingSpace["placements"] = []): GrowingSpace => ({
  id: "space-a",
  name: "Pallkrage",
  type: "pallkrage",
  sun: "soligt",
  plantIds: [...new Set(placements.map((placement) => placement.plantId))],
  placements,
});

test("a growing batch receives a unique id", () => {
  let index = 0;
  const ids = ["batch-1", "batch-2"];
  const first = createGrowingBatch({ plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => ids[index++]);
  const second = createGrowingBatch({ plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => ids[index++]);

  assert.equal(first.id, "batch-1");
  assert.equal(second.id, "batch-2");
  assert.notEqual(first.id, second.id);
  assert.equal(first.status, "active");
});

test("two batches of the same plant keep separate plan event ids and batch ids", () => {
  const first = batch({ id: "tomat-a" });
  const second = batch({ id: "tomat-b" });
  const firstPlan = planBatch(first, plants);
  const secondPlan = planBatch(second, plants);

  assert.ok(firstPlan.events.every((event) => event.batchId === "tomat-a"));
  assert.ok(secondPlan.events.every((event) => event.batchId === "tomat-b"));
  assert.notEqual(firstPlan.events.find((event) => event.source === "calculated")?.id, secondPlan.events.find((event) => event.source === "calculated")?.id);
});

test("start date affects future plan events and creates separate plans", () => {
  const early = planBatch(batch({ id: "early", startDate: "2026-03-10" }), plants);
  const late = planBatch(batch({ id: "late", startDate: "2026-05-10" }), plants);

  assert.notEqual(
    early.events.find((event) => event.type === "skörd")?.from,
    late.events.find((event) => event.type === "skörd")?.from,
  );
  assert.ok(early.events.find((event) => event.type === "skörd")!.from < late.events.find((event) => event.type === "skörd")!.from);
});

test("variety separates batches without duplicating the catalog plant", () => {
  const sungold = batch({ id: "batch-sungold", variety: "Sungold" });
  const moneymaker = batch({ id: "batch-moneymaker", variety: "Moneymaker" });
  const cards = [sungold, moneymaker].map((item) => libraryBatchCard(item, plants, []));

  assert.deepEqual(cards.map((card) => card.plantId), ["tomat", "tomat"]);
  assert.deepEqual(cards.map((card) => card.variety), ["Sungold", "Moneymaker"]);
});

test("plan events sort and group chronologically by Swedish month", () => {
  const items = [
    { id: "b", from: "2026-08-10", to: "2026-08-12" },
    { id: "a", from: "2026-07-25", to: "2026-08-02" },
    { id: "c", from: "2026-08-01", to: "2026-08-01" },
  ];

  assert.deepEqual(sortPlanItems(items).map((item) => item.id), ["a", "c", "b"]);
  assert.deepEqual(groupByMonth(items, 2026).map((group) => [group.name, group.items.map((item) => item.id)]), [
    ["Juli", ["a"]],
    ["Augusti", ["c", "b"]],
  ]);
  assert.deepEqual(monthsForRange({ from: "2026-07-25", to: "2026-08-02" }), [6, 7]);
});

test("Swedish date presentation handles single dates and ranges", () => {
  assert.equal(formatSwedishDateRange({ from: "2026-07-25", to: "2026-07-25" }), "25 juli");
  assert.equal(formatSwedishDateRange({ from: "2026-07-25", to: "2026-08-24" }), "25 juli-24 augusti");
});

test("catalog timing can be presented as a whole month window", () => {
  assert.deepEqual(planDateRangeForPlant(tomato, "preSow", 2026), { from: "2026-03-01", to: "2026-03-31" });
});

test("a specific batch can be completed without changing another batch of the same plant", () => {
  const original = [batch({ id: "tomat-a" }), batch({ id: "tomat-b" })];
  const updated = completeSpecificBatch(original, "tomat-a", "2026-08-01");

  assert.deepEqual(updated.map((item) => [item.id, item.status, item.completedAt]), [
    ["tomat-a", "completed", "2026-08-01"],
    ["tomat-b", "active", undefined],
  ]);
  assert.equal(original[0].status, "active");
});

test("completed batches stop producing future plan events but preserve history", () => {
  const withHistory = recordActualEvent(batch(), "sådd", "2026-03-10", () => "actual-1");
  const completed = completeGrowingBatch(withHistory, "2026-08-01");
  const plan = planBatch(completed, plants);

  assert.ok(plan.events.every((event) => event.status === "done"));
  assert.ok(plan.events.some((event) => event.type === "sådd"));
  assert.ok(plan.events.some((event) => event.type === "avslutad"));
  assert.equal(plan.history.length, 2);
});

test("future tasks from completed batches are hidden while done history remains visible", () => {
  const completed = completeGrowingBatch(batch({ id: "tomat-a" }), "2026-08-01");
  const active = batch({ id: "tomat-b" });
  const events = [
    { id: "tomat-a:skörd", batchId: "tomat-a", plantId: "tomat", type: "skörd" as const, title: "Skörd", from: "2026-08-10", to: "2026-08-20", status: "planned" as const, reason: "", source: "calculated" as const },
    { id: "tomat-a:sådd", batchId: "tomat-a", plantId: "tomat", type: "sådd" as const, title: "Sådd", from: "2026-03-10", to: "2026-03-10", status: "done" as const, reason: "", source: "actual" as const },
    { id: "tomat-b:skörd", batchId: "tomat-b", plantId: "tomat", type: "skörd" as const, title: "Skörd", from: "2026-08-10", to: "2026-08-20", status: "planned" as const, reason: "", source: "calculated" as const },
  ];

  assert.deepEqual(visiblePlanEventsForBatches(events, [completed, active]).map((event) => event.id), ["tomat-a:sådd", "tomat-b:skörd"]);
});

test("physical placement can remain after batch completion and explicit release touches only one placement", () => {
  const completed = completeGrowingBatch(batch({ id: "tomat-a" }), "2026-08-01");
  const original = space([
    { id: "placement-a", spaceId: "space-a", plantId: "tomat", batchId: completed.id, x: 20, y: 30 },
    { id: "placement-b", spaceId: "space-a", plantId: "tomat", batchId: "tomat-b", x: 60, y: 30 },
  ]);
  const released = removePlantPlacement(original, "placement-a");

  assert.equal(placementsForBatch([original], completed.id).length, 1);
  assert.deepEqual(released.placements.map((placement) => placement.id), ["placement-b"]);
  assert.deepEqual(released.plantIds, ["tomat"]);
});

test("adding placement links plant species to the exact batch", () => {
  const placed = addPlantPlacement(space(), { id: "placement-a", spaceId: "space-a", plantId: "tomat", batchId: "batch-a", x: 20, y: 30 });

  assert.deepEqual(placed.plantIds, ["tomat"]);
  assert.equal(placed.placements[0].batchId, "batch-a");
});

test("today task operations are immutable and deterministic", () => {
  const tasks: TodayTask[] = [
    { id: "low", title: "Låg", priority: "Låg", state: "pending", from: "2026-08-02", to: "2026-08-02" },
    { id: "high", title: "Hög", priority: "Hög", state: "pending", from: "2026-08-03", to: "2026-08-03" },
  ];
  const prioritized = prioritizeTodayTasks(tasks);
  const completed = completeTodayTask(tasks, "high");
  const postponed = postponeTodayTask(tasks, "low", 2);

  assert.deepEqual(prioritized.map((task) => task.id), ["high", "low"]);
  assert.equal(completed.find((task) => task.id === "high")?.state, "done");
  assert.equal(postponed.find((task) => task.id === "low")?.from, "2026-08-04");
  assert.equal(tasks[0].state, "pending");
  assert.equal(tasks[0].from, "2026-08-02");
});

test("today task visibility is filtered by batch id, not plant id", () => {
  const completed = completeGrowingBatch(batch({ id: "tomat-a" }), "2026-08-01");
  const active = batch({ id: "tomat-b" });
  const tasks = [
    { id: "today-a", batchId: "tomat-a", plantId: "tomat", title: "A", priority: "Normal" as const, state: "pending" as const, from: "2026-08-02", to: "2026-08-02" },
    { id: "today-b", batchId: "tomat-b", plantId: "tomat", title: "B", priority: "Normal" as const, state: "pending" as const, from: "2026-08-02", to: "2026-08-02" },
    { id: "done-a", batchId: "tomat-a", plantId: "tomat", title: "Done", priority: "Normal" as const, state: "done" as const, from: "2026-08-02", to: "2026-08-02" },
  ];

  assert.deepEqual(visibleTodayTasksForBatches(tasks, [completed, active]).map((task) => task.id), ["today-b", "done-a"]);
});

test("taskFromPlanEvent keeps the source batch and plant identifiers", () => {
  const event = planBatch(batch({ id: "batch-a" }), plants).events.find((item) => item.status === "planned")!;
  const task = taskFromPlanEvent(event);

  assert.equal(task.id, `today:${event.id}`);
  assert.equal(task.batchId, "batch-a");
  assert.equal(task.plantId, "tomat");
});

test("plant library separates active and completed batches and keeps unplanned selected plants", () => {
  const active = batch({ id: "active" });
  const completed = completeGrowingBatch(batch({ id: "completed" }), "2026-08-01");

  assert.deepEqual(activeLibraryBatches([active, completed]).map((item) => item.id), ["active"]);
  assert.deepEqual(completedLibraryBatches([active, completed]).map((item) => item.id), ["completed"]);
  assert.deepEqual(selectedPlantIdsWithoutBatches(["tomat", "basilika"], [active]), ["basilika"]);
});

test("completion controller logic uses the exact active plant batches", () => {
  const batches = [batch({ id: "tomat-a" }), completeGrowingBatch(batch({ id: "tomat-b" }), "2026-08-01"), batch({ id: "gurka-a", plantId: "gurka" })];

  assert.deepEqual(activeBatchesForPlant(batches, "tomat").map((item) => item.id), ["tomat-a"]);
  assert.equal(completionRequiredForPlant(batches, "tomat"), true);
  assert.equal(completionRequiredForPlant(batches, "sallat"), false);
});

test("unknown plant ids are reported without silent corruption", () => {
  const plan = planBatch(batch({ plantId: "future-plant" }), plants);

  assert.equal(plan.warning, "Okänd växt: future-plant");
  assert.deepEqual(plan.events, []);
});

test("purchased flowering plants skip earlier lifecycle events", () => {
  const plan = planBatch(batch({ startType: "purchased", purchasedStage: "flowering", startDate: "2026-06-01" }), plants);
  const types = plan.events.map((event) => event.type);

  assert.equal(types.includes("avhärdning"), false);
  assert.equal(types.includes("utplantering"), false);
  assert.equal(types.includes("blomning"), false);
  assert.equal(types.includes("frukt"), true);
});
