export type PlantWaterSensitivity = "moderate" | "high";

export type PlantWaterSourceId = "rhs-watering-vegetables" | "rhs-containers" | "usu-vegetable-water" | "iowa-tomatoes" | "umn-cucumbers";

export interface PlantWaterSource {
  id: PlantWaterSourceId;
  label: string;
  url: string;
  note: string;
}

export interface PlantWaterProfile {
  plantId: string;
  sensitivity: PlantWaterSensitivity;
  steadyMoisture: boolean;
  containerAttention: boolean;
  sourceIds: PlantWaterSourceId[];
  note: string;
}

export const plantWaterSources: Record<PlantWaterSourceId, PlantWaterSource> = {
  "rhs-watering-vegetables": {
    id: "rhs-watering-vegetables",
    label: "RHS: Watering vegetables",
    url: "https://www.rhs.org.uk/advice/beginners-guide/vegetable-basics/soil-preparation/watering-vegetables",
    note: "Vegetables need water at the roots for healthy growth; containers depend strongly on user watering.",
  },
  "rhs-containers": {
    id: "rhs-containers",
    label: "RHS: Vegetables in containers",
    url: "https://www.rhs.org.uk/vegetables/containers",
    note: "Drying out is a common container problem; regular water supply is needed while avoiding waterlogging.",
  },
  "usu-vegetable-water": {
    id: "usu-vegetable-water",
    label: "Utah State University Extension: Water recommendations for vegetables",
    url: "https://extension.usu.edu/yardandgarden/research/water-recommendations-for-vegetables",
    note: "Water needs vary by crop, growth stage, temperature and soil type; cucurbits, basil, leafy greens and legumes have documented irrigation sensitivity.",
  },
  "iowa-tomatoes": {
    id: "iowa-tomatoes",
    label: "Iowa State University Extension: Growing tomatoes in the home garden",
    url: "https://yardandgarden.extension.iastate.edu/how-to/growing-tomatoes-home-garden",
    note: "Tomatoes benefit from consistent watering, especially during fruit development.",
  },
  "umn-cucumbers": {
    id: "umn-cucumbers",
    label: "University of Minnesota Extension: Growing cucumbers",
    url: "https://extension.umn.edu/vegetables/growing-cucumbers",
    note: "Cucumbers and vine crops should be checked for soil moisture and have high water demand during active growth.",
  },
};

const waterProfile = (
  plantId: string,
  sensitivity: PlantWaterSensitivity,
  note: string,
  sourceIds: PlantWaterSourceId[],
  options: { steadyMoisture?: boolean; containerAttention?: boolean } = {},
): PlantWaterProfile => ({
  plantId,
  sensitivity,
  steadyMoisture: options.steadyMoisture ?? true,
  containerAttention: options.containerAttention ?? true,
  sourceIds,
  note,
});

export const plantWaterProfiles = [
  waterProfile("tomat", "high", "Kontrollera jorden regelbundet under torra och varma perioder.", ["rhs-watering-vegetables", "iowa-tomatoes"]),
  waterProfile("korsbarstomat", "high", "Kontrollera jorden regelbundet under torra och varma perioder.", ["rhs-watering-vegetables", "iowa-tomatoes"]),
  waterProfile("gurka", "high", "Håll koll på jorden ofta under torra och varma perioder.", ["rhs-watering-vegetables", "usu-vegetable-water", "umn-cucumbers"]),
  waterProfile("zucchini", "high", "Kontrollera jorden regelbundet när vädret är torrt och varmt.", ["rhs-watering-vegetables", "usu-vegetable-water"]),
  waterProfile("pumpa", "high", "Kontrollera jorden regelbundet när vädret är torrt och varmt.", ["rhs-watering-vegetables", "usu-vegetable-water"]),
  waterProfile("chili", "moderate", "Kontrollera jorden regelbundet under varma och torra perioder.", ["rhs-watering-vegetables", "rhs-containers", "usu-vegetable-water"]),
  waterProfile("paprika", "moderate", "Kontrollera jorden regelbundet under varma och torra perioder.", ["rhs-watering-vegetables", "rhs-containers", "usu-vegetable-water"]),
  waterProfile("basilika", "high", "Håll jorden jämnt fuktig, särskilt vid odling i kruka.", ["rhs-watering-vegetables", "rhs-containers", "usu-vegetable-water"]),
  waterProfile("sallat", "high", "Kontrollera jorden tidigt under torra perioder.", ["rhs-watering-vegetables", "rhs-containers", "usu-vegetable-water"]),
  waterProfile("buskbona", "moderate", "Kontrollera jorden extra under blomning och skörd, särskilt i torrt väder.", ["rhs-watering-vegetables", "rhs-containers", "usu-vegetable-water"]),
] satisfies PlantWaterProfile[];
