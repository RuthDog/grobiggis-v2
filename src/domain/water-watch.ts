import type { CatalogPlant } from "../data/plant-types.ts";
import { plantWaterProfiles, type PlantWaterProfile } from "../data/plant-water-profiles.ts";
import type { GrowingBatch, GrowingSpace, GrowingSpaceType } from "./growing-types.ts";
import type { WeatherForecast } from "../services/weather/types.ts";

export type WaterAssessmentLevel = "unavailable" | "none" | "watch" | "attention" | "high_attention" | "rain_soon";
export type PlacementWaterAttention = "normal" | "elevated";

export interface WaterAssessmentWindow {
  recentStart: string;
  recentEnd: string;
  forecastStart: string | null;
  forecastEnd: string | null;
  timeZone: string;
}

export interface WaterAffectedBatch {
  batchId: string;
  plantId: string;
  plantName: string;
  variety?: string;
  sensitivity: PlantWaterProfile["sensitivity"];
  placementType: GrowingSpaceType | null;
  placementAttention: PlacementWaterAttention;
  reason: string;
}

export interface WaterAssessmentMetrics {
  recentPrecipitation: number | null;
  forecastPrecipitation: number | null;
  referenceEvapotranspiration: number | null;
  maxTemperature: number | null;
}

export interface WaterAssessment {
  level: WaterAssessmentLevel;
  reason: string;
  rainExpectedSoon: boolean;
  metrics: WaterAssessmentMetrics;
  window: WaterAssessmentWindow;
  affectedPlants: WaterAffectedBatch[];
}

