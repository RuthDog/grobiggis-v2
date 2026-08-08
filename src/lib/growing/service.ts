import { completeGrowingBatch, createGrowingBatch } from "../../domain/growing-plan.ts";
import type { GrowingBatch } from "../../domain/growing-types.ts";
import type { GrowingBatchRepository } from "../../repositories/growing-batch-repository.ts";
import { validateBatchId, validateCreateGrowingBatchInput } from "./validation.ts";

export type VerifiedGrowingUser = {
  id: string;
};

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

export function splitBatchesByStatus(batches: GrowingBatch[]) {
  return {
    activeBatches: batches.filter((batch) => batch.status === "active"),
    completedBatches: batches.filter((batch) => batch.status === "completed"),
  };
}

export async function createGrowingBatchForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  input: unknown,
  idFactory?: () => string,
) {
  const userId = requireVerifiedUserId(user);
  const sanitized = validateCreateGrowingBatchInput(input);
  const batch = createGrowingBatch(sanitized, idFactory);
  return repository.createForUser(userId, batch);
}

export async function listGrowingBatchesForUser(repository: GrowingBatchRepository, user: VerifiedGrowingUser) {
  const batches = await repository.listForUser(requireVerifiedUserId(user));
  return batches.toSorted((left, right) => {
    if (left.status !== right.status) return left.status === "active" ? -1 : 1;
    return (left.startDate ?? "").localeCompare(right.startDate ?? "") || left.id.localeCompare(right.id);
  });
}

export async function getGrowingBatchForUser(repository: GrowingBatchRepository, user: VerifiedGrowingUser, batchId: unknown) {
  return repository.getByIdForUser(requireVerifiedUserId(user), validateBatchId(batchId));
}

export async function completeGrowingBatchForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  batchId: unknown,
  completedAt = new Date().toISOString().slice(0, 10),
) {
  const userId = requireVerifiedUserId(user);
  const existing = await repository.getByIdForUser(userId, validateBatchId(batchId));
  if (!existing) return null;
  return repository.saveForUser(userId, completeGrowingBatch(existing, completedAt));
}
