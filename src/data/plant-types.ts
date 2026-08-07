export type SunExposure = "soligt" | "halvskugga" | "skuggigt";
export type SpaceType =
  | "balkong"
  | "uteplats"
  | "pallkrage"
  | "friland"
  | "växthus"
  | "inomhus"
  | "kolonilott";
export type PlantCategory = "Grönsaker" | "Örter" | "Bär" | "Rotfrukter" | "Blommor";
export type PlantDifficulty = "Lätt" | "Medel" | "Utmanande";
export type WaterNeed = "Låg" | "Medel" | "Hög";

export interface PlantTiming {
  preSow?: [number, number];
  directSow?: [number, number];
  transplant?: [number, number];
  harvest: [number, number];
}

export interface CatalogPlant {
  id: string;
  name: string;
  emoji?: string;
  category: PlantCategory;
  difficulty: PlantDifficulty;
  sun: SunExposure[];
  water: WaterNeed;
  preGrow: boolean;
  harvestLabel: string;
  places: SpaceType[];
  description: string;
  timing: PlantTiming;
}
