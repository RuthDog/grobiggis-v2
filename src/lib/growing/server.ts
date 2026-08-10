import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { DrizzleGrowingBatchRepository } from "@/repositories/growing-batch-repository";
import {
  completeGrowingBatchForUser,
  completePlanActivityForUser,
  createGrowingBatchForUser,
  getGrowingBatchForUser,
  listGrowingBatchesForUser,
} from "./service";

export async function getGrowingRepositoryForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for growing persistence.");
  return new DrizzleGrowingBatchRepository(createDb(env.DB));
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
