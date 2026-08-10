import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { completeGrowingBatch, createGrowingBatch, recordActualEvent } from "../src/domain/growing-plan.ts";
import { growingSpaceTypes, validateCreateGrowingSpaceInput } from "../src/domain/growing-spaces.ts";
import type { GrowingBatch, GrowingSpace, PlantPlacement } from "../src/domain/growing-types.ts";
import {
  createGrowingSpaceForUser,
  getGrowingSpaceForUser,
  listGrowingSpacesForUser,
  placeBatchInSpaceForUser,
  releasePlantPlacementForUser,
} from "../src/lib/growing/spaces.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";
import {
  PlantPlacementConflictError,
  type GrowingSpaceRepository,
  type PlantPlacementRepository,
} from "../src/repositories/growing-space-repository.ts";

class MemoryGrowingBatchRepository implements GrowingBatchRepository {
  readonly rows = new Map<string, { userId: string; batch: GrowingBatch }>();
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
    const row = this.rows.get(batchId);
    if (!row || row.userId !== userId) return null;
    return structuredClone(row.batch);
  }

  async listForUser(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId).map((row) => structuredClone(row.batch));
  }

  async save(userId: string, batch: GrowingBatch) {
    return this.saveForUser(userId, batch);
  }

  async saveForUser(userId: string, batch: GrowingBatch) {
    const existing = this.rows.get(batch.id);
    if (!existing || existing.userId !== userId) throw new Error("not found");
    const snapshot = structuredClone(batch);
    this.rows.set(batch.id, { userId, batch: snapshot });
    return structuredClone(snapshot);
  }

  async addActualEventForUser(userId: string, batchId: string, event: GrowingBatch["actualEvents"][number]) {
    const existing = await this.getByIdForUser(userId, batchId);
    if (!existing) return null;
    const updated = { ...existing, actualEvents: [...existing.actualEvents, event] };
    this.savedActualEvents += 1;
    return this.saveForUser(userId, updated);
  }

  async complete(userId: string, batchId: string, completedAt: string) {
    return this.completeForUser(userId, batchId, completedAt);
  }

  async completeForUser(userId: string, batchId: string, completedAt: string) {
    const batch = await this.getByIdForUser(userId, batchId);
    if (!batch) return null;
    return this.saveForUser(userId, completeGrowingBatch(batch, completedAt));
  }
}

class MemoryGrowingSpaceRepository implements GrowingSpaceRepository {
  readonly rows = new Map<string, GrowingSpace>();

  async createForUser(userId: string, space: GrowingSpace) {
    const snapshot = { ...structuredClone(space), userId, placements: [] };
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }

  async getByIdForUser(userId: string, spaceId: string) {
    const space = this.rows.get(spaceId);
    if (!space || space.userId !== userId) return null;
    return structuredClone(space);
  }

  async listForUser(userId: string) {
    return [...this.rows.values()].filter((space) => space.userId === userId).map((space) => structuredClone(space));
  }
}

class MemoryPlantPlacementRepository implements PlantPlacementRepository {
  readonly rows = new Map<string, PlantPlacement>();
  private readonly spaces: MemoryGrowingSpaceRepository;
  private readonly batches: MemoryGrowingBatchRepository;

  constructor(spaces: MemoryGrowingSpaceRepository, batches: MemoryGrowingBatchRepository) {
    this.spaces = spaces;
    this.batches = batches;
  }

  async placeBatchForUser(userId: string, placement: PlantPlacement) {
    const space = await this.spaces.getByIdForUser(userId, placement.spaceId);
    const batch = await this.batches.getByIdForUser(userId, placement.batchId);
    if (!space || !batch) return null;
    const existing = await this.getActivePlacementForBatchForUser(userId, placement.batchId);
    if (existing) throw new PlantPlacementConflictError(placement.batchId);
    const snapshot = { ...structuredClone(placement), userId, spaceId: space.id, batchId: batch.id };
    this.rows.set(snapshot.id, snapshot);
    this.spaces.rows.set(space.id, { ...space, placements: [...space.placements, snapshot] });
    return structuredClone(snapshot);
  }

  async listForUser(userId: string, options: { includeRemoved?: boolean } = {}) {
    return [...this.rows.values()]
      .filter((placement) => placement.userId === userId)
      .filter((placement) => options.includeRemoved || !placement.removedAt)
      .map((placement) => structuredClone(placement));
  }

  async listForSpaceForUser(userId: string, spaceId: string, options: { includeRemoved?: boolean } = {}) {
    const space = await this.spaces.getByIdForUser(userId, spaceId);
    if (!space) return [];
    return this.listForUser(userId, options).then((placements) => placements.filter((placement) => placement.spaceId === spaceId));
  }

