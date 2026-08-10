import { and, eq, isNull } from "drizzle-orm";
import type { GrobiggisDb } from "../db/client.ts";
import {
  growingBatches,
  growingSpaces,
  plantPlacements,
  type GrowingSpaceRow,
  type PlantPlacementRow,
} from "../db/schema.ts";
import { assertGrowingSpaceType } from "../domain/growing-spaces.ts";
import type { GrowingSpace, PlantPlacement } from "../domain/growing-types.ts";

export class PlantPlacementConflictError extends Error {
  constructor(batchId: string) {
    super(`Batch already has an active placement: ${batchId}`);
    this.name = "PlantPlacementConflictError";
  }
}

export interface GrowingSpaceRepository {
  createForUser(userId: string, space: GrowingSpace): Promise<GrowingSpace>;
  getByIdForUser(userId: string, spaceId: string): Promise<GrowingSpace | null>;
  listForUser(userId: string): Promise<GrowingSpace[]>;
}

export interface PlantPlacementRepository {
  placeBatchForUser(userId: string, placement: PlantPlacement): Promise<PlantPlacement | null>;
  listForUser(userId: string, options?: { includeRemoved?: boolean }): Promise<PlantPlacement[]>;
  listForSpaceForUser(userId: string, spaceId: string, options?: { includeRemoved?: boolean }): Promise<PlantPlacement[]>;
  getActivePlacementForBatchForUser(userId: string, batchId: string): Promise<PlantPlacement | null>;
  releaseForUser(userId: string, placementId: string, removedAt: string): Promise<PlantPlacement | null>;
}

export function spaceToRow(space: GrowingSpace) {
  return {
    id: space.id,
    userId: space.userId,
    name: space.name,
    type: space.type,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}

export function rowToSpace(row: GrowingSpaceRow, placements: PlantPlacement[] = []): GrowingSpace {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: assertGrowingSpaceType(row.type),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    placements,
  };
}

export function placementToRow(placement: PlantPlacement) {
  return {
    id: placement.id,
    userId: placement.userId,
    spaceId: placement.spaceId,
    batchId: placement.batchId,
    placedAt: placement.placedAt,
    removedAt: placement.removedAt ?? null,
  };
}

export function rowToPlacement(row: PlantPlacementRow): PlantPlacement {
  const placement: PlantPlacement = {
    id: row.id,
    userId: row.userId,
    spaceId: row.spaceId,
    batchId: row.batchId,
    placedAt: row.placedAt,
  };
  if (row.removedAt) placement.removedAt = row.removedAt;
  return placement;
}

export class DrizzleGrowingSpaceRepository implements GrowingSpaceRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async createForUser(userId: string, space: GrowingSpace) {
    const snapshot = { ...structuredClone(space), userId, placements: [] };
    await this.db.insert(growingSpaces).values(spaceToRow(snapshot));
    return snapshot;
  }

  async getByIdForUser(userId: string, spaceId: string) {
    const [space] = await this.db
      .select()
      .from(growingSpaces)
      .where(and(eq(growingSpaces.userId, userId), eq(growingSpaces.id, spaceId)))
      .limit(1);

    if (!space) return null;

    const placementRows = await this.db
      .select()
      .from(plantPlacements)
      .where(and(eq(plantPlacements.userId, userId), eq(plantPlacements.spaceId, spaceId), isNull(plantPlacements.removedAt)));

    return rowToSpace(space, placementRows.map(rowToPlacement));
  }

  async listForUser(userId: string) {
    const rows = await this.db.select().from(growingSpaces).where(eq(growingSpaces.userId, userId));
    const placementRows = await this.db
      .select()
      .from(plantPlacements)
      .where(and(eq(plantPlacements.userId, userId), isNull(plantPlacements.removedAt)));
    return rows.map((row) => rowToSpace(row, placementRows.filter((placement) => placement.spaceId === row.id).map(rowToPlacement)));
  }
}

export class DrizzlePlantPlacementRepository implements PlantPlacementRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async placeBatchForUser(userId: string, placement: PlantPlacement) {
    const [space] = await this.db
      .select({ id: growingSpaces.id, userId: growingSpaces.userId })
      .from(growingSpaces)
      .where(and(eq(growingSpaces.userId, userId), eq(growingSpaces.id, placement.spaceId)))
      .limit(1);
    const [batch] = await this.db
      .select({ id: growingBatches.id, userId: growingBatches.userId, status: growingBatches.status })
      .from(growingBatches)
      .where(and(eq(growingBatches.userId, userId), eq(growingBatches.id, placement.batchId)))
      .limit(1);

    if (!space || !batch) return null;
    if (batch.status !== "active") return null;

    const existing = await this.getActivePlacementForBatchForUser(userId, placement.batchId);
    if (existing) throw new PlantPlacementConflictError(placement.batchId);

    const snapshot = { ...structuredClone(placement), userId, spaceId: space.id, batchId: batch.id };
    await this.db.insert(plantPlacements).values(placementToRow(snapshot));
    return snapshot;
  }

  async listForUser(userId: string, options: { includeRemoved?: boolean } = {}) {
    const rows = await this.db.select().from(plantPlacements).where(eq(plantPlacements.userId, userId));
    return rows.map(rowToPlacement).filter((placement) => options.includeRemoved || !placement.removedAt);
  }

  async listForSpaceForUser(userId: string, spaceId: string, options: { includeRemoved?: boolean } = {}) {
    const [space] = await this.db
      .select({ id: growingSpaces.id })
      .from(growingSpaces)
      .where(and(eq(growingSpaces.userId, userId), eq(growingSpaces.id, spaceId)))
      .limit(1);
    if (!space) return [];

    const rows = await this.db
      .select()
      .from(plantPlacements)
      .where(and(eq(plantPlacements.userId, userId), eq(plantPlacements.spaceId, spaceId)));

    return rows.map(rowToPlacement).filter((placement) => options.includeRemoved || !placement.removedAt);
  }

  async getActivePlacementForBatchForUser(userId: string, batchId: string) {
    const [placement] = await this.db
      .select()
      .from(plantPlacements)
      .where(and(eq(plantPlacements.userId, userId), eq(plantPlacements.batchId, batchId), isNull(plantPlacements.removedAt)))
      .limit(1);

    return placement ? rowToPlacement(placement) : null;
  }

  async releaseForUser(userId: string, placementId: string, removedAt: string) {
    const [placement] = await this.db
      .select()
      .from(plantPlacements)
      .where(and(eq(plantPlacements.userId, userId), eq(plantPlacements.id, placementId), isNull(plantPlacements.removedAt)))
      .limit(1);

    if (!placement) return null;

    const released = { ...rowToPlacement(placement), removedAt };
    await this.db
      .update(plantPlacements)
      .set({ removedAt })
      .where(and(eq(plantPlacements.userId, userId), eq(plantPlacements.id, placementId), isNull(plantPlacements.removedAt)));
    return released;
  }
}
