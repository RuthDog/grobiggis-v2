import type { CatalogPlant } from "../data/plant-types.ts";
import { plantColdProfiles, type PlantColdProfile } from "../data/plant-cold-profiles.ts";
import type { GrowingBatch } from "./growing-types.ts";
import type { WeatherForecast } from "../services/weather/types.ts";

export type FrostAssessmentLevel = "unavailable" | "none" | "cold_night" | "near_frost" | "frost";

export interface FrostNightWindow {
  start: string;
  end: string;
  timeZone: string;
}

export interface FrostAffectedBatch {
  batchId: string;
  plantId: string;
  plantName: string;
  variety?: string;
  sensitivity: PlantColdProfile["sensitivity"];
  reason: string;
}

export interface FrostAssessment {
  level: FrostAssessmentLevel;
  minimumTemperature: number | null;
  window: FrostNightWindow;
  affectedPlants: FrostAffectedBatch[];
  reason: string;
}

interface AssessFrostRiskInput {
  forecast: WeatherForecast;
  batches: GrowingBatch[];
  plantCatalog: CatalogPlant[];
  coldProfiles?: PlantColdProfile[];
  now?: Date;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "Europe/Stockholm";
const EVENING_START_HOUR = 18;
const MORNING_END_HOUR = 9;
const MINUTES_PER_DAY = 24 * 60;
const NIGHT_LENGTH_MINUTES = 15 * 60;

function stockholmParts(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function daySerial(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function localMinuteSerial(year: number, month: number, day: number, hour: number, minute = 0) {
  return daySerial(year, month, day) * MINUTES_PER_DAY + hour * 60 + minute;
}

function parseLocalForecastTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return localMinuteSerial(Number(year), Number(month), Number(day), Number(hour), Number(minute));
}

function formatLocalMinuteSerial(value: number) {
  const date = new Date(value * 60_000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function getUpcomingNightWindow(now = new Date(), timeZone = DEFAULT_TIME_ZONE): FrostNightWindow {
  const parts = stockholmParts(now, timeZone);
  const todayStart = localMinuteSerial(parts.year, parts.month, parts.day, EVENING_START_HOUR);
  const windowStart = parts.hour < MORNING_END_HOUR ? todayStart - MINUTES_PER_DAY : todayStart;

  return {
    start: formatLocalMinuteSerial(windowStart),
    end: formatLocalMinuteSerial(windowStart + NIGHT_LENGTH_MINUTES),
    timeZone,
  };
}

export function classifyFrostLevel(minimumTemperature: number | null): FrostAssessmentLevel {
  if (minimumTemperature === null) return "unavailable";
  if (minimumTemperature < 0) return "frost";
  if (minimumTemperature <= 4) return "near_frost";
  if (minimumTemperature < 10) return "cold_night";
  return "none";
}

export function minimumTemperatureForWindow(forecast: WeatherForecast, window: FrostNightWindow) {
  const start = parseLocalForecastTime(window.start);
  const end = parseLocalForecastTime(window.end);
  if (start === null || end === null) return null;

  const values = forecast.hourly
    .map((hour) => ({ stamp: parseLocalForecastTime(hour.time), temperature: hour.temperature }))
    .filter((hour): hour is { stamp: number; temperature: number } => hour.stamp !== null && Number.isFinite(hour.temperature))
    .filter((hour) => hour.stamp >= start && hour.stamp <= end)
    .map((hour) => hour.temperature);

  return values.length ? Math.min(...values) : null;
}

function reasonForLevel(level: FrostAssessmentLevel) {
  if (level === "frost") return "Prognosen visar 2m-lufttemperatur under 0 C under natten.";
  if (level === "near_frost") return "Prognosen ligger nara 0 C; mark och blad kan bli kallare an 2m-luften.";
  if (level === "cold_night") return "Natten ar frostfri i prognosen men kall for varmealskande, omtaliga vaxter.";
  if (level === "unavailable") return "Frostvakten saknar tillracklig timprognos for natten.";
  return "Ingen tydlig frostrisk syns i nattens timprognos.";
}

function affectedReason(level: FrostAssessmentLevel, profile: PlantColdProfile) {
  if (level === "frost") return `Profilen ar frostkanslig under ${profile.frostTemperatureC} C.`;
  if (level === "near_frost") return `Profilen ar relevant vid markfrostrisk upp till ${profile.nearFrostTemperatureC} C.`;
  return `Profilen ar varmealskande och bevakas vid kalla natter under ${profile.cautionTemperatureC} C.`;
}

export function assessFrostRisk({
  forecast,
  batches,
  plantCatalog,
  coldProfiles = plantColdProfiles,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}: AssessFrostRiskInput): FrostAssessment {
  const window = getUpcomingNightWindow(now, timeZone);
  const minimumTemperature = minimumTemperatureForWindow(forecast, window);
  const level = classifyFrostLevel(minimumTemperature);
  const plantById = new Map(plantCatalog.map((plant) => [plant.id, plant]));
  const profileByPlantId = new Map(coldProfiles.map((profile) => [profile.plantId, profile]));

  const affectedPlants =
    level === "none" || level === "unavailable"
      ? []
      : batches
          .filter((batch) => batch.status === "active")
          .flatMap((batch): FrostAffectedBatch[] => {
            const profile = profileByPlantId.get(batch.plantId);
            if (!profile) return [];
            return [
              {
                batchId: batch.id,
                plantId: batch.plantId,
                plantName: plantById.get(batch.plantId)?.name ?? batch.plantId,
                variety: batch.variety,
                sensitivity: profile.sensitivity,
                reason: affectedReason(level, profile),
              },
            ];
          });

  return {
    level,
    minimumTemperature,
    window,
    affectedPlants,
    reason: reasonForLevel(level),
  };
}

export function unavailableFrostAssessment(now = new Date(), timeZone = DEFAULT_TIME_ZONE): FrostAssessment {
  return {
    level: "unavailable",
    minimumTemperature: null,
    window: getUpcomingNightWindow(now, timeZone),
    affectedPlants: [],
    reason: reasonForLevel("unavailable"),
  };
}
