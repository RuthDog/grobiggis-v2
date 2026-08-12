import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenMeteoGeocodingUrl, searchOpenMeteoLocalities } from "../src/services/geocoding/open-meteo.ts";
import { GeocodingSearchError } from "../src/services/geocoding/types.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Open-Meteo adapter builds Sweden-only Swedish geocoding requests with capped count", () => {
  const url = new URL(buildOpenMeteoGeocodingUrl("Växjö", 99));

  assert.equal(url.origin + url.pathname, "https://geocoding-api.open-meteo.com/v1/search");
  assert.equal(url.searchParams.get("name"), "Växjö");
  assert.equal(url.searchParams.get("countryCode"), "SE");
  assert.equal(url.searchParams.get("language"), "sv");
  assert.equal(url.searchParams.get("format"), "json");
  assert.equal(url.searchParams.get("count"), "5");
});

test("Open-Meteo response maps to provider-neutral candidates with coordinates", async () => {
  const calls: string[] = [];
  const candidates = await searchOpenMeteoLocalities("Halmstad", {
    fetchFn: async (url) => {
      calls.push(String(url));
      return jsonResponse({
        results: [
          {
            id: 2708365,
            name: "Halmstad",
            latitude: 56.67446,
            longitude: 12.85676,
            country_code: "SE",
            country: "Sverige",
            admin1: "Hallands län",
            admin2: "Halmstads Kommun",
            timezone: "Europe/Stockholm",
            population: 70000,
            feature_code: "PPLA2",
          },
        ],
      });
    },
  });

  assert.match(calls[0], /countryCode=SE/);
  assert.deepEqual(candidates, [
    {
      providerId: "2708365",
      name: "Halmstad",
      admin1: "Hallands län",
      admin2: "Halmstads Kommun",
      country: "Sverige",
      countryCode: "SE",
      latitude: 56.67446,
      longitude: 12.85676,
      timezone: "Europe/Stockholm",
    },
  ]);
});

test("Open-Meteo adapter handles empty results", async () => {
  const candidates = await searchOpenMeteoLocalities("Ingenstad", {
    fetchFn: async () => jsonResponse({ results: [] }),
  });

  assert.deepEqual(candidates, []);
});

test("Open-Meteo adapter rejects malformed responses and HTTP errors", async () => {
  await assert.rejects(
    () =>
      searchOpenMeteoLocalities("Halmstad", {
        fetchFn: async () => jsonResponse({ results: "bad" }),
      }),
    (error) => error instanceof GeocodingSearchError && error.kind === "malformed",
  );

  await assert.rejects(
    () =>
      searchOpenMeteoLocalities("Halmstad", {
        fetchFn: async () => jsonResponse({ error: true }, 500),
      }),
    (error) => error instanceof GeocodingSearchError && error.kind === "http",
  );
});

test("Open-Meteo adapter handles timeout and network errors", async () => {
  await assert.rejects(
    () =>
      searchOpenMeteoLocalities("Halmstad", {
        timeoutMs: 1,
        fetchFn: async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          }),
      }),
    (error) => error instanceof GeocodingSearchError && error.kind === "timeout",
  );

  await assert.rejects(
    () =>
      searchOpenMeteoLocalities("Halmstad", {
        fetchFn: async () => {
          throw new Error("network down");
        },
      }),
    (error) => error instanceof GeocodingSearchError && error.kind === "network",
  );
});

test("Open-Meteo adapter filters non-SE and coordinate-less provider candidates", async () => {
  const candidates = await searchOpenMeteoLocalities("Paris", {
    fetchFn: async () =>
      jsonResponse({
        results: [
          { id: 1, name: "Paris", latitude: 48.85, longitude: 2.35, country_code: "FR", country: "Frankrike" },
          { id: 2, name: "Paris", latitude: null, longitude: 2.35, country_code: "SE", country: "Sverige" },
        ],
      }),
  });

  assert.deepEqual(candidates, []);
});
