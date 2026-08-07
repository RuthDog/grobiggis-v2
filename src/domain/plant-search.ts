import type { CatalogPlant } from "@/data/plant-types";

export const normalizePlantSearch = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

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