  async getActivePlacementForBatchForUser(userId: string, batchId: string) {
    return (
      [...this.rows.values()]
        .filter((placement) => placement.userId === userId && placement.batchId === batchId && !placement.removedAt)
        .map((placement) => structuredClone(placement))[0] ?? null
    );
  }

  async releaseForUser(userId: string, placementId: string, removedAt: string) {
    const placement = this.rows.get(placementId);
    if (!placement || placement.userId !== userId || placement.removedAt) return null;
    const released = { ...placement, removedAt };
    this.rows.set(placementId, released);
    const space = this.spaces.rows.get(released.spaceId);
    if (space) {
      this.spaces.rows.set(space.id, {
        ...space,
        placements: space.placements.map((item) => (item.id === placementId ? released : item)),
      });
    }
    return structuredClone(released);
  }
}

const userA = { id: "user-a" };
const userB = { id: "user-b" };

function batch(id: string, patch: Partial<GrowingBatch> = {}) {
  return createGrowingBatch({ id, plantId: "tomat", startType: "seed", startDate: "2026-03-10", ...patch }, () => id);
}

async function seeded() {
  const batchRepository = new MemoryGrowingBatchRepository();
  const spaceRepository = new MemoryGrowingSpaceRepository();
  const placementRepository = new MemoryPlantPlacementRepository(spaceRepository, batchRepository);
  await batchRepository.createForUser(userA.id, batch("batch-a"));
  await batchRepository.createForUser(userA.id, batch("batch-a-2", { variety: "Golden" }));
  await batchRepository.createForUser(userB.id, batch("batch-b", { plantId: "basilika" }));
  await createGrowingSpaceForUser(spaceRepository, userA, { name: " Pallkragen vid altanen ", type: "raised_bed" }, () => "space-a", "2026-08-10T10:00:00.000Z");
  await createGrowingSpaceForUser(spaceRepository, userA, { name: "Lilla vaxthuset", type: "greenhouse" }, () => "space-a-2", "2026-08-10T10:05:00.000Z");
  await createGrowingSpaceForUser(spaceRepository, userB, { name: "B:s krukor", type: "pot" }, () => "space-b", "2026-08-10T10:10:00.000Z");
  return { batchRepository, spaceRepository, placementRepository };
}

test("space types stay small and product-backed", () => {
  assert.deepEqual([...growingSpaceTypes], ["raised_bed", "greenhouse", "open_ground", "pot"]);
});

test("growing space can be created with trimmed name and user ownership", async () => {
  const { spaceRepository } = await seeded();
  const space = await getGrowingSpaceForUser(spaceRepository, userA, "space-a");

  assert.equal(space?.name, "Pallkragen vid altanen");
  assert.equal(space?.type, "raised_bed");
  assert.equal(space?.userId, "user-a");
  assert.equal(space?.createdAt, "2026-08-10T10:00:00.000Z");
});

test("space name is required and length limited", () => {
  assert.throws(() => validateCreateGrowingSpaceInput({ name: " ", type: "raised_bed" }), /namn/);
  assert.throws(() => validateCreateGrowingSpaceInput({ name: "x".repeat(81), type: "raised_bed" }), /langt/);
});

test("space type is validated and unknown type is rejected", () => {
  assert.throws(() => validateCreateGrowingSpaceInput({ name: "Altanen", type: "balcony" }), /typ/);
});

test("server-owned space fields are rejected", () => {
  assert.throws(() => validateCreateGrowingSpaceInput({ id: "client", userId: "user-b", name: "Altanen", type: "pot" }), /sparas/);
});

test("listForUser and getByIdForUser isolate spaces", async () => {
  const { spaceRepository } = await seeded();

  assert.deepEqual((await listGrowingSpacesForUser(spaceRepository, userA)).map((space) => space.id), ["space-a", "space-a-2"]);
  assert.deepEqual((await listGrowingSpacesForUser(spaceRepository, userB)).map((space) => space.id), ["space-b"]);
  assert.equal(await getGrowingSpaceForUser(spaceRepository, userA, "space-b"), null);
});

test("placement can be created between own batch and own space", async () => {
  const { placementRepository } = await seeded();
  const placement = await placeBatchInSpaceForUser(
    placementRepository,
    userA,
    { spaceId: "space-a", batchId: "batch-a" },
    () => "placement-a",
    "2026-08-10T11:00:00.000Z",
  );

  assert.equal(placement?.id, "placement-a");
  assert.equal(placement?.userId, "user-a");
  assert.equal(placement?.spaceId, "space-a");
  assert.equal(placement?.batchId, "batch-a");
  assert.equal(placement?.placedAt, "2026-08-10T11:00:00.000Z");
});

