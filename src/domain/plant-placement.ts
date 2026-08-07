import type { GrowingSpace, PlantPlacement } from "./growing-types.ts";

export function addPlantPlacement(space: GrowingSpace, placement: PlantPlacement): GrowingSpace {
  const plantIds = space.plantIds.includes(placement.plantId) ? space.plantIds : [...space.plantIds, placement.plantId];

  return {
    ...space,
    plantIds,
    placements: [...space.placements, placement],
  };
}

export function removePlantPlacement(space: GrowingSpace, placementId: string): GrowingSpace {
  if (!space.placements.some((placement) => placement.id === placementId)) return space;

  const placements = space.placements.filter((placement) => placement.id !== placementId);
  return {
    ...space,
    placements,
    plantIds: [...new Set(placements.map((placement) => placement.plantId))],
  };
}

export function placementsForBatch(spaces: GrowingSpace[], batchId: string) {
  return spaces.flatMap((space) => space.placements.filter((placement) => placement.batchId === batchId));
}
