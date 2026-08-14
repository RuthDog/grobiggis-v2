import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plants } from "../src/data/plants.ts";
import { plantColdProfiles } from "../src/data/plant-cold-profiles.ts";
import type { GrowingBatch } from "../src/domain/growing-types.ts";
import { assessFrostRisk, classifyFrostLevel, getUpcomingNightWindow, minimumTemperatureForWindow } from "../src/domain/frost-watch.ts";
import { loadTodayViewForUser } from "../src/lib/growing/today.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";
import type { WeatherForecast } from "../src/services/weather/types.ts";

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

function forecast(hourly: WeatherForecast["hourly"]): WeatherForecast {
  return {
    location: { locality: "Halmstad", countryCode: "SE" },
    timezone: "Europe/Stockholm",
    fetchedAt: "2026-08-12T10:00:00.000Z",
    current: {
      time: "2026-08-12T12:00",
      temperature: 15,
      apparentTemperature: 15,
      condition: "clear",
      windSpeed: 2,
      windGusts: 4,
      precipitation: 0,
    },
    daily: [],
    hourly,
    attribution: { label: "Test", url: "https://example.com" },
  };
}

test("Frostvakt uses the Europe/Stockholm upcoming or ongoing night window", () => {
  assert.deepEqual(getUpcomingNightWindow(new Date("2026-08-12T10:00:00Z")), {
    start: "2026-08-12T18:00",
    end: "2026-08-13T09:00",
    timeZone: "Europe/Stockholm",
  });
  assert.deepEqual(getUpcomingNightWindow(new Date("2026-08-12T04:00:00Z")), {
    start: "2026-08-11T18:00",
    end: "2026-08-12T09:00",
    timeZone: "Europe/Stockholm",
  });
});

test("UTC midnight does not move Frostvakt to the wrong Swedish night", () => {
  assert.equal(getUpcomingNightWindow(new Date("2026-01-15T23:30:00Z")).start, "2026-01-15T18:00");
  assert.equal(getUpcomingNightWindow(new Date("2026-01-15T23:30:00Z")).end, "2026-01-16T09:00");
});

test("night minimum is calculated only from the selected local night hours", () => {
  const window = getUpcomingNightWindow(new Date("2026-08-12T10:00:00Z"));
  assert.equal(
    minimumTemperatureForWindow(
      forecast([
        { time: "2026-08-12T17:00", temperature: -5 },
        { time: "2026-08-12T18:00", temperature: 7 },
        { time: "2026-08-13T03:00", temperature: 1 },
        { time: "2026-08-13T09:00", temperature: 2 },
        { time: "2026-08-13T10:00", temperature: -4 },
      ]),
      window,
    ),
    1,
  );
});

test("frost levels are conservative and unavailable is not treated as safe", () => {
  assert.equal(classifyFrostLevel(-0.1), "frost");
  assert.equal(classifyFrostLevel(0), "near_frost");
  assert.equal(classifyFrostLevel(4), "near_frost");
  assert.equal(classifyFrostLevel(9.9), "cold_night");
  assert.equal(classifyFrostLevel(10), "none");
  assert.equal(classifyFrostLevel(null), "unavailable");
});

