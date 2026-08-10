import type { GrowingSpace, GrowingSpaceType, PlantPlacement } from "./growing-types.ts";

export const growingSpaceTypes = ["raised_bed", "greenhouse", "open_ground", "pot"] as const satisfies readonly GrowingSpaceType[];

export const growingSpaceTypeLabels: Record<GrowingSpaceType, string> = {
  raised_bed: "Pallkrage",
  greenhouse: "Vaxthus",
  open_ground: "Friland",
  pot: "Kruka",
};

export class GrowingSpaceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrowingSpaceInputError";
  }
}

export type CreateGrowingSpaceInput = {
  name: string;
  type: GrowingSpaceType;
};

export function assertGrowingSpaceType(value: string): GrowingSpaceType {
  if (!growingSpaceTypes.includes(value as GrowingSpaceType)) throw new Error(`Invalid growing space type: ${value}`);
  return value as GrowingSpaceType;
}

export function validateGrowingSpaceName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new GrowingSpaceInputError("Odlingsytan behover ett namn.");
  if (name.length > 80) throw new GrowingSpaceInputError("Odlingsytans namn ar for langt.");
  return name;
}

export function validateCreateGrowingSpaceInput(input: unknown): CreateGrowingSpaceInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new GrowingSpaceInputError("Odlingsytan kunde inte sparas.");
  }

  const record = input as Record<string, unknown>;
  for (const field of ["id", "userId", "createdAt", "updatedAt", "placements"]) {
    if (field in record) throw new GrowingSpaceInputError("Odlingsytan kunde inte sparas.");
  }

  const type = typeof record.type === "string" ? record.type : "";
  if (!growingSpaceTypes.includes(type as GrowingSpaceType)) throw new GrowingSpaceInputError("Odlingsytans typ kunde inte sparas.");

  return {
    name: validateGrowingSpaceName(record.name),
    type: type as GrowingSpaceType,
  };
}

export function createGrowingSpace(
  userId: string,
  input: CreateGrowingSpaceInput,
  idFactory: () => string = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): GrowingSpace {
  return {
    id: idFactory(),
    userId,
    name: input.name,
    type: input.type,
    createdAt: now,
    updatedAt: now,
    placements: [],
  };
}

export function createPlantPlacement(
  userId: string,
  spaceId: string,
  batchId: string,
  idFactory: () => string = () => crypto.randomUUID(),
  placedAt = new Date().toISOString(),
): PlantPlacement {
  return {
    id: idFactory(),
    userId,
    spaceId,
    batchId,
    placedAt,
  };
}