test("client-owned placement fields are rejected", async () => {
  const { placementRepository } = await seeded();

  await assert.rejects(
    () => placeBatchInSpaceForUser(placementRepository, userA, { id: "client", userId: "user-b", spaceId: "space-a", batchId: "batch-a" }),
    /Placeringen kunde inte sparas/,
  );
});

test("users cannot place another user's batch", async () => {
  const { placementRepository } = await seeded();

  assert.equal(await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-b" }), null);
});

test("users cannot place their batch on another user's space", async () => {
  const { placementRepository } = await seeded();

  assert.equal(await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-b", batchId: "batch-a" }), null);
});

test("users cannot read or release another user's placement even with known ids", async () => {
  const { placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");

  assert.deepEqual(await placementRepository.listForUser(userB.id), []);
  assert.equal(await releasePlantPlacementForUser(placementRepository, userB, "placement-a"), null);
});

test("one space can hold multiple active batch placements", async () => {
  const { placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a-2" }, () => "placement-b");

  assert.deepEqual((await placementRepository.listForSpaceForUser(userA.id, "space-a")).map((placement) => placement.batchId), ["batch-a", "batch-a-2"]);
});

test("same batch cannot have two active placements", async () => {
  const { placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");

  await assert.rejects(
    () => placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a-2", batchId: "batch-a" }, () => "placement-b"),
    PlantPlacementConflictError,
  );
});

test("two batches of the same plant can be placed separately", async () => {
  const { placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a-2", batchId: "batch-a-2" }, () => "placement-b");

  assert.deepEqual((await placementRepository.listForUser(userA.id)).map((placement) => placement.spaceId), ["space-a", "space-a-2"]);
});

test("completed batch keeps active placement until explicit release", async () => {
  const { batchRepository, placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await batchRepository.completeForUser(userA.id, "batch-a", "2026-09-01");

  assert.equal((await batchRepository.getByIdForUser(userA.id, "batch-a"))?.status, "completed");
  assert.equal((await placementRepository.getActivePlacementForBatchForUser(userA.id, "batch-a"))?.id, "placement-a");
});

test("completion does not touch placements or growing event history", async () => {
  const { batchRepository, placementRepository } = await seeded();
  const withHistory = recordActualEvent((await batchRepository.getByIdForUser(userA.id, "batch-a"))!, "sådd", "2026-03-10", () => "event-a");
  await batchRepository.saveForUser(userA.id, withHistory);
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await batchRepository.completeForUser(userA.id, "batch-a", "2026-09-01");

  assert.equal((await placementRepository.getActivePlacementForBatchForUser(userA.id, "batch-a"))?.id, "placement-a");
  assert.deepEqual((await batchRepository.getByIdForUser(userA.id, "batch-a"))?.actualEvents.map((event) => event.id), ["event-a"]);
});

test("explicit release affects only the active placement", async () => {
  const { placementRepository } = await seeded();
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a-2" }, () => "placement-b");
  await releasePlantPlacementForUser(placementRepository, userA, "placement-a", "2026-09-02T12:00:00.000Z");

  assert.deepEqual((await placementRepository.listForUser(userA.id)).map((placement) => placement.id), ["placement-b"]);
  assert.deepEqual((await placementRepository.listForUser(userA.id, { includeRemoved: true })).map((placement) => placement.id), ["placement-a", "placement-b"]);
  assert.equal((await placementRepository.listForUser(userA.id, { includeRemoved: true }))[0].removedAt, "2026-09-02T12:00:00.000Z");
});

test("release does not change batch history or growing events", async () => {
  const { batchRepository, placementRepository } = await seeded();
  const withHistory = recordActualEvent((await batchRepository.getByIdForUser(userA.id, "batch-a"))!, "sådd", "2026-03-10", () => "event-a");
  await batchRepository.saveForUser(userA.id, withHistory);
  await placeBatchInSpaceForUser(placementRepository, userA, { spaceId: "space-a", batchId: "batch-a" }, () => "placement-a");
  await releasePlantPlacementForUser(placementRepository, userA, "placement-a", "2026-09-02T12:00:00.000Z");

  assert.equal((await batchRepository.getByIdForUser(userA.id, "batch-a"))?.status, "active");
  assert.deepEqual((await batchRepository.getByIdForUser(userA.id, "batch-a"))?.actualEvents.map((event) => event.id), ["event-a"]);
  assert.equal(batchRepository.savedActualEvents, 0);
});

test("repository source verifies cross-user relation rules", () => {
  const source = readFileSync("src/repositories/growing-space-repository.ts", "utf8");

  assert.match(source, /eq\(growingSpaces\.userId, userId\)/);
  assert.match(source, /eq\(growingBatches\.userId, userId\)/);
  assert.match(source, /PlantPlacementConflictError/);
});
