import {
  createGrowingSpace,
  createPlantPlacement,
  validateCreateGrowingSpaceInput,
} from "../../domain/growing-spaces.ts";
import type { GrowingSpaceRepository, PlantPlacementRepository } from "../../repositories/growing-space-repository.ts";
import type { VerifiedGrowingUser } from "./service.ts";
import { validateBatchId } from "./validation.ts";

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateScopedId(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 160) throw new Error(message);
  return value;
}

export function validatePlaceBatchInput(input: unknown) {
  if (!isRecord(input)) throw new Error("Placeringen kunde inte sparas.");
  for (const field of ["id", "userId", "placedAt", "removedAt"]) {
    if (field in input) throw new Error("Placeringen kunde inte sparas.");
  }

  return {
    spaceId: validateScopedId(input.spaceId, "Odlingsytan kunde inte hittas."),
    batchId: validateBatchId(input.batchId),
  };
}

export async function createGrowingSpaceForUser(
  repository: GrowingSpaceRepository,
  user: VerifiedGrowingUser,
  input: unknown,
  idFactory?: () => string,
  now?: string,
) {
  const userId = requireVerifiedUserId(user);
  const space = createGrowingSpace(userId, validateCreateGrowingSpaceInput(input), idFactory, now);
  return repository.createForUser(userId, space);
}

export async function listGrowingSpacesForUser(repository: GrowingSpaceRepository, user: VerifiedGrowingUser) {
  return repository.listForUser(requireVerifiedUserId(user));
}

export async function getGrowingSpaceForUser(repository: GrowingSpaceRepository, user: VerifiedGrowingUser, spaceId: unknown) {
  return repository.getByIdForUser(requireVerifiedUserId(user), validateScopedId(spaceId, "Odlingsytan kunde inte hittas."));
}

export async function placeBatchInSpaceForUser(
  repository: PlantPlacementRepository,
  user: VerifiedGrowingUser,
  input: unknown,
  idFactory?: () => string,
  placedAt?: string,
) {
  const userId = requireVerifiedUserId(user);
  const sanitized = validatePlaceBatchInput(input);
  const placement = createPlantPlacement(userId, sanitized.spaceId, sanitized.batchId, idFactory, placedAt);
  return repository.placeBatchForUser(userId, placement);
}

export async function listPlantPlacementsForUser(
  repository: PlantPlacementRepository,
  user: VerifiedGrowingUser,
  options?: { includeRemoved?: boolean },
) {
  return repository.listForUser(requireVerifiedUserId(user), options);
}

export async function releasePlantPlacementForUser(
  repository: PlantPlacementRepository,
  user: VerifiedGrowingUser,
  placementId: unknown,
  removedAt = new Date().toISOString(),
) {
  return repository.releaseForUser(requireVerifiedUserId(user), validateScopedId(placementId, "Placeringen kunde inte hittas."), removedAt);
}
