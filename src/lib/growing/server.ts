import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { DrizzleGrowingBatchRepository } from "@/repositories/growing-batch-repository";
import { DrizzleGrowingSpaceRepository, DrizzlePlantPlacementRepository } from "@/repositories/growing-space-repository";
import {
  completeGrowingBatchForUser,
  completePlanActivityForUser,
  createGrowingBatchForUser,
  getGrowingBatchForUser,
  listGrowingBatchesForUser,
} from "./service";
import {
  createGrowingSpaceForUser,
  listGrowingSpacesForUser,
  placeBatchInSpaceForUser,
  releasePlantPlacementForUser,
} from "./spaces";

async function getGrowingDbForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for growing persistence.");
  return createDb(env.DB);
}

export async function getGrowingRepositoryForRequest() {
  return new DrizzleGrowingBatchRepository(await getGrowingDbForRequest());
}

export async function getGrowingSpaceRepositoryForRequest() {
  return new DrizzleGrowingSpaceRepository(await getGrowingDbForRequest());
}

export async function getPlantPlacementRepositoryForRequest() {
  return new DrizzlePlantPlacementRepository(await getGrowingDbForRequest());
}

export async function getCurrentUserGrowingBatches() {
  const user = await getCurrentUser();
  if (!user) return null;
  return listGrowingBatchesForUser(await getGrowingRepositoryForRequest(), user);
}

export async function getCurrentUserGrowingBatch(batchId: string) {
  const user = await requireUser();
  return getGrowingBatchForUser(await getGrowingRepositoryForRequest(), user, batchId);
}

export async function createCurrentUserGrowingBatch(input: unknown) {
  const user = await requireUser();
  return createGrowingBatchForUser(await getGrowingRepositoryForRequest(), user, input);
}

export async function completeCurrentUserGrowingBatch(batchId: string) {
  const user = await requireUser();
  return completeGrowingBatchForUser(await getGrowingRepositoryForRequest(), user, batchId);
}

export async function completeCurrentUserPlanActivity(input: unknown) {
  const user = await requireUser();
  return completePlanActivityForUser(await getGrowingRepositoryForRequest(), user, input);
}

export async function getCurrentUserGrowingSpaces() {
  const user = await getCurrentUser();
  if (!user) return null;
  return listGrowingSpacesForUser(await getGrowingSpaceRepositoryForRequest(), user);
}

export async function createCurrentUserGrowingSpace(input: unknown) {
  const user = await requireUser();
  return createGrowingSpaceForUser(await getGrowingSpaceRepositoryForRequest(), user, input);
}

export async function placeCurrentUserBatchInSpace(input: unknown) {
  const user = await requireUser();
  return placeBatchInSpaceForUser(await getPlantPlacementRepositoryForRequest(), user, input);
}

export async function releaseCurrentUserPlantPlacement(placementId: unknown) {
  const user = await requireUser();
  return releasePlantPlacementForUser(await getPlantPlacementRepositoryForRequest(), user, placementId);
}
