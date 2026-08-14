import type { CatalogPlant } from "../data/plant-types.ts";
import { plantHeatProfiles, type PlantHeatProfile } from "../data/plant-heat-profiles.ts";
import type { GrowingBatch, GrowingSpace, GrowingSpaceType } from "./growing-types.ts";
import type { WeatherForecast } from "../services/weather/types.ts";

export type HeatAssessmentLevel = "unavailable" | "none" | "watch" | "attention" | "high_attention";
export type PlacementHeatAttention = "normal" | "context";

export interface HeatAssessmentWindow {
  start: string;
  end: string;
  timeZone: string;
}

export interface HeatAffectedBatch {
  batchId: string;
  plantId: string;
  plantName: string;
  variety?: string;
  sensitivity: PlantHeatProfile["sensitivity"];
  placementType: GrowingSpaceType | null;
  placementAttention: PlacementHeatAttention;
  reason: string;
}

export interface HeatAssessment {
  level: HeatAssessmentLevel;
  maximumTemperature: number | null;
  hottestDate: string | null;
  window: HeatAssessmentWindow;
  affectedPlants: HeatAffectedBatch[];
  reason: string;
}

interface AssessHeatAttentionInput {
  forecast: WeatherForecast;
  batches: GrowingBatch[];
  plantCatalog: CatalogPlant[];
  growingSpaces?: GrowingSpace[];
  heatProfiles?: PlantHeatProfile[];
  now?: Date;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "Europe/Stockholm";
const FORECAST_DAYS_AHEAD = 1;

function stockholmDateISO(now: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateSerial(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000);
}

function formatDateSerial(value: number) {
  const date = new Date(value * 86_400_000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function windowFor(now: Date, timeZone: string): HeatAssessmentWindow {
  const today = dateSerial(stockholmDateISO(now, timeZone));
  if (today === null) return { start: "", end: "", timeZone };
  return {
    start: formatDateSerial(today),
    end: formatDateSerial(today + FORECAST_DAYS_AHEAD),
    timeZone,
  };
}

function forecastDaysInWindow(forecast: WeatherForecast, window: HeatAssessmentWindow) {
  return forecast.daily.filter((day) => !day.isPast && day.date >= window.start && day.date <= window.end).sort((left, right) => left.date.localeCompare(right.date));
}

function maximumTemperatureForWindow(forecast: WeatherForecast, window: HeatAssessmentWindow) {
  const days = forecastDaysInWindow(forecast, window).filter((day) => Number.isFinite(day.temperatureMax));
  if (!days.length) return { maximumTemperature: null, hottestDate: null };
  const hottest = days.reduce((best, day) => (day.temperatureMax > best.temperatureMax ? day : best), days[0]);
  return { maximumTemperature: hottest.temperatureMax, hottestDate: hottest.date };
}

function activeProfiledBatches(batches: GrowingBatch[], heatProfiles: PlantHeatProfile[]) {
  const profileByPlantId = new Map(heatProfiles.map((profile) => [profile.plantId, profile]));
  return batches
    .filter((batch) => batch.status === "active")
    .map((batch) => ({ batch, profile: profileByPlantId.get(batch.plantId) }))
    .filter((entry): entry is { batch: GrowingBatch; profile: PlantHeatProfile } => Boolean(entry.profile));
}

function placementByBatchId(growingSpaces: GrowingSpace[]) {
  const map = new Map<string, GrowingSpaceType>();
  for (const space of growingSpaces) {
    for (const placement of space.placements) {
      if (!placement.removedAt) map.set(placement.batchId, space.type);
    }
  }
  return map;
}

function levelForProfile(maximumTemperature: number, profile: PlantHeatProfile): HeatAssessmentLevel {
  if (maximumTemperature >= profile.highStressTemperatureC) return "high_attention";
  if (maximumTemperature >= profile.cautionTemperatureC) return profile.sensitivity === "cool_season" ? "attention" : "watch";
  return "none";
}

function strongestLevel(levels: HeatAssessmentLevel[]): HeatAssessmentLevel {
  if (levels.includes("high_attention")) return "high_attention";
  if (levels.includes("attention")) return "attention";
  if (levels.includes("watch")) return "watch";
  return "none";
}

function reasonForLevel(level: HeatAssessmentLevel, maximumTemperature: number | null, hottestDate: string | null) {
  if (level === "unavailable") return "Värmekollen saknar tillräcklig temperaturprognos just nu.";
  if (level === "none") return "Ingen odlingsrelevant värmesignal syns i prognosen just nu.";
  const dateText = hottestDate ? ` ${hottestDate}` : "";
  const tempText = maximumTemperature === null ? "" : ` Prognosen visar som mest ${Math.round(maximumTemperature)} °C${dateText}.`;
  if (level === "high_attention") return `Mycket varm prognos för någon av dina värmekänsliga odlingar.${tempText}`;
  if (level === "attention") return `Värmen kan vara relevant för någon av dina aktiva odlingar.${tempText}`;
  return `Det blir varmt nog för att följa vissa odlingar lite extra.${tempText}`;
}

function affectedReason(profile: PlantHeatProfile, level: HeatAssessmentLevel, placementType: GrowingSpaceType | null) {
  const base = level === "high_attention" ? profile.highGuidance : profile.guidance;
  const placement =
    placementType === "greenhouse"
      ? " I växthus kan temperaturen bli högre än utomhus. Kontrollera ventilationen under varma dagar."
      : placementType === "pot"
        ? " Krukor kan värmas upp snabbt. Flytta eller skugga försiktigt om plantan ser stressad ut."
        : "";
  return `${base}${placement}`.trim();
}

export function assessHeatAttention({
  forecast,
  batches,
  plantCatalog,
  growingSpaces = [],
  heatProfiles = plantHeatProfiles,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}: AssessHeatAttentionInput): HeatAssessment {
  const window = windowFor(now, timeZone);
  const { maximumTemperature, hottestDate } = maximumTemperatureForWindow(forecast, window);
  const profiled = activeProfiledBatches(batches, heatProfiles);
  const plantById = new Map(plantCatalog.map((plant) => [plant.id, plant]));
  const placementTypes = placementByBatchId(growingSpaces);

  if (maximumTemperature === null) {
    return { level: "unavailable", maximumTemperature, hottestDate, window, affectedPlants: [], reason: reasonForLevel("unavailable", maximumTemperature, hottestDate) };
  }

  if (!profiled.length) {
    return { level: "none", maximumTemperature, hottestDate, window, affectedPlants: [], reason: reasonForLevel("none", maximumTemperature, hottestDate) };
  }

  const affectedPlants = profiled.flatMap(({ batch, profile }): HeatAffectedBatch[] => {
    const level = levelForProfile(maximumTemperature, profile);
    if (level === "none") return [];
    const placementType = placementTypes.get(batch.id) ?? null;
    return [
      {
        batchId: batch.id,
        plantId: batch.plantId,
        plantName: plantById.get(batch.plantId)?.name ?? batch.plantId,
        variety: batch.variety,
        sensitivity: profile.sensitivity,
        placementType,
        placementAttention: placementType === "greenhouse" || placementType === "pot" ? "context" : "normal",
        reason: affectedReason(profile, level, placementType),
      },
    ];
  });
  const level = strongestLevel(profiled.map(({ profile }) => levelForProfile(maximumTemperature, profile)));

  return {
    level,
    maximumTemperature,
    hottestDate,
    window,
    affectedPlants,
    reason: reasonForLevel(level, maximumTemperature, hottestDate),
  };
}

export function unavailableHeatAssessment(now = new Date(), timeZone = DEFAULT_TIME_ZONE): HeatAssessment {
  const window = windowFor(now, timeZone);
  return {
    level: "unavailable",
    maximumTemperature: null,
    hottestDate: null,
    window,
    affectedPlants: [],
    reason: reasonForLevel("unavailable", null, null),
  };
}
