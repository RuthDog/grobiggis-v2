import { plants } from "../../data/plants.ts";
import type { GrowingStartType } from "../../domain/growing-types.ts";

const startTypes = ["seed", "direct", "purchased", "divided", "established"] as const;
const serverOwnedFields = ["id", "userId", "status", "completedAt", "createdAt", "updatedAt", "actualEvents"] as const;

export type CreateGrowingBatchInput = {
  plantId: string;
  variety?: string;
  startType: GrowingStartType;
  startDate: string;
};

export class GrowingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrowingInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCreateGrowingBatchInput(input: unknown): CreateGrowingBatchInput {
  if (!isRecord(input)) throw new GrowingInputError("Odlingsomgången kunde inte sparas.");

  for (const field of serverOwnedFields) {
    if (field in input) throw new GrowingInputError("Odlingsomgången kunde inte sparas.");
  }

  const plantId = typeof input.plantId === "string" ? input.plantId.trim() : "";
  if (!plants.some((plant) => plant.id === plantId)) throw new GrowingInputError("Växten kunde inte hittas.");

  const startType = typeof input.startType === "string" ? input.startType : "";
  if (!startTypes.includes(startType as GrowingStartType)) throw new GrowingInputError("Odlingsomgången kunde inte sparas.");

  const startDate = typeof input.startDate === "string" ? input.startDate.trim() : "";
  if (!validIsoDate(startDate)) throw new GrowingInputError("Odlingsomgången kunde inte sparas.");

  const variety = typeof input.variety === "string" ? input.variety.trim() : undefined;
  if (variety && variety.length > 80) throw new GrowingInputError("Odlingsomgången kunde inte sparas.");

  return {
    plantId,
    variety: variety || undefined,
    startType: startType as GrowingStartType,
    startDate,
  };
}

export function validateBatchId(batchId: unknown) {
  if (typeof batchId !== "string" || !batchId.trim() || batchId.length > 160) {
    throw new GrowingInputError("Odlingsomgången kunde inte hittas.");
  }
  return batchId;
}
