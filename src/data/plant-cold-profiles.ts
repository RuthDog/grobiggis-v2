export type PlantColdSensitivity = "heat_loving_tender";

export type PlantColdSourceId = "smhi-frost" | "rhs-tender-plants" | "csu-tomatoes";

export interface PlantColdSource {
  id: PlantColdSourceId;
  label: string;
  url: string;
  note: string;
}

export interface PlantColdProfile {
  plantId: string;
  sensitivity: PlantColdSensitivity;
  cautionTemperatureC: number;
  nearFrostTemperatureC: number;
  frostTemperatureC: number;
  sourceIds: PlantColdSourceId[];
  note: string;
}

export const plantColdSources: Record<PlantColdSourceId, PlantColdSource> = {
  "smhi-frost": {
    id: "smhi-frost",
    label: "SMHI: Frost och markfrost",
    url: "https://www.smhi.se/kunskapsbanken/meteorologi/sno--och-isfenomen/frost-och-markfrost",
    note: "Frost uppstar nar temperaturen gar under 0 C; mark och vegetation kan bli kallare an 2m-lufttemperatur.",
  },
  "rhs-tender-plants": {
    id: "rhs-tender-plants",
    label: "RHS: When to plant out tender plants",
    url: "https://www.rhs.org.uk/garden-jobs/when-to-plant-out-tender-plants-avoiding-late-frosts",
    note: "Omtaliga och varmealskande koksvaxter kan skadas av frost, markfrost och kalla natter; tomat, paprika, basilika och cucurbits gynnas av natter over 10 C.",
  },
  "csu-tomatoes": {
    id: "csu-tomatoes",
    label: "Colorado State University Extension: Growing Tomatoes",
    url: "https://extension.colostate.edu/resource/growing-tomatoes/",
    note: "Tomat plantor dodas latt av frost och bor ha varma natt- och dagtemperaturer vid utplantering.",
  },
};

export const HEAT_LOVING_COLD_NIGHT_C = 10;
export const GROUND_FROST_RISK_C = 4;
export const AIR_FROST_C = 0;

const heatLovingTender = (
  plantId: string,
  note: string,
  sourceIds: PlantColdSourceId[] = ["smhi-frost", "rhs-tender-plants"],
): PlantColdProfile => ({
  plantId,
  sensitivity: "heat_loving_tender",
  cautionTemperatureC: HEAT_LOVING_COLD_NIGHT_C,
  nearFrostTemperatureC: GROUND_FROST_RISK_C,
  frostTemperatureC: AIR_FROST_C,
  sourceIds,
  note,
});

export const plantColdProfiles = [
  heatLovingTender("tomat", "Tomat ar frostkanslig och varmealskande; kalla natter kan bromsa plantan.", ["smhi-frost", "rhs-tender-plants", "csu-tomatoes"]),
  heatLovingTender("korsbarstomat", "Korsbarstomat hanteras som tomat i forsta frostmodellen.", ["smhi-frost", "rhs-tender-plants", "csu-tomatoes"]),
  heatLovingTender("chili", "Chili hanteras tillsammans med paprika som varmealskande och frostkanslig."),
  heatLovingTender("paprika", "Paprika ar varmealskande och bor inte behandlas som frosttolerant."),
  heatLovingTender("gurka", "Gurka ar en cucurbit och varmealskande koksvaxter i den gruppen bor skyddas fran kalla natter."),
  heatLovingTender("zucchini", "Zucchini hanteras som cucurbit i forsta frostmodellen."),
  heatLovingTender("pumpa", "Pumpa hanteras som cucurbit i forsta frostmodellen."),
  heatLovingTender("buskbona", "Buskbona hanteras som omtalig sommarplanta dar frost och markfrost ar relevanta risker."),
  heatLovingTender("basilika", "Basilika ar en varmealskande ort som ar relevant vid frost och kalla natter."),
] satisfies PlantColdProfile[];
