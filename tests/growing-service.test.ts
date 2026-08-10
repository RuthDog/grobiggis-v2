import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planBatch, recordActualEvent } from "../src/domain/growing-plan.ts";
import { buildTodayViewFromBatches } from "../src/domain/today-view.ts";
import type { GrowingBatch } from "../src/domain/growing-types.ts";
import {
  completeGrowingBatchForUser,
  completePlanActivityForUser,
  createGrowingBatchForUser,
  getGrowingBatchForUser,
  listGrowingBatchesForUser,
  splitBatchesByStatus,
} from "../src/lib/growing/service.ts";
import { GrowingInputError, validateCreateGrowingBatchInput } from "../src/lib/growing/validation.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";
import { plants } from "../src/data/plants.ts";

class MemoryGrowingBatchRepository implements GrowingBatchRepository {
  readonly rows = new Map<string, { userId: string; batch: GrowingBatch }>();
  savedCalculatedEvents = 0;
  savedActualEvents = 0;

  async create(userId: string, batch: GrowingBatch) {
    return this.createForUser(userId, batch);
  }

  async createForUser(userId: string, batch: GrowingBatch) {
    const snapshot = structuredClone(batch);
    this.rows.set(snapshot.id, { userId, batch: snapshot });
    return structuredClone(snapshot);
  }

  async getByIdForUser(userId: string, batchId: string) {
    const stored = this.rows.get(batchId);
    if (!stored || stored.userId !== userId) return null;
    return structuredClone(stored.batch);
  }

  async listForUser(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId).map((row) => structuredClone(row.batch));
  }

  async save(userId: string, batch: GrowingBatch) {
    return this.saveForUser(userId, batch);
  }

  async saveForUser(userId: string, batch: GrowingBatch) {
    const stored = this.rows.get(batch.id);
    if (!stored || stored.userId !== userId) throw new Error("not found");
    const snapshot = structuredClone(batch);
    this.rows.set(snapshot.id, { userId, batch: snapshot });
    return structuredClone(snapshot);
  }

  async addActualEventForUser(userId: string, batchId: string, event: GrowingBatch["actualEvents"][number]) {
    const stored = this.rows.get(batchId);
    if (!stored || stored.userId !== userId) return null;
    if (stored.batch.actualEvents.some((existing) => existing.type === event.type)) return structuredClone(stored.batch);
    const snapshot = structuredClone(stored.batch);
    snapshot.actualEvents.push({ ...structuredClone(event), batchId, plantId: snapshot.plantId });
    this.rows.set(batchId, { userId, batch: snapshot });
    this.savedActualEvents += 1;
    return structuredClone(snapshot);
  }

  async complete(userId: string, batchId: string, completedAt: string) {
    return this.completeForUser(userId, batchId, completedAt);
  }

  async completeForUser(userId: string, batchId: string, completedAt: string) {
    const batch = await this.getByIdForUser(userId, batchId);
    if (!batch) return null;
    return this.saveForUser(userId, { ...batch, status: "completed", completedAt });
  }
}

const userA = { id: "user-a" };
const userB = { id: "user-b" };

test("create requires a verified user", async () => {
  const repository = new MemoryGrowingBatchRepository();

  await assert.rejects(
    () =>
      createGrowingBatchForUser(
        repository,
        { id: "" },
        { plantId: "tomat", startType: "seed", startDate: "2026-03-10" },
        () => "batch-a",
      ),
    /Authentication required/i,
  );
});

test("client userId and server-owned fields are rejected", () => {
  assert.throws(
    () =>
      validateCreateGrowingBatchInput({
        plantId: "tomat",
        startType: "seed",
        startDate: "2026-03-10",
        userId: "client-user",
      }),
    GrowingInputError,
  );
  assert.throws(
    () =>
      validateCreateGrowingBatchInput({
        plantId: "tomat",
        startType: "seed",
        startDate: "2026-03-10",
        id: "client-id",
      }),
    GrowingInputError,
  );
});

test("plantId and startType are validated", () => {
  assert.throws(() => validateCreateGrowingBatchInput({ plantId: "saknas", startType: "seed", startDate: "2026-03-10" }), /Växten kunde inte hittas/);
  assert.throws(() => validateCreateGrowingBatchInput({ plantId: "tomat", startType: "weird", startDate: "2026-03-10" }), GrowingInputError);
});

test("startDate and variety are normalized", () => {
  assert.deepEqual(validateCreateGrowingBatchInput({ plantId: "tomat", variety: "  Sungold  ", startType: "seed", startDate: "2026-03-10" }), {
    plantId: "tomat",
    variety: "Sungold",
    startType: "seed",
    startDate: "2026-03-10",
  });
  assert.equal(validateCreateGrowingBatchInput({ plantId: "tomat", variety: "  ", startType: "seed", startDate: "2026-03-10" }).variety, undefined);
  assert.throws(() => validateCreateGrowingBatchInput({ plantId: "tomat", startType: "seed", startDate: "2026-02-31" }), GrowingInputError);
  assert.throws(() => validateCreateGrowingBatchInput({ plantId: "tomat", variety: "x".repeat(81), startType: "seed", startDate: "2026-03-10" }), GrowingInputError);
});

