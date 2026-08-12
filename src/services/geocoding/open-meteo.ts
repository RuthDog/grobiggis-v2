import { validateLatitude, validateLongitude } from "../../domain/user-profile.ts";
import { GeocodingSearchError, type GeocodingCandidate, type GeocodingSearchOptions } from "./types.ts";

const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const DEFAULT_COUNT = 5;
const MAX_COUNT = 5;
const DEFAULT_TIMEOUT_MS = 4_000;

interface OpenMeteoGeocodingResult {
  id?: unknown;
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  country_code?: unknown;
  country?: unknown;
  admin1?: unknown;
  admin2?: unknown;
  timezone?: unknown;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toCandidate(result: OpenMeteoGeocodingResult): GeocodingCandidate | null {
  const providerId = typeof result.id === "number" || typeof result.id === "string" ? String(result.id) : null;
  const name = requiredText(result.name);
  const countryCode = requiredText(result.country_code);
  const latitude = typeof result.latitude === "number" ? validateLatitude(result.latitude) : null;
  const longitude = typeof result.longitude === "number" ? validateLongitude(result.longitude) : null;

  if (!providerId || !name || countryCode !== "SE" || latitude === null || longitude === null) return null;

  return {
    providerId,
    name,
    admin1: optionalText(result.admin1),
    admin2: optionalText(result.admin2),
    country: optionalText(result.country),
    countryCode: "SE",
    latitude,
    longitude,
    timezone: optionalText(result.timezone),
  };
}

export function buildOpenMeteoGeocodingUrl(name: string, count = DEFAULT_COUNT) {
  const params = new URLSearchParams({
    name,
    count: String(Math.min(Math.max(count, 1), MAX_COUNT)),
    language: "sv",
    countryCode: "SE",
    format: "json",
  });

  return `${OPEN_METEO_GEOCODING_URL}?${params.toString()}`;
}

export async function searchOpenMeteoLocalities(name: string, options: GeocodingSearchOptions = {}) {
  const query = name.trim();
  if (!query) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetchFn = options.fetchFn ?? fetch;

  try {
    const response = await fetchFn(buildOpenMeteoGeocodingUrl(query, options.count), {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) throw new GeocodingSearchError("Det gick inte att söka efter orten just nu.", "http");

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new GeocodingSearchError("Det gick inte att söka efter orten just nu.", "malformed");

    const results = (payload as { results?: unknown }).results;
    if (results === undefined) return [];
    if (!Array.isArray(results)) throw new GeocodingSearchError("Det gick inte att söka efter orten just nu.", "malformed");

    return results.map((result) => toCandidate(result as OpenMeteoGeocodingResult)).filter((candidate): candidate is GeocodingCandidate => Boolean(candidate));
  } catch (error) {
    if (error instanceof GeocodingSearchError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeocodingSearchError("Det gick inte att söka efter orten just nu.", "timeout");
    }
    throw new GeocodingSearchError("Det gick inte att söka efter orten just nu.", "network");
  } finally {
    clearTimeout(timeout);
  }
}
