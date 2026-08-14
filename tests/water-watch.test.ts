import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plants } from "../src/data/plants.ts";
import { plantWaterProfiles } from "../src/data/plant-water-profiles.ts";
import { dedupeAffectedPlantsForPresentation } from "../src/components/water-watch-presentation.ts";
import type { GrowingBatch, GrowingSpace } from "../src/domain/growing-types.ts";
import { assessWaterAttention } from "../src/domain/water-watch.ts";
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
  temperatureMin: 14,
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

function baseDaily(patch: Partial<DailyWeather> = {}) {
  return [
    day({ date: "2026-08-09", precipitationSum: 0, referenceEvapotranspiration: 2.5, temperatureMax: 23, ...patch }),
    day({ date: "2026-08-10", precipitationSum: 0, referenceEvapotranspiration: 3.1, temperatureMax: 25, ...patch }),
    day({ date: "2026-08-11", precipitationSum: 0.2, referenceEvapotranspiration: 3.2, temperatureMax: 27, ...patch }),
    day({ date: "2026-08-12", precipitationSum: 0, referenceEvapotranspiration: 3.4, temperatureMax: 28, ...patch }),
    day({ date: "2026-08-13", precipitationSum: 0, referenceEvapotranspiration: 2.8, temperatureMax: 25 }),
    day({ date: "2026-08-14", precipitationSum: 0, referenceEvapotranspiration: 2.7, temperatureMax: 24 }),
  ];
}

function potSpace(userId = "user-a", batchId = "batch-a"): GrowingSpace {
  return {
    id: `space-${userId}`,
    userId,
    name: "Kruka",
    type: "pot",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    placements: [{ id: `placement-${userId}`, userId, spaceId: `space-${userId}`, batchId, placedAt: "2026-08-01T00:00:00.000Z" }],
  };
}

test("PlantWaterProfile ids are catalog-backed, unique and catalog-size agnostic", () => {
  const catalogIds = new Set(plants.map((plant) => plant.id));
  const profileIds = plantWaterProfiles.map((profile) => profile.plantId);

  assert.equal(new Set(profileIds).size, profileIds.length);
  assert.ok(profileIds.length >= 6);
  assert.ok(profileIds.length < plants.length);
  assert.ok(plants.length >= 27);
  assert.ok(profileIds.every((plantId) => catalogIds.has(plantId)));
});

test("dry recent weather plus elevated ET0 and heat gives high attention for profiled active plants", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "high_attention");
  assert.equal(assessment.metrics.recentPrecipitation, 0.2);
  assert.equal(Number(assessment.metrics.referenceEvapotranspiration?.toFixed(1)), 12.2);
  assert.deepEqual(assessment.affectedPlants.map((plant) => plant.batchId), ["batch-a"]);
});

test("warm dry weather and pot placement can raise attention without numeric placement factors", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ plantId: "basilika" })],
    plantCatalog: plants,
    growingSpaces: [potSpace()],
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "high_attention");
  assert.equal(assessment.affectedPlants[0].placementType, "pot");
  assert.equal(assessment.affectedPlants[0].placementAttention, "elevated");
  assert.match(assessment.affectedPlants[0].reason, /Krukor kan torka snabbare/);
});

test("greenhouse is not treated as automatically dry", () => {
  const greenhouse: GrowingSpace = { ...potSpace(), type: "greenhouse", name: "Vaxthus" };
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily({ temperatureMax: 24 })),
    batches: [batch({ plantId: "basilika" })],
    plantCatalog: plants,
    growingSpaces: [greenhouse],
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "attention");
  assert.equal(assessment.affectedPlants[0].placementAttention, "normal");
});

test("rain soon changes the assessment copy and does not mechanically say to water", () => {
  const daily = baseDaily();
  daily[4] = day({ date: "2026-08-13", precipitationSum: 8, referenceEvapotranspiration: 2.8, temperatureMax: 22 });
  const assessment = assessWaterAttention({
    forecast: forecast(daily),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "rain_soon");
  assert.equal(assessment.rainExpectedSoon, true);
  assert.match(assessment.reason, /Kontrollera jorden innan du vattnar/);
  assert.doesNotMatch(`${assessment.reason} ${assessment.affectedPlants[0].reason}`, /måste vattna|vattna 5 liter|jorden är torr/i);
});

test("precipitation reduces the signal when recent weather is not dry", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily({ precipitationSum: 4, referenceEvapotranspiration: 2 })),
    batches: [batch({ plantId: "gurka" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "none");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("unprofiled, unknown and completed plants are not guessed", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ id: "completed", status: "completed", plantId: "tomat" }), batch({ id: "kale", plantId: "gronkal" }), batch({ id: "unknown", plantId: "mystery" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "none");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("two batches of the same plant remain separate and unplaced batches still work", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ id: "a", plantId: "tomat" }), batch({ id: "b", plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.deepEqual(
    assessment.affectedPlants.map((plant) => plant.batchId).sort(),
    ["a", "b"],
  );
  assert.ok(assessment.affectedPlants.every((plant) => plant.placementType === null));
});

test("presentation deduplicates identical batches of the same plant without changing the assessment engine", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ id: "a", plantId: "basilika", variety: "Vanlig" }), batch({ id: "b", plantId: "basilika", variety: "Vanlig" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.affectedPlants.length, 2);
  assert.deepEqual(dedupeAffectedPlantsForPresentation(assessment), [
    { plantId: "basilika", plantName: "Basilika", variety: "Vanlig", reason: "Håll jorden jämnt fuktig, särskilt vid odling i kruka." },
  ]);
});

