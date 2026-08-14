import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plants } from "../src/data/plants.ts";
import { plantHeatProfiles } from "../src/data/plant-heat-profiles.ts";
import type { GrowingBatch, GrowingSpace } from "../src/domain/growing-types.ts";
import { assessHeatAttention } from "../src/domain/heat-watch.ts";
import { loadTodayViewForUser } from "../src/lib/growing/today.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";
import type { GrowingSpaceRepository } from "../src/repositories/growing-space-repository.ts";
import type { DailyWeather, WeatherForecast } from "../src/services/weather/types.ts";

class MemoryGrowingBatchRepository implements GrowingBatchRepository {
  readonly rows = new Map<string, { userId: string; batch: GrowingBatch }>();

  async create(userId: string, batch: GrowingBatch) {
    return this.createForUser(userId, batch);
  }
  async createForUser(userId: string, batch: GrowingBatch) {
    this.rows.set(batch.id, { userId, batch: structuredClone(batch) });
    return structuredClone(batch);
  }
  async getByIdForUser(userId: string, batchId: string) {
    const stored = this.rows.get(batchId);
    if (!stored || stored.userId !== userId) return null;
    return structuredClone(stored.batch);
  }
  async listForUser(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId).map((row) => structuredClone(row.batch));
  }
  async save(userId: string, batch: GrowingBatch) {
    return this.saveForUser(userId, batch);
  }
  async saveForUser(userId: string, batch: GrowingBatch) {
    this.rows.set(batch.id, { userId, batch: structuredClone(batch) });
    return structuredClone(batch);
  }
  async addActualEventForUser(userId: string, batchId: string, event: GrowingBatch["actualEvents"][number]) {
    const existing = await this.getByIdForUser(userId, batchId);
    if (!existing) return null;
    return this.saveForUser(userId, { ...existing, actualEvents: [...existing.actualEvents, event] });
  }
  async complete(userId: string, batchId: string, completedAt: string) {
    return this.completeForUser(userId, batchId, completedAt);
  }
  async completeForUser(userId: string, batchId: string, completedAt: string) {
    const existing = await this.getByIdForUser(userId, batchId);
    if (!existing) return null;
    return this.saveForUser(userId, { ...existing, status: "completed", completedAt });
  }
}

class MemoryGrowingSpaceRepository implements GrowingSpaceRepository {
  readonly rows = new Map<string, { userId: string; space: GrowingSpace }>();

  async createForUser(userId: string, space: GrowingSpace) {
    this.rows.set(space.id, { userId, space: structuredClone(space) });
    return structuredClone(space);
  }
  async getByIdForUser(userId: string, spaceId: string) {
    const stored = this.rows.get(spaceId);
    if (!stored || stored.userId !== userId) return null;
    return structuredClone(stored.space);
  }
  async listForUser(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId).map((row) => structuredClone(row.space));
  }
}

const batch = (patch: Partial<GrowingBatch> = {}): GrowingBatch => ({
  id: "batch-a",
  plantId: "tomat",
  variety: "Sungold",
  startType: "seed",
  startDate: "2026-05-01",
  status: "active",
  actualEvents: [],
  ...patch,
});

const day = ({ date, ...patch }: Partial<DailyWeather> & { date: string }): DailyWeather => ({
  date,
  condition: "clear",
  temperatureMin: 18,
  temperatureMax: 24,
  precipitationSum: 0,
  referenceEvapotranspiration: 3,
  precipitationProbabilityMax: 0,
  windSpeedMax: 4,
  windGustsMax: 7,
  sunrise: null,
  sunset: null,
  isPast: date < "2026-08-12",
  ...patch,
});

function forecast(daily: DailyWeather[]): WeatherForecast {
  return {
    location: { locality: "Halmstad", countryCode: "SE" },
    timezone: "Europe/Stockholm",
    fetchedAt: "2026-08-12T10:00:00.000Z",
    current: {
      time: "2026-08-12T12:00",
      temperature: 24,
      apparentTemperature: 24,
      condition: "clear",
      windSpeed: 2,
      windGusts: 4,
      precipitation: 0,
    },
    daily,
    hourly: [],
    attribution: { label: "Test", url: "https://example.com" },
  };
}

function heatForecast(maxToday: number, maxTomorrow = 24, extraDays: DailyWeather[] = []) {
  return forecast([
    day({ date: "2026-08-11", temperatureMax: 40, isPast: true }),
    day({ date: "2026-08-12", temperatureMax: maxToday }),
    day({ date: "2026-08-13", temperatureMax: maxTomorrow }),
    ...extraDays,
  ]);
}

