import type { FrostAssessment, FrostAssessmentLevel } from "./frost-watch.ts";
import type { HeatAssessment, HeatAssessmentLevel } from "./heat-watch.ts";
import type { WaterAssessment, WaterAssessmentLevel } from "./water-watch.ts";

export type SignalType = "frost" | "watering" | "heat";
export type SignalLevel = "info" | "attention" | "important";

export interface SignalAffectedBatch {
  batchId: string;
  plantId: string;
  label: string;
}

export interface SignalAction {
  href: string;
  label: string;
}

export interface GrobiggisSignal {
  id: string;
  type: SignalType;
  level: SignalLevel;
  title: string;
  message: string;
  affectedBatches: SignalAffectedBatch[];
  validFrom: string | null;
  validTo: string | null;
  action?: SignalAction;
}

export interface WeatherSignalAssessments {
  frostAssessment: FrostAssessment;
  waterAssessment: WaterAssessment;
  heatAssessment: HeatAssessment;
}

type AffectedPlant = {
  batchId: string;
  plantId: string;
  plantName: string;
  variety?: string;
};

const weatherAction: SignalAction = { href: "/vader", label: "Se väderdetaljer" };
const levelOrder: Record<SignalLevel, number> = { important: 0, attention: 1, info: 2 };
const typeOrder: Record<SignalType, number> = { frost: 0, watering: 1, heat: 2 };
const listFormatter = new Intl.ListFormat("sv-SE", { style: "long", type: "conjunction" });

function affectedBatches(plants: AffectedPlant[]): SignalAffectedBatch[] {
  return plants.map((plant) => ({
    batchId: plant.batchId,
    plantId: plant.plantId,
    label: plant.variety ? `${plant.plantName} · ${plant.variety}` : plant.plantName,
  }));
}

function uniquePlantNames(batches: SignalAffectedBatch[]) {
  return [...new Set(batches.map((batch) => batch.label))];
}

function affectedList(batches: SignalAffectedBatch[]) {
  return listFormatter.format(uniquePlantNames(batches));
}

function signalOrNull(signal: GrobiggisSignal): GrobiggisSignal | null {
  return signal.affectedBatches.length ? signal : null;
}

export function signalLevelFromFrostLevel(level: FrostAssessmentLevel): SignalLevel | null {
  if (level === "frost") return "important";
  if (level === "near_frost") return "attention";
  if (level === "cold_night") return "info";
  return null;
}

export function signalLevelFromWaterLevel(level: WaterAssessmentLevel): SignalLevel | null {
  if (level === "high_attention") return "important";
  if (level === "attention" || level === "rain_soon") return "attention";
  if (level === "watch") return "info";
  return null;
}

export function signalLevelFromHeatLevel(level: HeatAssessmentLevel): SignalLevel | null {
  if (level === "high_attention") return "important";
  if (level === "attention") return "attention";
  if (level === "watch") return "info";
  return null;
}

export function signalFromFrostAssessment(assessment: FrostAssessment): GrobiggisSignal | null {
  if (assessment.level === "none" || assessment.level === "unavailable") return null;
  const level = signalLevelFromFrostLevel(assessment.level);
  if (!level) return null;

  const affected = affectedBatches(assessment.affectedPlants);
  const names = affectedList(affected);
  const titleByLevel: Record<Exclude<FrostAssessmentLevel, "none" | "unavailable">, string> = {
    frost: "Frost väntas i natt",
    near_frost: "Risk för frost i natt",
    cold_night: "Kall natt väntas",
  };

  return signalOrNull({
    id: `weather:frost:${assessment.window.start}:${assessment.window.end}`,
    type: "frost",
    level,
    title: titleByLevel[assessment.level],
    message: `${names} kan behöva skyddas om de står ute eller oskyddat.`,
    affectedBatches: affected,
    validFrom: assessment.window.start,
    validTo: assessment.window.end,
    action: weatherAction,
  });
}

export function signalFromWaterAssessment(assessment: WaterAssessment): GrobiggisSignal | null {
  if (assessment.level === "none" || assessment.level === "unavailable") return null;
  const level = signalLevelFromWaterLevel(assessment.level);
  if (!level) return null;

  const affected = affectedBatches(assessment.affectedPlants);
  const names = affectedList(affected);
  const titleByLevel: Record<Exclude<WaterAssessmentLevel, "none" | "unavailable">, string> = {
    high_attention: "Kontrollera jorden idag",
    attention: "Kontrollera jorden idag",
    rain_soon: "Torrt, men regn är på väg",
    watch: "Se över jordfukten",
  };
  const message =
    assessment.level === "rain_soon"
      ? `${names} kan behöva ses över efter torra dagar. Kontrollera jorden innan du vattnar eftersom regn kan vara på väg.`
      : `${names} kan behöva ses över efter väder med låg nederbörd eller hög avdunstning. Kontrollera jorden innan du vattnar.`;

  return signalOrNull({
    id: `weather:watering:${assessment.window.recentStart}:${assessment.window.recentEnd}:${assessment.window.forecastStart ?? "none"}:${assessment.window.forecastEnd ?? "none"}`,
    type: "watering",
    level,
    title: titleByLevel[assessment.level],
    message,
    affectedBatches: affected,
    validFrom: assessment.window.recentEnd,
    validTo: assessment.window.forecastEnd,
    action: weatherAction,
  });
}

export function signalFromHeatAssessment(assessment: HeatAssessment): GrobiggisSignal | null {
  if (assessment.level === "none" || assessment.level === "unavailable") return null;
  const level = signalLevelFromHeatLevel(assessment.level);
  if (!level) return null;

  const affected = affectedBatches(assessment.affectedPlants);
  const names = affectedList(affected);
  const titleByLevel: Record<Exclude<HeatAssessmentLevel, "none" | "unavailable">, string> = {
    high_attention: "Mycket varmt för odlingen",
    attention: "Varm dag – håll extra koll",
    watch: "Varmt nog att följa",
  };

  return signalOrNull({
    id: `weather:heat:${assessment.window.start}:${assessment.window.end}`,
    type: "heat",
    level,
    title: titleByLevel[assessment.level],
    message: `${names} kan behöva följas lite extra under den väntade värmen.`,
    affectedBatches: affected,
    validFrom: assessment.window.start,
    validTo: assessment.window.end,
    action: weatherAction,
  });
}

export function sortSignals(signals: GrobiggisSignal[]) {
  return [...signals].sort((left, right) => {
    const levelDiff = levelOrder[left.level] - levelOrder[right.level];
    if (levelDiff) return levelDiff;
    const typeDiff = typeOrder[left.type] - typeOrder[right.type];
    if (typeDiff) return typeDiff;
    return left.id.localeCompare(right.id, "sv-SE");
  });
}

export function buildWeatherSignals(assessments: WeatherSignalAssessments): GrobiggisSignal[] {
  const signals = [
    signalFromFrostAssessment(assessments.frostAssessment),
    signalFromWaterAssessment(assessments.waterAssessment),
    signalFromHeatAssessment(assessments.heatAssessment),
  ].filter((signal): signal is GrobiggisSignal => Boolean(signal));

  return sortSignals([...new Map(signals.map((signal) => [signal.id, signal])).values()]);
}
