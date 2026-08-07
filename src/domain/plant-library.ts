import type { CatalogPlant } from "@/data/plant-types";
import { planBatch } from "./growing-plan.ts";
import type { GrowingBatch, GrowingSpace } from "./growing-types.ts";

export function activeLibraryBatches(batches: GrowingBatch[]) {
  return batches.filter((batch) => batch.status === "active");
}

export function completedLibraryBatches(batches: GrowingBatch[]) {
  return batches.filter((batch) => batch.status === "completed");
}

export function selectedPlantIdsWithoutBatches(plantIds: string[], batches: GrowingBatch[]) {
  const batchPlantIds = new Set(batches.map((batch) => batch.plantId));
  return plantIds.filter((plantId) => !batchPlantIds.has(plantId));
}

export function libraryBatchCard(batch: GrowingBatch, plants: CatalogPlant[], spaces: GrowingSpace[]) {
  const plant = plants.find((item) => item.id === batch.plantId);
  const next = batch.status === "active" ? planBatch(batch, plants).events.find((event) => event.status === "planned") : undefined;

  return {
    batchId: batch.id,
    plantId: batch.plantId,
    plantName: plant?.name ?? "Okänd växt",
    variety: batch.variety ?? "Okänd sort",
    status: batch.status,
    spaceName: spaces.find((space) => space.placements.some((placement) => placement.batchId === batch.id))?.name,
    nextStep: next?.title,
    completedAt: batch.completedAt,
  };
}

export function libraryCatalogCard(plant: CatalogPlant) {
  return {
    plantId: plant.id,
    name: plant.name,
    category: plant.category,
    difficulty: plant.difficulty,
    description: plant.description,
  };
}
