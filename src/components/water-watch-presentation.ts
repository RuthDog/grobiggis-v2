import type { WaterAffectedBatch, WaterAssessment } from "@/domain/water-watch";

export interface WaterPresentationPlant {
  plantId: string;
  plantName: string;
  variety?: string;
  reason: string;
}

function presentationKey(plant: WaterAffectedBatch) {
  return [plant.plantId, plant.variety ?? "", plant.reason].join("::");
}

export function uniquePlantNamesForSummary(assessment: WaterAssessment) {
  return [...new Set(assessment.affectedPlants.map((plant) => plant.plantName))];
}

export function dedupeAffectedPlantsForPresentation(assessment: WaterAssessment): WaterPresentationPlant[] {
  const deduped = new Map<string, WaterPresentationPlant>();
  for (const plant of assessment.affectedPlants) {
    const key = presentationKey(plant);
    if (deduped.has(key)) continue;
    deduped.set(key, {
      plantId: plant.plantId,
      plantName: plant.plantName,
      variety: plant.variety,
      reason: plant.reason,
    });
  }
  return [...deduped.values()];
}