interface AssessWaterAttentionInput {
  forecast: WeatherForecast;
  batches: GrowingBatch[];
  plantCatalog: CatalogPlant[];
  growingSpaces?: GrowingSpace[];
  waterProfiles?: PlantWaterProfile[];
  now?: Date;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "Europe/Stockholm";
const RECENT_DAYS_BACK = 3;
const FORECAST_DAYS_AHEAD = 2;
const LOW_RECENT_PRECIPITATION_MM = 5;
const LOW_FORECAST_PRECIPITATION_MM = 5;
const RAIN_SOON_MM = 5;
const ELEVATED_ET0_MM = 10;
const HOT_DAY_C = 26;

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

function sum(values: Array<number | null>) {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finite.length ? finite.reduce((total, value) => total + value, 0) : null;
}

function max(values: Array<number | null>) {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
}

function windowFor(now: Date, timeZone: string): WaterAssessmentWindow {
  const today = dateSerial(stockholmDateISO(now, timeZone));
  if (today === null) {
    return { recentStart: "", recentEnd: "", forecastStart: null, forecastEnd: null, timeZone };
  }
  return {
    recentStart: formatDateSerial(today - RECENT_DAYS_BACK),
    recentEnd: formatDateSerial(today),
    forecastStart: formatDateSerial(today + 1),
    forecastEnd: formatDateSerial(today + FORECAST_DAYS_AHEAD),
    timeZone,
  };
}

function daysInRange(forecast: WeatherForecast, start: string | null, end: string | null) {
  if (!start || !end) return [];
  return forecast.daily.filter((day) => day.date >= start && day.date <= end).sort((left, right) => left.date.localeCompare(right.date));
}

function activeProfiledBatches(batches: GrowingBatch[], waterProfiles: PlantWaterProfile[]) {
  const profileByPlantId = new Map(waterProfiles.map((profile) => [profile.plantId, profile]));
  return batches
    .filter((batch) => batch.status === "active")
    .map((batch) => ({ batch, profile: profileByPlantId.get(batch.plantId) }))
    .filter((entry): entry is { batch: GrowingBatch; profile: PlantWaterProfile } => Boolean(entry.profile));
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

function classifyLevel({
  recentPrecipitation,
  forecastPrecipitation,
  referenceEvapotranspiration,
  maxTemperature,
  hasHighSensitivity,
  hasPotPlacement,
  hasProfiledPlants,
}: WaterAssessmentMetrics & { hasHighSensitivity: boolean; hasPotPlacement: boolean; hasProfiledPlants: boolean }): WaterAssessmentLevel {
  if (!hasProfiledPlants) return "none";
  if (recentPrecipitation === null || forecastPrecipitation === null || referenceEvapotranspiration === null) return "unavailable";

  const dryRecently = recentPrecipitation < LOW_RECENT_PRECIPITATION_MM;
  const littleRainAhead = forecastPrecipitation < LOW_FORECAST_PRECIPITATION_MM;
  const rainExpectedSoon = forecastPrecipitation >= RAIN_SOON_MM;
  const highEvaporationSignal = referenceEvapotranspiration >= ELEVATED_ET0_MM;
  const hotSignal = (maxTemperature ?? 0) >= HOT_DAY_C;

  if (dryRecently && highEvaporationSignal && littleRainAhead && hasHighSensitivity && (hotSignal || hasPotPlacement)) return "high_attention";
  if (dryRecently && highEvaporationSignal && rainExpectedSoon) return "rain_soon";
  if (dryRecently && highEvaporationSignal && (hasHighSensitivity || hasPotPlacement || hotSignal)) return "attention";
  if (dryRecently || (highEvaporationSignal && littleRainAhead)) return "watch";
  return "none";
}

function reasonForLevel(level: WaterAssessmentLevel) {
  if (level === "high_attention") return "Lite nederbord, hog avdunstningssignal och kansliga odlingar gor att jorden bor kontrolleras.";
  if (level === "attention") return "Vaderdata visar torr period och fortsatt avdunstningsdrivande vader.";
  if (level === "rain_soon") return "Det har varit torrt, men regn ar pa vag. Kontrollera jorden innan du vattnar.";
  if (level === "watch") return "Vaderdata ger skal att se over jordfukten, utan att saga att jorden ar torr.";
  if (level === "unavailable") return "Bevattningskollen saknar tillracklig vaderdata just nu.";
  return "Ingen tydlig bevattningssignal syns i vaderdata just nu.";
}

function affectedReason(profile: PlantWaterProfile, placementType: GrowingSpaceType | null, rainExpectedSoon: boolean) {
  const placement = placementType === "pot" && profile.containerAttention ? " Krukor kan torka snabbare och bor ses over oftare." : "";
  const rain = rainExpectedSoon ? " Regn vantas snart, sa kontrollera jorden innan du vattnar." : "";
  return `${profile.note}${placement}${rain}`.trim();
}

export function assessWaterAttention({
  forecast,
  batches,
  plantCatalog,
  growingSpaces = [],
  waterProfiles = plantWaterProfiles,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}: AssessWaterAttentionInput): WaterAssessment {
  const window = windowFor(now, timeZone);
  const recentDays = daysInRange(forecast, window.recentStart, window.recentEnd);
  const forecastDays = daysInRange(forecast, window.forecastStart, window.forecastEnd);
  const recentPrecipitation = sum(recentDays.map((day) => day.precipitationSum));
  const forecastPrecipitation = sum(forecastDays.map((day) => day.precipitationSum));
  const referenceEvapotranspiration = sum(recentDays.map((day) => day.referenceEvapotranspiration));
  const maxTemperature = max(recentDays.map((day) => day.temperatureMax));
  const profiled = activeProfiledBatches(batches, waterProfiles);
  const plantById = new Map(plantCatalog.map((plant) => [plant.id, plant]));
  const placementTypes = placementByBatchId(growingSpaces);
  const hasHighSensitivity = profiled.some(({ profile }) => profile.sensitivity === "high");
  const hasPotPlacement = profiled.some(({ batch, profile }) => placementTypes.get(batch.id) === "pot" && profile.containerAttention);
  const metrics = { recentPrecipitation, forecastPrecipitation, referenceEvapotranspiration, maxTemperature };
  const level = classifyLevel({ ...metrics, hasHighSensitivity, hasPotPlacement, hasProfiledPlants: profiled.length > 0 });
  const rainExpectedSoon = (forecastPrecipitation ?? 0) >= RAIN_SOON_MM;

  const affectedPlants =
    level === "none" || level === "unavailable"
      ? []
      : profiled.map(({ batch, profile }): WaterAffectedBatch => {
          const placementType = placementTypes.get(batch.id) ?? null;
          return {
            batchId: batch.id,
            plantId: batch.plantId,
            plantName: plantById.get(batch.plantId)?.name ?? batch.plantId,
            variety: batch.variety,
            sensitivity: profile.sensitivity,
            placementType,
            placementAttention: placementType === "pot" && profile.containerAttention ? "elevated" : "normal",
            reason: affectedReason(profile, placementType, rainExpectedSoon),
          };
        });

  return {
    level,
    reason: reasonForLevel(level),
    rainExpectedSoon,
    metrics,
    window,
    affectedPlants,
  };
}

export function unavailableWaterAssessment(now = new Date(), timeZone = DEFAULT_TIME_ZONE): WaterAssessment {
  return {
    level: "unavailable",
    reason: reasonForLevel("unavailable"),
    rainExpectedSoon: false,
    metrics: {
      recentPrecipitation: null,
      forecastPrecipitation: null,
      referenceEvapotranspiration: null,
      maxTemperature: null,
    },
    window: windowFor(now, timeZone),
    affectedPlants: [],
  };
}
