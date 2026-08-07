import { completeBatchById } from "./growing-plan.ts";
import type { GrowingBatch } from "./growing-types.ts";

export function activeBatchesForPlant(batches: GrowingBatch[], plantId: string) {
  return batches.filter((batch) => batch.plantId === plantId && batch.status === "active");
}

export function completionRequiredForPlant(batches: GrowingBatch[], plantId: string) {
  return activeBatchesForPlant(batches, plantId).length > 0;
}

export function completeSpecificBatch(batches: GrowingBatch[], batchId: string, completedAt: string) {
  return completeBatchById(batches, batchId, completedAt);
}