function space(type: GrowingSpace["type"], batchId = "batch-a", userId = "user-a"): GrowingSpace {
  return {
    id: `space-${type}-${userId}`,
    userId,
    name: type,
    type,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    placements: [{ id: `placement-${type}-${userId}`, userId, spaceId: `space-${type}-${userId}`, batchId, placedAt: "2026-08-01T00:00:00.000Z" }],
  };
}

test("PlantHeatProfile ids are catalog-backed, unique and catalog-size agnostic", () => {
  const catalogIds = new Set(plants.map((plant) => plant.id));
  const profileIds = plantHeatProfiles.map((profile) => profile.plantId);

  assert.equal(new Set(profileIds).size, profileIds.length);
  assert.ok(profileIds.length >= 6);
  assert.ok(profileIds.length < plants.length);
  assert.ok(plants.length >= 27);
  assert.ok(profileIds.every((plantId) => catalogIds.has(plantId)));
  assert.equal(profileIds.includes("basilika"), false);
});

test("unknown, unprofiled and completed plants are not guessed", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(36),
    batches: [batch({ id: "completed", status: "completed" }), batch({ id: "basil", plantId: "basilika" }), batch({ id: "unknown", plantId: "mystery" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "none");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("ordinary warm summer weather does not automatically create a heat signal", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(27),
    batches: [batch({ plantId: "tomat" }), batch({ id: "chili", plantId: "chili" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "none");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("different heat profiles react differently to the same temperature", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(28),
    batches: [batch({ id: "lettuce", plantId: "sallat" }), batch({ id: "tomato", plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "attention");
  assert.deepEqual(assessment.affectedPlants.map((plant) => plant.batchId), ["lettuce"]);
});

test("today and tomorrow form the Europe/Stockholm heat window and find maximum temperature", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(30, 34, [day({ date: "2026-08-14", temperatureMax: 39 })]),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-11T23:30:00Z"),
  });

  assert.deepEqual(assessment.window, { start: "2026-08-12", end: "2026-08-13", timeZone: "Europe/Stockholm" });
  assert.equal(assessment.maximumTemperature, 34);
  assert.equal(assessment.hottestDate, "2026-08-13");
  assert.equal(assessment.level, "high_attention");
});

test("caution and high thresholds produce transparent levels", () => {
  const caution = assessHeatAttention({
    forecast: heatForecast(32),
    batches: [batch({ plantId: "gurka" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });
  const high = assessHeatAttention({
    forecast: heatForecast(35),
    batches: [batch({ plantId: "gurka" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(caution.level, "watch");
  assert.equal(high.level, "high_attention");
  assert.match(high.reason, /35 °C/);
});

test("missing daily temperature data gives unavailable rather than safe", () => {
  const assessment = assessHeatAttention({
    forecast: forecast([]),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "unavailable");
  assert.equal(assessment.maximumTemperature, null);
});

test("two batches of the same heat-profiled plant stay separate", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(32),
    batches: [batch({ id: "a", plantId: "tomat" }), batch({ id: "b", plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.deepEqual(
    assessment.affectedPlants.map((plant) => plant.batchId).sort(),
    ["a", "b"],
  );
});

test("placement context is cautious and never changes forecast temperature mathematically", () => {
  const greenhouse = assessHeatAttention({
    forecast: heatForecast(32),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    growingSpaces: [space("greenhouse")],
    now: new Date("2026-08-12T10:00:00Z"),
  });
  const pot = assessHeatAttention({
    forecast: heatForecast(32),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    growingSpaces: [space("pot")],
    now: new Date("2026-08-12T10:00:00Z"),
  });
  const openGround = assessHeatAttention({
    forecast: heatForecast(32),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    growingSpaces: [space("open_ground")],
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(greenhouse.maximumTemperature, 32);
  assert.match(greenhouse.affectedPlants[0].reason, /växthus kan temperaturen bli högre/);
  assert.match(greenhouse.affectedPlants[0].reason, /ventilation/);
  assert.equal(pot.maximumTemperature, 32);
  assert.match(pot.affectedPlants[0].reason, /Krukor kan värmas upp snabbt/);
  assert.doesNotMatch(pot.affectedPlants[0].reason, /vattna|jordfukt/i);
  assert.equal(openGround.maximumTemperature, 32);
  assert.doesNotMatch(openGround.affectedPlants[0].reason, /växthus|Krukor|\\+10/);
});

test("unplaced batches still work", () => {
  const assessment = assessHeatAttention({
    forecast: heatForecast(30),
    batches: [batch({ plantId: "sallat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.affectedPlants[0].placementType, null);
});

test("loadTodayViewForUser gives heat guidance only server-authorized batches and placements", async () => {
  const batchRepository = new MemoryGrowingBatchRepository();
  const spaceRepository = new MemoryGrowingSpaceRepository();
  await batchRepository.createForUser("user-a", batch({ id: "a", plantId: "sallat" }));
  await batchRepository.createForUser("user-b", batch({ id: "b", plantId: "sallat" }));
  await spaceRepository.createForUser("user-a", space("greenhouse", "a", "user-a"));
  await spaceRepository.createForUser("user-b", space("pot", "b", "user-b"));

  const view = await loadTodayViewForUser(batchRepository, { id: "user-a" }, new Date("2026-08-12T10:00:00Z"), {
    spaceRepository,
    loadWeatherAssessments: async (_user, batches, spaces) => ({
      frostAssessment: {
        level: "none",
        minimumTemperature: 12,
        window: { start: "2026-08-12T18:00", end: "2026-08-13T09:00", timeZone: "Europe/Stockholm" },
        affectedPlants: [],
        reason: "Test",
      },
      waterAssessment: {
        level: "none",
        rainExpectedSoon: false,
        metrics: { recentPrecipitation: 12, forecastPrecipitation: 4, referenceEvapotranspiration: 4, maxTemperature: 28 },
        window: { recentStart: "2026-08-09", recentEnd: "2026-08-12", forecastStart: "2026-08-13", forecastEnd: "2026-08-14", timeZone: "Europe/Stockholm" },
        affectedPlants: [],
        reason: "Test",
      },
      heatAssessment: assessHeatAttention({
        forecast: heatForecast(30),
        batches,
        plantCatalog: plants,
        growingSpaces: spaces,
        now: new Date("2026-08-12T10:00:00Z"),
      }),
    }),
  });

  assert.deepEqual(view.signals[0]?.affectedBatches.map((plant) => plant.batchId), ["a"]);
  assert.equal(view.signals[0]?.type, "heat");
});

test("Värmekoll UI is present on Vader and Idag uses the common signal card", () => {
  const weatherPage = readFileSync("src/app/vader/page.tsx", "utf8");
  const todayPage = readFileSync("src/app/idag/page.tsx", "utf8");
  const card = readFileSync("src/components/HeatWatchCard.tsx", "utf8");
  const heatData = readFileSync("src/data/plant-heat-profiles.ts", "utf8");

  assert.match(weatherPage, /HeatWatchCard/);
  assert.match(todayPage, /SignalCard/);
  assert.doesNotMatch(todayPage, /HeatWatchCard/);
  assert.match(card, /Värmekoll/);
  assert.match(card, /odlingsstöd/);
  assert.doesNotMatch(card, /VÄRMEVARNING|SMHI|weather_code|vattna|liter/i);
  assert.match(heatData, /Håll extra koll på blomning/);
  assert.match(heatData, /Skugga eller skörda i tid/);
});

test("Version 3.5 adds no heat persistence, schema migration, push or provider-specific coupling", () => {
  const schema = readFileSync("src/db/schema.ts", "utf8");
  const journal = readFileSync("migrations/meta/_journal.json", "utf8");
  const heatDomain = readFileSync("src/domain/heat-watch.ts", "utf8");
  const heatData = readFileSync("src/data/plant-heat-profiles.ts", "utf8");
  const heatCard = readFileSync("src/components/HeatWatchCard.tsx", "utf8");
  const weatherServer = readFileSync("src/lib/weather/server.ts", "utf8");
  const frostDomain = readFileSync("src/domain/frost-watch.ts", "utf8");
  const waterDomain = readFileSync("src/domain/water-watch.ts", "utf8");
  const combined = `${heatDomain}\n${heatData}\n${heatCard}\n${weatherServer}`;

  assert.doesNotMatch(schema, /heat_alert|heat_event|weather_alert|forecast_history|push/i);
  assert.doesNotMatch(journal, /0005_|heat_alert|heat_event|weather_alert|forecast_history/i);
  assert.doesNotMatch(combined, /INSERT|UPDATE|DELETE|db:generate|SMHI API|weather_code|temperature_2m|push|notification|localStorage|sessionStorage/i);
  assert.match(heatDomain, /WeatherForecast/);
  assert.match(frostDomain, /assessFrostRisk/);
  assert.match(waterDomain, /assessWaterAttention/);
});
