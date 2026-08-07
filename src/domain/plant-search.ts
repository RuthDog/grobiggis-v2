import type { CatalogPlant } from "@/data/plant-types";
import { normalizeSearchText } from "./text-search.ts";

export const normalizePlantSearch = normalizeSearchText;

export function searchableCatalogPlants(plants: CatalogPlant[], query: string) {
  const needle = normalizePlantSearch(query);

  return plants
    .filter((plant) => {
      if (!needle) return true;
      return normalizePlantSearch(`${plant.name} ${plant.category}`).includes(needle);
    })
    .toSorted((left, right) => left.name.localeCompare(right.name, "sv-SE"));
}

export function catalogPlantForVisual(plants: CatalogPlant[], plantId?: string) {
  if (!plantId) return undefined;
  return plants.find((plant) => plant.id === plantId);
}
