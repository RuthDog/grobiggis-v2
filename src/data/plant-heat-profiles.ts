export type PlantHeatSensitivity = "cool_season" | "flowering_heat" | "pollination_heat" | "high_heat";

export type PlantHeatSourceId = "umn-excessive-heat" | "umn-heat-gardens" | "usu-leafy-greens" | "rhs-basil";

export interface PlantHeatSource {
  id: PlantHeatSourceId;
  label: string;
  url: string;
  note: string;
}

export interface PlantHeatProfile {
  plantId: string;
  sensitivity: PlantHeatSensitivity;
  cautionTemperatureC: number;
  highStressTemperatureC: number;
  guidance: string;
  highGuidance: string;
  sourceIds: PlantHeatSourceId[];
}

export const plantHeatSources: Record<PlantHeatSourceId, PlantHeatSource> = {
  "umn-excessive-heat": {
    id: "umn-excessive-heat",
    label: "University of Minnesota Extension: How excessive heat affects the vegetable garden",
    url: "https://extension.umn.edu/planting-and-growing-guides/how-excessive-heat-affects-vegetable-garden",
    note: "Hot weather can affect tomato and pepper flowers, cucurbit flowering balance, bee activity and bean pollen or pod set.",
  },
  "umn-heat-gardens": {
    id: "umn-heat-gardens",
    label: "University of Minnesota Extension: Keep gardens thriving through the heat",
    url: "https://extension.umn.edu/yard-and-garden-news/keep-gardens-thriving-through-heat",
    note: "Heat stress can cause wilting, leaf curl, scorching, blossom drop and stalled growth; vegetables may need shade or other gentle protection.",
  },
  "usu-leafy-greens": {
    id: "usu-leafy-greens",
    label: "Utah State University Extension: Leafy greens physiological problems",
    url: "https://extension.usu.edu/vegetableguide/leafy-greens/physiological-problems",
    note: "Leafy greens such as lettuce are cool-weather crops and can bolt or develop disorders during hot weather.",
  },
  "rhs-basil": {
    id: "rhs-basil",
    label: "RHS: How to grow basil",
    url: "https://www.rhs.org.uk/herbs/basil/grow-your-own",
    note: "Basil likes warmth and sun; this supports excluding it from heat-alert profiles without a clearer high-temperature threshold.",
  },
};

const heatProfile = (
  plantId: string,
  sensitivity: PlantHeatSensitivity,
  cautionTemperatureC: number,
  highStressTemperatureC: number,
  guidance: string,
  highGuidance: string,
  sourceIds: PlantHeatSourceId[],
): PlantHeatProfile => ({
  plantId,
  sensitivity,
  cautionTemperatureC,
  highStressTemperatureC,
  guidance,
  highGuidance,
  sourceIds,
});

export const plantHeatProfiles = [
  heatProfile(
    "sallat",
    "cool_season",
    27,
    30,
    "Skugga eller skörda i tid om värmen håller i sig.",
    "Sallat kan snabbt påverkas av värme. Skugga plantan och skörda hellre tidigt än sent.",
    ["usu-leafy-greens", "umn-heat-gardens"],
  ),
  heatProfile(
    "tomat",
    "flowering_heat",
    30,
    32,
    "Håll extra koll på blomning och fruktsättning under varma dagar.",
    "Mycket varma dagar kan störa blomning och fruktsättning. Skugga försiktigt vid behov.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "korsbarstomat",
    "flowering_heat",
    30,
    32,
    "Håll extra koll på blomning och fruktsättning under varma dagar.",
    "Mycket varma dagar kan störa blomning och fruktsättning. Skugga försiktigt vid behov.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "chili",
    "flowering_heat",
    32,
    35,
    "Värmen är oftast gynnsam, men följ blomning och fruktsättning vid riktigt varma dagar.",
    "Mycket varma dagar kan ge blomfall. Kontrollera plantan utan att överreagera.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "paprika",
    "flowering_heat",
    32,
    35,
    "Värmen är oftast gynnsam, men följ blomning och fruktsättning vid riktigt varma dagar.",
    "Mycket varma dagar kan ge blomfall. Kontrollera plantan utan att överreagera.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "gurka",
    "pollination_heat",
    32,
    35,
    "Följ pollinering och små frukter när dagarna blir mycket varma.",
    "Mycket varma dagar kan störa pollinering. Kontrollera plantan och ge lätt skugga vid behov.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "zucchini",
    "pollination_heat",
    32,
    35,
    "Följ blomning och små frukter när dagarna blir mycket varma.",
    "Mycket varma dagar kan störa blomning och pollinering. Kontrollera plantan lugnt.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "pumpa",
    "pollination_heat",
    32,
    35,
    "Följ blomning och små frukter när dagarna blir mycket varma.",
    "Mycket varma dagar kan störa blomning och pollinering. Kontrollera plantan lugnt.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
  heatProfile(
    "buskbona",
    "high_heat",
    35,
    37,
    "Kontrollera blomning och små baljor om prognosen blir riktigt varm.",
    "Extrem värme kan påverka blomning och baljsättning. Håll extra koll utan att göra det till en vattenorder.",
    ["umn-excessive-heat", "umn-heat-gardens"],
  ),
] satisfies PlantHeatProfile[];
