import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildOpenMeteoForecastUrl, fetchOpenMeteoForecast, mapOpenMeteoWeatherCode } from "../src/services/weather/open-meteo.ts";
import { labelForCondition } from "../src/services/weather/presentation.ts";
import { WeatherForecastError } from "../src/services/weather/types.ts";

const location = { locality: "Halmstad", countryCode: "SE" as const };

function read(path: string) {
  return readFileSync(path, "utf8");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|md)$/.test(entry) ? [path] : [];
  });
}

function forecastPayload() {
  return {
    timezone: "Europe/Stockholm",
    current: {
      time: "2026-08-12T12:00",
      temperature_2m: 18.4,
      apparent_temperature: 17.2,
      precipitation: 0.4,
      weather_code: 2,
      wind_speed_10m: 4.2,
      wind_gusts_10m: 8.1,
    },
    daily: {
      time: ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"],
      weather_code: [0, 1, 2, 2, 61, 3, 0, 80],
      temperature_2m_min: [12, 11, 13, 14, 13, 12, 15, 16],
      temperature_2m_max: [18, 19, 20, 20, 21, 19, 22, 23],
      precipitation_sum: [0, 0.1, 0, 0.4, 3.2, 0, 0, 1.1],
      et0_fao_evapotranspiration: [3.1, 3.4, 2.9, 3.2, 2.1, 2.4, 3, 3.3],
      precipitation_probability_max: [0, 5, 10, 20, 70, 5, 0, 40],
      wind_speed_10m_max: [3, 4, 5, 5, 6, 4, 3, 7],
      wind_gusts_10m_max: [7, 8, 9, 9, 12, 8, 7, 14],
      sunrise: ["2026-08-09T05:26", "2026-08-10T05:28", "2026-08-11T05:30", "2026-08-12T05:32", "2026-08-13T05:34", "2026-08-14T05:36", "2026-08-15T05:38", "2026-08-16T05:40"],
      sunset: ["2026-08-09T20:55", "2026-08-10T20:53", "2026-08-11T20:51", "2026-08-12T20:49", "2026-08-13T20:47", "2026-08-14T20:44", "2026-08-15T20:42", "2026-08-16T20:39"],
    },
    hourly: {
      time: ["2026-08-12T00:00", "2026-08-12T01:00", "2026-08-12T02:00"],
      temperature_2m: [11.2, 10.8, 10.1],
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Open-Meteo forecast request uses profile coordinates and intended variables", () => {
  const url = new URL(buildOpenMeteoForecastUrl(56.67446, 12.85676));

  assert.equal(url.searchParams.get("latitude"), "56.67446");
  assert.equal(url.searchParams.get("longitude"), "12.85676");
  assert.equal(url.searchParams.get("timezone"), "Europe/Stockholm");
  assert.equal(url.searchParams.get("forecast_days"), "5");
  assert.equal(url.searchParams.get("past_days"), "3");
  assert.equal(url.searchParams.get("temperature_unit"), "celsius");
  assert.equal(url.searchParams.get("wind_speed_unit"), "ms");
  assert.equal(url.searchParams.get("precipitation_unit"), "mm");
  assert.equal(url.searchParams.get("current"), "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m");
  assert.equal(
    url.searchParams.get("daily"),
    "weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset",
  );
  assert.equal(url.searchParams.get("hourly"), "temperature_2m");
});

test("Open-Meteo forecast fetch uses short cache revalidation and normalizes current, daily and hourly data", async () => {
  const calls: Array<{ url: string; init?: RequestInit & { next?: { revalidate: number } } }> = [];
  const forecast = await fetchOpenMeteoForecast(location, 56.67446, 12.85676, {
    now: () => new Date("2026-08-12T10:00:00Z"),
    fetchFn: async (url, init) => {
      calls.push({ url: String(url), init: init as RequestInit & { next?: { revalidate: number } } });
      return jsonResponse(forecastPayload());
    },
  });

  assert.match(calls[0].url, /latitude=56\.67446/);
  assert.match(calls[0].url, /longitude=12\.85676/);
  assert.equal(calls[0].init?.next?.revalidate, 1200);
  assert.equal(forecast.location.locality, "Halmstad");
  assert.equal(forecast.timezone, "Europe/Stockholm");
  assert.equal(forecast.fetchedAt, "2026-08-12T10:00:00.000Z");
  assert.equal(forecast.current.temperature, 18.4);
  assert.equal(forecast.current.apparentTemperature, 17.2);
  assert.equal(forecast.current.precipitation, 0.4);
  assert.equal(forecast.current.windSpeed, 4.2);
  assert.equal(forecast.current.windGusts, 8.1);
  assert.equal(forecast.current.condition, "partly_cloudy");
  assert.equal("weatherCode" in forecast.current, false);
  assert.equal(forecast.daily.length, 8);
  assert.equal(forecast.daily[0].isPast, true);
  assert.equal(forecast.daily[3].isPast, false);
  assert.equal(forecast.daily[4].condition, "rain");
  assert.equal("weatherCode" in forecast.daily[4], false);
  assert.equal(forecast.daily[4].temperatureMin, 13);
  assert.equal(forecast.daily[4].temperatureMax, 21);
  assert.equal(forecast.daily[4].referenceEvapotranspiration, 2.1);
  assert.equal(forecast.daily[4].precipitationProbabilityMax, 70);
  assert.equal(forecast.daily[3].sunrise, "2026-08-12T05:32");
  assert.equal(forecast.daily[3].sunset, "2026-08-12T20:49");
  assert.deepEqual(forecast.hourly.map((hour) => hour.temperature), [11.2, 10.8, 10.1]);
});

test("Open-Meteo weather codes are mapped inside the adapter", () => {
  assert.equal(mapOpenMeteoWeatherCode(0), "clear");
  assert.equal(mapOpenMeteoWeatherCode(2), "partly_cloudy");
  assert.equal(mapOpenMeteoWeatherCode(3), "cloudy");
  assert.equal(mapOpenMeteoWeatherCode(45), "fog");
  assert.equal(mapOpenMeteoWeatherCode(51), "drizzle");
  assert.equal(mapOpenMeteoWeatherCode(63), "rain");
  assert.equal(mapOpenMeteoWeatherCode(75), "snow");
  assert.equal(mapOpenMeteoWeatherCode(80), "showers");
  assert.equal(mapOpenMeteoWeatherCode(95), "thunderstorm");
  assert.equal(mapOpenMeteoWeatherCode(999), "unknown");
  assert.equal(labelForCondition("partly_cloudy"), "Växlande molnighet");
});

test("forecast adapter handles malformed response, HTTP error and timeout", async () => {
  await assert.rejects(
    () =>
      fetchOpenMeteoForecast(location, 56.67446, 12.85676, {
        fetchFn: async () => jsonResponse({ current: {}, daily: {} }),
      }),
    (error) => error instanceof WeatherForecastError && error.kind === "malformed",
  );

  await assert.rejects(
    () =>
      fetchOpenMeteoForecast(location, 56.67446, 12.85676, {
        fetchFn: async () => jsonResponse({ error: true }, 500),
      }),
    (error) => error instanceof WeatherForecastError && error.kind === "http",
  );

  await assert.rejects(
    () =>
      fetchOpenMeteoForecast(location, 56.67446, 12.85676, {
        timeoutMs: 1,
        fetchFn: async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          }),
      }),
    (error) => error instanceof WeatherForecastError && error.kind === "timeout",
  );
});