test("batch is created with server-generated id and session user id", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(
    repository,
    userA,
    { plantId: "tomat", startType: "seed", startDate: "2026-03-10" },
    () => "server-batch-id",
  );

  assert.equal(created.id, "server-batch-id");
  assert.equal(repository.rows.get("server-batch-id")?.userId, "user-a");
});

test("batch survives repository round-trip and plan reconstruction", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(
    repository,
    userA,
    { plantId: "tomat", variety: "Sungold", startType: "seed", startDate: "2026-03-10" },
    () => "batch-a",
  );
  const withHistory = recordActualEvent(created, "sådd", "2026-03-10", () => "actual-a");
  await repository.saveForUser(userA.id, withHistory);

  const loaded = await getGrowingBatchForUser(repository, userA, "batch-a");
  assert.deepEqual(loaded, withHistory);
  assert.ok(planBatch(loaded!, plants).events.some((event) => event.source === "calculated"));
});

test("list and detail are scoped by verified user", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const batchA = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const batchB = await createGrowingBatchForUser(repository, userB, { plantId: "basilika", startType: "seed", startDate: "2026-04-01" }, () => "batch-b");

  assert.deepEqual(await listGrowingBatchesForUser(repository, userA), [batchA]);
  assert.deepEqual(await listGrowingBatchesForUser(repository, userB), [batchB]);
  assert.equal(await getGrowingBatchForUser(repository, userA, "batch-b"), null);
  assert.equal(await getGrowingBatchForUser(repository, userB, "batch-a"), null);
});

test("users cannot complete each other's batches", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  await createGrowingBatchForUser(repository, userB, { plantId: "basilika", startType: "seed", startDate: "2026-04-01" }, () => "batch-b");

  assert.equal(await completeGrowingBatchForUser(repository, userA, "batch-b", "2026-09-01"), null);
  assert.equal(await completeGrowingBatchForUser(repository, userB, "batch-a", "2026-09-01"), null);
  assert.equal((await getGrowingBatchForUser(repository, userA, "batch-a"))?.status, "active");
  assert.equal((await getGrowingBatchForUser(repository, userB, "batch-b"))?.status, "active");
});

test("completion persists completedAt and reload-equivalent history", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const completed = await completeGrowingBatchForUser(repository, userA, "batch-a", "2026-09-01");
  const reloaded = await getGrowingBatchForUser(repository, userA, "batch-a");
  const plan = planBatch(reloaded!, plants);

  assert.equal(completed?.status, "completed");
  assert.equal(reloaded?.completedAt, "2026-09-01");
  assert.ok(plan.events.every((event) => event.status === "done"));
  assert.ok(plan.events.some((event) => event.type === "avslutad"));
});

test("plan activity completion requires auth and rejects client-owned facts", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const planned = planBatch(created, plants).events.find((event) => event.source === "calculated")!;

  await assert.rejects(
    () => completePlanActivityForUser(repository, { id: "" }, { batchId: created.id, planEventId: planned.id }),
    /Authentication required/i,
  );
  await assert.rejects(
    () =>
      completePlanActivityForUser(
        repository,
        userA,
        { batchId: created.id, planEventId: planned.id, userId: "client-user", occurredOn: "2026-01-01" },
        new Date("2026-04-01T10:00:00Z"),
      ),
    GrowingInputError,
  );
});

test("plan activity completion persists one scoped actual event and removes the pending task", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const planned = planBatch(created, plants).events.find((event) => event.source === "calculated")!;

  const completed = await completePlanActivityForUser(
    repository,
    userA,
    { batchId: created.id, planEventId: planned.id, eventType: planned.type },
    new Date("2026-04-01T22:30:00Z"),
    () => "actual-a",
  );
  const reloaded = await getGrowingBatchForUser(repository, userA, created.id);
  const actual = reloaded?.actualEvents[0];
  const plan = planBatch(reloaded!, plants);
  const today = buildTodayViewFromBatches([reloaded!], new Date("2026-04-02T09:00:00Z"));

  assert.equal(completed?.id, "batch-a");
  assert.equal(repository.rows.get("batch-a")?.userId, "user-a");
  assert.equal(actual?.id, "actual-a");
  assert.equal(actual?.batchId, "batch-a");
  assert.equal(actual?.plantId, "tomat");
  assert.equal(actual?.type, planned.type);
  assert.equal(actual?.occurredOn, "2026-04-02");
  assert.equal(repository.savedActualEvents, 1);
  assert.equal(repository.savedCalculatedEvents, 0);
  assert.ok(plan.events.some((event) => event.source === "actual" && event.status === "done" && event.type === planned.type));
  assert.ok(!plan.events.some((event) => event.source === "calculated" && event.type === planned.type));
  assert.ok(![...today.sections.today, ...today.sections.now, ...today.sections.next].some((activity) => activity.planEventId === planned.id));
});