test("presentation keeps same plant separate when placement changes the visible advice", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ id: "pot", plantId: "basilika", variety: "Vanlig" }), batch({ id: "bed", plantId: "basilika", variety: "Vanlig" })],
    plantCatalog: plants,
    growingSpaces: [potSpace("user-a", "pot")],
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.affectedPlants.length, 2);
  assert.equal(dedupeAffectedPlantsForPresentation(assessment).length, 2);
});

test("presentation never groups different plants together", () => {
  const assessment = assessWaterAttention({
    forecast: forecast(baseDaily()),
    batches: [batch({ id: "tomat", plantId: "tomat", variety: "Sungold" }), batch({ id: "chili", plantId: "chili", variety: "Padron" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(dedupeAffectedPlantsForPresentation(assessment).length, 2);
});

test("missing water weather data gives unavailable rather than safe", () => {
  const broken = baseDaily({ referenceEvapotranspiration: null });
  const assessment = assessWaterAttention({
    forecast: forecast(broken),
    batches: [batch({ plantId: "tomat" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "unavailable");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("loadTodayViewForUser gives water guidance only server-authorized batches and placements", async () => {
  const batchRepository = new MemoryGrowingBatchRepository();
  const spaceRepository = new MemoryGrowingSpaceRepository();
  await batchRepository.createForUser("user-a", batch({ id: "a", plantId: "tomat" }));
  await batchRepository.createForUser("user-b", batch({ id: "b", plantId: "tomat" }));
  await spaceRepository.createForUser("user-a", potSpace("user-a", "a"));
  await spaceRepository.createForUser("user-b", potSpace("user-b", "b"));

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
      heatAssessment: {
        level: "none",
        maximumTemperature: 24,
        hottestDate: "2026-08-12",
        window: { start: "2026-08-12", end: "2026-08-13", timeZone: "Europe/Stockholm" },
        affectedPlants: [],
        reason: "Test",
      },
      waterAssessment: assessWaterAttention({
        forecast: forecast(baseDaily()),
        batches,
        plantCatalog: plants,
        growingSpaces: spaces,
        now: new Date("2026-08-12T10:00:00Z"),
      }),
    }),
  });

  assert.deepEqual(view.signals[0]?.affectedBatches.map((plant) => plant.batchId), ["a"]);
  assert.equal(view.signals[0]?.type, "watering");
});

test("Bevattningskoll UI is present on Vader and Idag uses the common signal card", () => {
  const weatherPage = readFileSync("src/app/vader/page.tsx", "utf8");
  const todayPage = readFileSync("src/app/idag/page.tsx", "utf8");
  const card = readFileSync("src/components/WaterWatchCard.tsx", "utf8");
  const visibleNotes = plantWaterProfiles.map((profile) => profile.note).join("\n");

  assert.match(weatherPage, /WaterWatchCard/);
  assert.match(todayPage, /SignalCard/);
  assert.doesNotMatch(todayPage, /WaterWatchCard/);
  assert.match(card, /Bevattningskoll/);
  assert.doesNotMatch(card, /jordfuktighet.*är torr|måste vattna|liter/i);
  assert.match(visibleNotes, /Kontrollera jorden regelbundet under varma och torra perioder/);
  assert.match(visibleNotes, /Håll jorden jämnt fuktig, särskilt vid odling i kruka/);
  assert.doesNotMatch(visibleNotes, /varmealskande krukvanlig gronsak|solanaceous crops|hanteras som/i);
});

test("Version 3.4 adds no water persistence, soil moisture model, heat watch or push layer", () => {
  const schema = readFileSync("src/db/schema.ts", "utf8");
  const journal = readFileSync("migrations/meta/_journal.json", "utf8");
  const waterDomain = readFileSync("src/domain/water-watch.ts", "utf8");
  const waterData = readFileSync("src/data/plant-water-profiles.ts", "utf8");
  const waterCard = readFileSync("src/components/WaterWatchCard.tsx", "utf8");
  const weatherServer = readFileSync("src/lib/weather/server.ts", "utf8");
  const combined = `${waterDomain}\n${waterData}\n${waterCard}\n${weatherServer}`;

  assert.doesNotMatch(schema, /water_alert|watering_event|irrigation_history|moisture_state|drought_history|soil_moisture/i);
  assert.doesNotMatch(journal, /water_alert|watering_event|irrigation_history|moisture_state|drought_history/i);
  assert.doesNotMatch(combined, /INSERT|UPDATE|DELETE|db:generate|soil_moisture|heat watch|värmevarning|push|notification|localStorage|sessionStorage/i);
});