test("weather page is auth-backed, profile-sourced and has missing-location state", () => {
  const server = read("src/lib/weather/server.ts");
  const page = read("src/app/vader/page.tsx");
  const adapter = read("src/services/weather/open-meteo.ts");
  const provider = read("src/services/weather/provider.ts");
  const shell = read("src/components/AppShell.tsx");
  const home = read("src/app/page.tsx");

  assert.match(server, /getCurrentUser\(\)/);
  assert.match(server, /getUserProfileForUser/);
  assert.match(server, /profile\.latitude === null \|\| profile\.longitude === null/);
  assert.match(server, /fetchWeatherForecast/);
  assert.doesNotMatch(server, /fetchOpenMeteoForecast|open-meteo/);
  assert.match(provider, /WeatherProvider/);
  assert.match(provider, /fetchOpenMeteoForecast/);
  assert.match(page, /Verifiera din odlingsort i Profil/);
  assert.match(page, /Väder för/);
  assert.match(`${page}\n${adapter}`, /Väderdata från Open-Meteo/);
  assert.match(shell, /href: "\/vader"/);
  assert.match(home, /href="\/vader"/);
  assert.doesNotMatch(`${server}\n${page}`, /searchParams|[?&]lat=|[?&]lon=|navigator\.geolocation|localStorage|sessionStorage|weather_forecasts/i);
});

test("Open-Meteo raw forecast fields stay outside product logic", () => {
  const allowedRawFieldFiles = new Set(["src\\services\\weather\\open-meteo.ts"]);
  const rawPattern = /weather_code|temperature_2m|apparent_temperature|precipitation_probability|wind_speed_10m|wind_gusts_10m|et0_fao_evapotranspiration/;

  for (const file of sourceFiles("src")) {
    const normalized = file.replaceAll("/", "\\");
    if (allowedRawFieldFiles.has(normalized)) continue;
    assert.doesNotMatch(read(file), rawPattern, `${file} must not reference Open-Meteo raw forecast fields`);
  }
});

test("Version 3.3 keeps weather and frost derived without persistence, schema migration, drought or push layer", () => {
  const schema = read("src/db/schema.ts");
  const migrations = read("migrations/meta/_journal.json");
  const weatherSources = `${read("src/services/weather/open-meteo.ts")}\n${read("src/lib/weather/server.ts")}\n${read("src/app/vader/page.tsx")}`;

  assert.doesNotMatch(schema, /weather_forecasts|weather_alerts|forecast_history|frost|drought|push/i);
  assert.doesNotMatch(migrations, /0005_|weather_forecasts|weather_alerts|forecast_history/i);
  assert.doesNotMatch(weatherSources, /INSERT|UPDATE|DELETE|db:generate|SMHI API|Nominatim|weather_forecasts|tork|push/i);
});