test("plan activity completion rejects arbitrary or stale plan event identities", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const planned = planBatch(created, plants).events.find((event) => event.source === "calculated")!;

  await assert.rejects(
    () => completePlanActivityForUser(repository, userA, { batchId: created.id, planEventId: planned.id, eventType: "hack" }),
    GrowingInputError,
  );
  await assert.rejects(
    () => completePlanActivityForUser(repository, userA, { batchId: created.id, planEventId: "batch-a:does-not-exist" }),
    GrowingInputError,
  );
});

test("users cannot complete another user's plan activity", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const batchB = await createGrowingBatchForUser(repository, userB, { plantId: "basilika", startType: "seed", startDate: "2026-04-01" }, () => "batch-b");
  const plannedB = planBatch(batchB, plants).events.find((event) => event.source === "calculated")!;

  assert.equal(await completePlanActivityForUser(repository, userA, { batchId: "batch-b", planEventId: plannedB.id }), null);
  assert.equal((await getGrowingBatchForUser(repository, userB, "batch-b"))?.actualEvents.length, 0);
});

test("plan activity completion is idempotent and leaves sibling batches untouched", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const batchA = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", variety: "A", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const batchB = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", variety: "B", startType: "seed", startDate: "2026-03-10" }, () => "batch-b");
  const plannedA = planBatch(batchA, plants).events.find((event) => event.source === "calculated")!;

  await completePlanActivityForUser(repository, userA, { batchId: batchA.id, planEventId: plannedA.id }, new Date("2026-04-01T10:00:00Z"), () => "actual-a");
  await completePlanActivityForUser(repository, userA, { batchId: batchA.id, planEventId: plannedA.id }, new Date("2026-04-01T10:00:00Z"), () => "actual-b");

  assert.equal((await getGrowingBatchForUser(repository, userA, batchA.id))?.actualEvents.length, 1);
  assert.equal((await getGrowingBatchForUser(repository, userA, batchB.id))?.actualEvents.length, 0);
  assert.equal(repository.savedActualEvents, 1);
});

test("completed batches cannot receive plan activity completions", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const planned = planBatch(created, plants).events.find((event) => event.source === "calculated")!;
  await completeGrowingBatchForUser(repository, userA, created.id, "2026-09-01");

  await assert.rejects(
    () => completePlanActivityForUser(repository, userA, { batchId: created.id, planEventId: planned.id }),
    GrowingInputError,
  );
});

test("calculated future events are not persisted", async () => {
  const repository = new MemoryGrowingBatchRepository();
  const created = await createGrowingBatchForUser(repository, userA, { plantId: "tomat", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  const plan = planBatch(created, plants);

  assert.ok(plan.events.some((event) => event.source === "calculated"));
  assert.equal(repository.savedCalculatedEvents, 0);
});

test("two batches of same plant remain separate and sort into active/completed groups", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await createGrowingBatchForUser(repository, userA, { plantId: "tomat", variety: "A", startType: "seed", startDate: "2026-03-10" }, () => "batch-a");
  await createGrowingBatchForUser(repository, userA, { plantId: "tomat", variety: "B", startType: "seed", startDate: "2026-03-11" }, () => "batch-b");
  await completeGrowingBatchForUser(repository, userA, "batch-a", "2026-09-01");

  const groups = splitBatchesByStatus(await listGrowingBatchesForUser(repository, userA));
  assert.deepEqual(groups.activeBatches.map((batch) => batch.id), ["batch-b"]);
  assert.deepEqual(groups.completedBatches.map((batch) => batch.id), ["batch-a"]);
});

test("UI no longer uses browser storage or GrowingSessionProvider", () => {
  const source = [
    readFileSync("src/components/AppShell.tsx", "utf8"),
    readFileSync("src/app/min-plan/page.tsx", "utf8"),
    readFileSync("src/app/min-plan/[batchId]/page.tsx", "utf8"),
    readFileSync("src/app/vaxtbibliotek/StartGrowingDialog.tsx", "utf8"),
  ].join("\n");

  assert.doesNotMatch(source, /GrowingSessionProvider|useGrowingSession|localStorage|sessionStorage|indexedDB/);
  assert.match(source, /getCurrentUserGrowingBatches|createGrowingBatchAction|completeGrowingBatchAction/);
});
