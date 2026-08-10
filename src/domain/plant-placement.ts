import type { GrowingSpace, PlantPlacement } from "./growing-types.ts";

export function activePlantPlacements(placements: PlantPlacement[]) {
  return placements.filter((placement) => !placement.removedAt);
}

export function addPlantPlacement(space: GrowingSpace, placement: PlantPlacement): GrowingSpace {
  if (activePlantPlacements(space.placements).some((item) => item.batchId === placement.batchId)) {
    throw new Error(`Batch already has an active placement: ${placement.batchId}`);
  }

  return {
    ...space,
    placements: [...space.placements, placement],
  };
}

export function releasePlantPlacement(space: GrowingSpace, placementId: string, removedAt: string): GrowingSpace {
  if (!activePlantPlacements(space.placements).some((placement) => placement.id === placementId)) return space;

  return {
    ...space,
    placements: space.placements.map((placement) => (placement.id === placementId ? { ...placement, removedAt } : placement)),
  };
}

export function removePlantPlacement(space: GrowingSpace, placementId: string, removedAt: string) {
  return releasePlantPlacement(space, placementId, removedAt);
}

export function placementsForBatch(spaces: GrowingSpace[], batchId: string, options: { activeOnly?: boolean } = {}) {
  const placements = spaces.flatMap((space) => space.placements.filter((placement) => placement.batchId === batchId));
  return options.activeOnly ? activePlantPlacements(placements) : placements;
}
