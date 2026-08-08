import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planBatch, recordActualEvent } from "../src/domain/growing-plan.ts";
import type { GrowingBatch } from "../src/domain/growing-types.ts";
import {
  completeGrowingBatchForUser,
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
