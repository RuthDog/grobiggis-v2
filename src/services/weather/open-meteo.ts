import { validateLatitude, validateLongitude } from "../../domain/user-profile.ts";
import { WeatherForecastError, type DailyWeather, type HourlyWeather, type WeatherCondition, type WeatherForecast, type WeatherLocation, type WeatherSearchOptions } from "./types.ts";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_REVALIDATE_SECONDS = 1_200;
const FORECAST_DAYS = 5;
const PAST_DAYS = 3;
const TIMEZONE = "Europe/Stockholm";
const CURRENT_VARIABLES = ["temperature_2m", "apparent_temperature", "precipitation", "weather_code", "wind_speed_10m", "wind_gusts_10m"] as const;
const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_min",
  "temperature_2m_max",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "sunrise",
  "sunset",
] as const;
const HOURLY_VARIABLES = ["temperature_2m"] as const;

interface OpenMeteoForecastPayload {
  timezone?: unknown;
  current?: Record<string, unknown>;
  daily?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
}

export function mapOpenMeteoWeatherCode(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([80, 81, 82].includes(code)) return "showers";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "unknown";
}

function numberValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new WeatherForecastError(`Vädret kunde inte hämtas just nu.`, "malformed");
  return value;
}

function optionalNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : null;
}

function stockholmDateISO(now: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function mapCurrent(current: Record<string, unknown>) {
  const weatherCode = numberValue(current.weather_code);
  return {
    time: stringValue(current.time) ?? "",
    temperature: numberValue(current.temperature_2m),
    apparentTemperature: numberValue(current.apparent_temperature),
    condition: mapOpenMeteoWeatherCode(weatherCode),
    windSpeed: numberValue(current.wind_speed_10m),
    windGusts: numberValue(current.wind_gusts_10m),
    precipitation: numberValue(current.precipitation),
  };
}

function mapDaily(daily: Record<string, unknown>, todayISO: string) {
  const time = arrayValue(daily.time);
  const weatherCode = arrayValue(daily.weather_code);
  const temperatureMin = arrayValue(daily.temperature_2m_min);
  const temperatureMax = arrayValue(daily.temperature_2m_max);
  const precipitationSum = arrayValue(daily.precipitation_sum);
  const referenceEvapotranspiration = arrayValue(daily.et0_fao_evapotranspiration);
  const precipitationProbabilityMax = arrayValue(daily.precipitation_probability_max);
  const windSpeedMax = arrayValue(daily.wind_speed_10m_max);
  const windGustsMax = arrayValue(daily.wind_gusts_10m_max);
  const sunrise = arrayValue(daily.sunrise);
  const sunset = arrayValue(daily.sunset);

  if (!time || !weatherCode || !temperatureMin || !temperatureMax || !precipitationSum || !referenceEvapotranspiration || !windSpeedMax || !windGustsMax) {
    throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "malformed");
  }

  return time.slice(0, PAST_DAYS + FORECAST_DAYS).map((date, index): DailyWeather => {
    const code = numberValue(weatherCode[index]);
    const dateValue = stringValue(date) ?? "";
    return {
      date: dateValue,
      condition: mapOpenMeteoWeatherCode(code),
      temperatureMin: numberValue(temperatureMin[index]),
      temperatureMax: numberValue(temperatureMax[index]),
      precipitationSum: numberValue(precipitationSum[index]),
      referenceEvapotranspiration: optionalNumberValue(referenceEvapotranspiration[index]),
      precipitationProbabilityMax: precipitationProbabilityMax ? optionalNumberValue(precipitationProbabilityMax[index]) : null,
      windSpeedMax: numberValue(windSpeedMax[index]),
      windGustsMax: numberValue(windGustsMax[index]),
      sunrise: sunrise ? stringValue(sunrise[index]) : null,
      sunset: sunset ? stringValue(sunset[index]) : null,
      isPast: dateValue < todayISO,
    };
  });
}

function mapHourly(hourly: Record<string, unknown>) {
  const time = arrayValue(hourly.time);
  const temperature = arrayValue(hourly.temperature_2m);
  if (!time || !temperature) throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "malformed");

  return time.map((value, index): HourlyWeather => ({ time: stringValue(value) ?? "", temperature: numberValue(temperature[index]) }));
}

export function buildOpenMeteoForecastUrl(latitude: number, longitude: number) {
  const lat = validateLatitude(latitude);
  const lon = validateLongitude(longitude);
  if (lat === null || lon === null) throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "malformed");

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: TIMEZONE,
    forecast_days: String(FORECAST_DAYS),
    past_days: String(PAST_DAYS),
    current: CURRENT_VARIABLES.join(","),
    daily: DAILY_VARIABLES.join(","),
    hourly: HOURLY_VARIABLES.join(","),
    temperature_unit: "celsius",
    wind_speed_unit: "ms",
    precipitation_unit: "mm",
  });

  return `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
}

export async function fetchOpenMeteoForecast(location: WeatherLocation, latitude: number, longitude: number, options: WeatherSearchOptions = {}): Promise<WeatherForecast> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetchFn = options.fetchFn ?? fetch;
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    signal: controller.signal,
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS },
  };

  try {
    const response = await fetchFn(buildOpenMeteoForecastUrl(latitude, longitude), requestInit);
    if (!response.ok) throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "http");

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "malformed");

    const forecast = payload as OpenMeteoForecastPayload;
    if (!forecast.current || !forecast.daily || !forecast.hourly) throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "malformed");

    return {
      location,
      timezone: stringValue(forecast.timezone) ?? TIMEZONE,
      fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
      current: mapCurrent(forecast.current),
      daily: mapDaily(forecast.daily, stockholmDateISO((options.now ?? (() => new Date()))())),
      hourly: mapHourly(forecast.hourly),
      attribution: {
        label: "Väderdata från Open-Meteo",
        url: "https://open-meteo.com/",
      },
    };
  } catch (error) {
    if (error instanceof WeatherForecastError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "timeout");
    throw new WeatherForecastError("Vädret kunde inte hämtas just nu.", "network");
  } finally {
    clearTimeout(timeout);
  }
}
