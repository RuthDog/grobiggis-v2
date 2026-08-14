import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { FrostAssessment } from "../src/domain/frost-watch.ts";
import type { GrowingBatch, GrowingSpace } from "../src/domain/growing-types.ts";
import type { HeatAssessment } from "../src/domain/heat-watch.ts";
import {
  buildWeatherSignals,
  type GrobiggisSignal,
  signalFromFrostAssessment,
  signalFromHeatAssessment,
  signalFromWaterAssessment,
  signalLevelFromFrostLevel,
  signalLevelFromHeatLevel,
  signalLevelFromWaterLevel,
} from "../src/domain/signals.ts";
import { uniqueAffectedBatchLabelsForPresentation } from "../src/components/signal-card-presentation.ts";
import type { WaterAssessment } from "../src/domain/water-watch.ts";
import { loadTodayViewForUser } from "../src/lib/growing/today.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";
import type { GrowingSpaceRepository } from "../src/repositories/growing-space-repository.ts";

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

const affected = (patch: Partial<FrostAssessment["affectedPlants"][number]> = {}) => ({
  batchId: "batch-a",
  plantId: "tomat",
  plantName: "Tomat",
  variety: "Sungold",
  sensitivity: "heat_loving_tender" as const,
  reason: "Test",
  ...patch,
});

const frost = (patch: Partial<FrostAssessment> = {}): FrostAssessment => ({
  level: "near_frost",
  minimumTemperature: 2,
  window: { start: "2026-08-12T18:00", end: "2026-08-13T09:00", timeZone: "Europe/Stockholm" },
  affectedPlants: [affected()],
  reason: "Test",
  ...patch,
});

const water = (patch: Partial<WaterAssessment> = {}): WaterAssessment => ({
  level: "attention",
  reason: "Test",
  rainExpectedSoon: false,
  metrics: { recentPrecipitation: 1, forecastPrecipitation: 0, referenceEvapotranspiration: 11, maxTemperature: 27 },
  window: { recentStart: "2026-08-09", recentEnd: "2026-08-12", forecastStart: "2026-08-13", forecastEnd: "2026-08-14", timeZone: "Europe/Stockholm" },
  affectedPlants: [{ ...affected(), sensitivity: "high" as const, placementType: null, placementAttention: "normal" as const }],
  ...patch,
});

const heat = (patch: Partial<HeatAssessment> = {}): HeatAssessment => ({
  level: "attention",
  maximumTemperature: 31,
  hottestDate: "2026-08-12",
  window: { start: "2026-08-12", end: "2026-08-13", timeZone: "Europe/Stockholm" },
  affectedPlants: [{ ...affected(), sensitivity: "flowering_heat" as const, placementType: null, placementAttention: "normal" as const }],
  reason: "Test",
  ...patch,
});

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