test("missing hourly data gives unavailable rather than no risk", () => {
  const assessment = assessFrostRisk({
    forecast: forecast([]),
    batches: [batch()],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "unavailable");
  assert.equal(assessment.minimumTemperature, null);
  assert.deepEqual(assessment.affectedPlants, []);
});

test("cold profiles are catalog-backed, unique and do not assume a fixed catalog size", () => {
  const catalogIds = new Set(plants.map((plant) => plant.id));
  const profileIds = plantColdProfiles.map((profile) => profile.plantId);

  assert.equal(new Set(profileIds).size, profileIds.length);
  assert.ok(profileIds.length >= 6);
  assert.ok(profileIds.length < plants.length);
  assert.ok(plants.length >= 27);
  assert.ok(profileIds.every((plantId) => catalogIds.has(plantId)));
  assert.ok(plants.some((plant) => /Ã¶|Ã¤|Ã¥|ö|ä|å/.test(plant.name)));
});

test("sensitive active plants are batch-specific and unknown or unprofiled plants do not crash", () => {
  const assessment = assessFrostRisk({
    forecast: forecast([{ time: "2026-08-13T03:00", temperature: 2 }]),
    batches: [batch({ id: "tomato-a", variety: "A" }), batch({ id: "tomato-b", variety: "B" }), batch({ id: "kale", plantId: "gronkal" }), batch({ id: "unknown", plantId: "mystery" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "near_frost");
  assert.deepEqual(
    assessment.affectedPlants.map((plant) => plant.batchId).sort(),
    ["tomato-a", "tomato-b"],
  );
});

test("completed batches are ignored by Frostvakt", () => {
  const assessment = assessFrostRisk({
    forecast: forecast([{ time: "2026-08-13T03:00", temperature: -1 }]),
    batches: [batch({ id: "active" }), batch({ id: "completed", status: "completed", completedAt: "2026-08-01" })],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.deepEqual(assessment.affectedPlants.map((plant) => plant.batchId), ["active"]);
});

test("warm nights produce no relevant Idag signal", () => {
  const assessment = assessFrostRisk({
    forecast: forecast([{ time: "2026-08-13T03:00", temperature: 14 }]),
    batches: [batch()],
    plantCatalog: plants,
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(assessment.level, "none");
  assert.deepEqual(assessment.affectedPlants, []);
});

test("loadTodayViewForUser gives Frostvakt only server-authorized user batches", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await repository.createForUser("user-a", batch({ id: "a" }));
  await repository.createForUser("user-b", batch({ id: "b" }));
  const seenBatchIds: string[][] = [];

  const view = await loadTodayViewForUser(repository, { id: "user-a" }, new Date("2026-08-12T10:00:00Z"), {
    loadFrostAssessment: async (_user, batches) => {
      seenBatchIds.push(batches.map((item) => item.id));
      return assessFrostRisk({
        forecast: forecast([{ time: "2026-08-13T03:00", temperature: 1 }]),
        batches,
        plantCatalog: plants,
        now: new Date("2026-08-12T10:00:00Z"),
      });
    },
  });

  assert.deepEqual(seenBatchIds, [["a"]]);
  assert.deepEqual(view.signals[0]?.affectedBatches.map((plant) => plant.batchId), ["a"]);
});

test("Frostvakt UI is present on Vader and Idag uses the common signal card", () => {
  const weatherPage = readFileSync("src/app/vader/page.tsx", "utf8");
  const todayPage = readFileSync("src/app/idag/page.tsx", "utf8");
  const card = readFileSync("src/components/FrostWatchCard.tsx", "utf8");

  assert.match(weatherPage, /FrostWatchCard/);
  assert.match(todayPage, /SignalCard/);
  assert.doesNotMatch(todayPage, /FrostWatchCard/);
  assert.match(card, /Frostvakt/);
  assert.match(card, /showNeutral/);
});

test("Frostvakt remains derived and provider-neutral", () => {
  const schema = readFileSync("src/db/schema.ts", "utf8");
  const journal = readFileSync("migrations/meta/_journal.json", "utf8");
  const frostDomain = readFileSync("src/domain/frost-watch.ts", "utf8");
  const frostData = readFileSync("src/data/plant-cold-profiles.ts", "utf8");
  const weatherServer = readFileSync("src/lib/weather/server.ts", "utf8");
  const today = readFileSync("src/lib/growing/today.ts", "utf8");
  const combined = `${frostDomain}\n${frostData}\n${weatherServer}\n${today}`;

  assert.doesNotMatch(schema, /frost_alert|frost_event|weather_alert|forecast_history/i);
  assert.doesNotMatch(journal, /frost_alert|frost_event|weather_alert|forecast_history/i);
  assert.doesNotMatch(combined, /INSERT|UPDATE|DELETE|db:generate|SMHI API|weather_code|temperature_2m|push|notification|localStorage|sessionStorage/i);
  assert.match(frostDomain, /WeatherForecast/);
});