function space(userId = "user-a", batchId = "batch-a"): GrowingSpace {
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

test("GrobiggisSignal is weather-provider-neutral and data-only", () => {
  const source = readFileSync("src/domain/signals.ts", "utf8");

  assert.match(source, /export interface GrobiggisSignal/);
  assert.doesNotMatch(source, /Open-Meteo|weather_code|temperature_2m|et0_fao_evapotranspiration|fetchWeatherForecast|WeatherForecast/);
  assert.doesNotMatch(source, /INSERT|UPDATE|DELETE|db\.|localStorage|sessionStorage/);
});

test("frost adapter creates a deterministic signal with affected batches and action", () => {
  const signal = signalFromFrostAssessment(frost());
  const again = signalFromFrostAssessment(frost());

  assert.ok(signal);
  assert.equal(signal.id, "weather:frost:2026-08-12T18:00:2026-08-13T09:00");
  assert.equal(again?.id, signal.id);
  assert.equal(signal.type, "frost");
  assert.equal(signal.level, "attention");
  assert.equal(signal.title, "Risk för frost i natt");
  assert.match(signal.message, /Tomat · Sungold/);
  assert.deepEqual(signal.affectedBatches, [{ batchId: "batch-a", plantId: "tomat", label: "Tomat · Sungold" }]);
  assert.deepEqual(signal.action, { href: "/vader", label: "Se väderdetaljer" });
  assert.equal(typeof signal.action?.href, "string");
});

test("water and heat adapters create product signals without exposing assessment internals", () => {
  const waterSignal = signalFromWaterAssessment(water({ level: "rain_soon" }));
  const heatSignal = signalFromHeatAssessment(heat({ level: "high_attention" }));

  assert.equal(waterSignal?.type, "watering");
  assert.equal(waterSignal?.level, "attention");
  assert.equal(waterSignal?.title, "Torrt, men regn är på väg");
  assert.match(waterSignal?.message ?? "", /Kontrollera jorden innan du vattnar/);
  assert.doesNotMatch(waterSignal?.message ?? "", /ET0|soil|provider/i);

  assert.equal(heatSignal?.type, "heat");
  assert.equal(heatSignal?.level, "important");
  assert.equal(heatSignal?.title, "Mycket varmt för odlingen");
  assert.match(heatSignal?.message ?? "", /väntade värmen/);
  assert.doesNotMatch(heatSignal?.message ?? "", /tröskel|provider|vattna/i);
});

test("none, unavailable and empty affected batches do not create ordinary signals", () => {
  assert.equal(signalFromFrostAssessment(frost({ level: "none", affectedPlants: [] })), null);
  assert.equal(signalFromFrostAssessment(frost({ level: "unavailable", affectedPlants: [] })), null);
  assert.equal(signalFromWaterAssessment(water({ level: "none", affectedPlants: [] })), null);
  assert.equal(signalFromWaterAssessment(water({ level: "unavailable", affectedPlants: [] })), null);
  assert.equal(signalFromHeatAssessment(heat({ level: "none", affectedPlants: [] })), null);
  assert.equal(signalFromHeatAssessment(heat({ level: "unavailable", affectedPlants: [] })), null);
  assert.equal(signalFromHeatAssessment(heat({ level: "attention", affectedPlants: [] })), null);
});

test("affected batches preserve two batches of the same plant", () => {
  const signal = signalFromFrostAssessment(
    frost({
      affectedPlants: [affected({ batchId: "batch-a", variety: "A" }), affected({ batchId: "batch-b", variety: "B" })],
    }),
  );

  assert.deepEqual(signal?.affectedBatches.map((batch) => batch.batchId), ["batch-a", "batch-b"]);
  assert.deepEqual(signal?.affectedBatches.map((batch) => batch.label), ["Tomat · A", "Tomat · B"]);
});

test("SignalCard presentation deduplicates identical labels without changing affected batches", () => {
  const signal: GrobiggisSignal = {
    id: "weather:watering:test",
    type: "watering",
    level: "attention",
    title: "Kontrollera jorden idag",
    message: "Test",
    affectedBatches: [
      { batchId: "chili-a", plantId: "chili", label: "Chili · vanlig" },
      { batchId: "basil-a", plantId: "basilika", label: "Basilika · Vanlig" },
      { batchId: "basil-b", plantId: "basilika", label: "Basilika · Vanlig" },
    ],
    validFrom: null,
    validTo: null,
    action: { href: "/vader", label: "Se väderdetaljer" },
  };

  assert.deepEqual(uniqueAffectedBatchLabelsForPresentation(signal.affectedBatches), ["Chili · vanlig", "Basilika · Vanlig"]);
  assert.deepEqual(
    signal.affectedBatches.map((batch) => batch.batchId),
    ["chili-a", "basil-a", "basil-b"],
  );
  assert.equal(signal.id, "weather:watering:test");
});

test("SignalCard presentation keeps different variants and different plants separate", () => {
  const batches = [
    { batchId: "tomat-a", plantId: "tomat", label: "Tomat · Sungold" },
    { batchId: "tomat-b", plantId: "tomat", label: "Tomat · Moneymaker" },
    { batchId: "plant-a", plantId: "paprika", label: "Vanlig" },
    { batchId: "plant-b", plantId: "chili", label: "Vanlig" },
  ];

  assert.deepEqual(uniqueAffectedBatchLabelsForPresentation(batches), ["Tomat · Sungold", "Tomat · Moneymaker", "Vanlig", "Vanlig"]);
});

test("domain levels map to product priority levels", () => {
  assert.equal(signalLevelFromFrostLevel("frost"), "important");
  assert.equal(signalLevelFromFrostLevel("near_frost"), "attention");
  assert.equal(signalLevelFromFrostLevel("cold_night"), "info");
  assert.equal(signalLevelFromFrostLevel("none"), null);
  assert.equal(signalLevelFromFrostLevel("unavailable"), null);

  assert.equal(signalLevelFromWaterLevel("high_attention"), "important");
  assert.equal(signalLevelFromWaterLevel("attention"), "attention");
  assert.equal(signalLevelFromWaterLevel("rain_soon"), "attention");
  assert.equal(signalLevelFromWaterLevel("watch"), "info");

  assert.equal(signalLevelFromHeatLevel("high_attention"), "important");
  assert.equal(signalLevelFromHeatLevel("attention"), "attention");
  assert.equal(signalLevelFromHeatLevel("watch"), "info");
});

test("aggregator filters, deduplicates and sorts deterministically", () => {
  const signals = buildWeatherSignals({
    frostAssessment: frost({ level: "cold_night" }),
    waterAssessment: water({ level: "high_attention" }),
    heatAssessment: heat({ level: "attention" }),
  });
  const again = buildWeatherSignals({
    frostAssessment: frost({ level: "cold_night" }),
    waterAssessment: water({ level: "high_attention" }),
    heatAssessment: heat({ level: "attention" }),
  });

  assert.deepEqual(
    signals.map((signal) => `${signal.level}:${signal.type}`),
    ["important:watering", "attention:heat", "info:frost"],
  );
  assert.deepEqual(
    again.map((signal) => signal.id),
    signals.map((signal) => signal.id),
  );
});

test("aggregator can return three relevant signals and filters inactive assessments", () => {
  const signals = buildWeatherSignals({
    frostAssessment: frost(),
    waterAssessment: water({ level: "none", affectedPlants: [] }),
    heatAssessment: heat(),
  });

  assert.deepEqual(
    signals.map((signal) => signal.type),
    ["frost", "heat"],
  );
});

test("Idag uses common signals without interpreting weather assessment levels", () => {
  const page = readFileSync("src/app/idag/page.tsx", "utf8");
  const card = readFileSync("src/components/SignalCard.tsx", "utf8");

  assert.match(page, /view\.signals/);
  assert.match(page, /SignalCard/);
  assert.doesNotMatch(page, /FrostWatchCard|WaterWatchCard|HeatWatchCard|near_frost|rain_soon|high_attention|showNeutral/);
  assert.match(card, /signal\.title/);
  assert.match(card, /signal\.message/);
  assert.match(card, /signal\.affectedBatches/);
  assert.match(card, /signal\.action\.href/);
});

test("loadTodayViewForUser builds signals only from server-authorized batches and placements", async () => {
  const batchRepository = new MemoryGrowingBatchRepository();
  const spaceRepository = new MemoryGrowingSpaceRepository();
  await batchRepository.createForUser("user-a", batch({ id: "a" }));
  await batchRepository.createForUser("user-b", batch({ id: "b" }));
  await spaceRepository.createForUser("user-a", space("user-a", "a"));
  await spaceRepository.createForUser("user-b", space("user-b", "b"));
  const seen: Array<{ batchIds: string[]; spaceIds: string[] }> = [];

  const view = await loadTodayViewForUser(batchRepository, { id: "user-a" }, new Date("2026-08-12T10:00:00Z"), {
    spaceRepository,
    loadSignals: async (_user, batches, spaces) => {
      seen.push({ batchIds: batches.map((item) => item.id), spaceIds: spaces.map((item) => item.id) });
      return [
        {
          id: "weather:frost:test",
          type: "frost",
          level: "attention",
          title: "Risk för frost i natt",
          message: "Test",
          affectedBatches: [{ batchId: batches[0].id, plantId: batches[0].plantId, label: "Tomat" }],
          validFrom: null,
          validTo: null,
          action: { href: "/vader", label: "Se väderdetaljer" },
        },
      ];
    },
  });

  assert.deepEqual(seen, [{ batchIds: ["a"], spaceIds: ["space-user-a"] }]);
  assert.deepEqual(view.signals[0].affectedBatches.map((batch) => batch.batchId), ["a"]);
});

test("signal server reuses weather assessments and introduces no provider fetch or persistence", () => {
  const signalServer = readFileSync("src/lib/signals/server.ts", "utf8");
  const weatherServer = readFileSync("src/lib/weather/server.ts", "utf8");
  const domain = readFileSync("src/domain/signals.ts", "utf8");
  const today = readFileSync("src/lib/growing/today.ts", "utf8");
  const combined = `${signalServer}\n${domain}\n${today}`;

  assert.match(signalServer, /getWeatherAssessmentsForUser/);
  assert.match(weatherServer, /assessWeatherSignals\(forecast, batches, spaces/);
  assert.doesNotMatch(signalServer, /fetchWeatherForecast|Open-Meteo|open-meteo|weather_code|temperature_2m/);
  assert.doesNotMatch(combined, /INSERT|UPDATE|DELETE|growingEvents|db:generate|localStorage|sessionStorage/);
});
