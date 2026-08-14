import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { GrobiggisSignal, SignalLevel, SignalType } from "../src/domain/signals.ts";
import {
  buildNotificationCandidates,
  evaluateNotificationPolicy,
  formatNotificationAffectedPlants,
} from "../src/domain/notification-policy.ts";

const batch = (patch: Partial<GrobiggisSignal["affectedBatches"][number]> = {}) => ({
  batchId: "batch-a",
  plantId: "tomat",
  label: "Tomat · Sungold",
  ...patch,
});

const signal = (patch: Partial<GrobiggisSignal> = {}): GrobiggisSignal => ({
  id: "weather:frost:2026-08-12T18:00:2026-08-13T09:00",
  type: "frost",
  level: "important",
  title: "Frost väntas i natt",
  message: "Tomat kan behöva skyddas.",
  affectedBatches: [batch()],
  validFrom: "2026-08-12T18:00",
  validTo: "2026-08-13T09:00",
  action: { href: "/vader", label: "Se väderdetaljer" },
  ...patch,
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|md|json)$/.test(entry) ? [path] : [];
  });
}

test("frost policy is conservative but allows urgent and near attention signals", () => {
  const important = evaluateNotificationPolicy(signal({ level: "important" }), new Date("2026-08-12T10:00:00Z"));
  const attention = evaluateNotificationPolicy(signal({ level: "attention" }), new Date("2026-08-12T10:00:00Z"));
  const futureAttention = evaluateNotificationPolicy(signal({ level: "attention", validFrom: "2026-08-20T18:00", validTo: "2026-08-21T09:00" }), new Date("2026-08-12T10:00:00Z"));
  const info = evaluateNotificationPolicy(signal({ level: "info" }), new Date("2026-08-12T10:00:00Z"));

  assert.equal(important.eligible, true);
  if (important.eligible) assert.equal(important.candidate.urgency, "high");
  assert.equal(attention.eligible, true);
  if (attention.eligible) assert.equal(attention.candidate.urgency, "normal");
  assert.deepEqual(futureAttention, { eligible: false, reason: "type_policy" });
  assert.deepEqual(info, { eligible: false, reason: "level_too_low" });
});

test("watering and heat policy only promote important signals in Version 3.7", () => {
  const now = new Date("2026-08-12T10:00:00Z");
  const wateringImportant = evaluateNotificationPolicy(signal({ type: "watering", level: "important", id: "weather:watering:2026-08-12:2026-08-12:2026-08-13:2026-08-14", title: "Kontrollera jorden idag" }), now);
  const wateringAttention = evaluateNotificationPolicy(signal({ type: "watering", level: "attention", id: "weather:watering:attention" }), now);
  const wateringInfo = evaluateNotificationPolicy(signal({ type: "watering", level: "info", id: "weather:watering:info" }), now);
  const heatImportant = evaluateNotificationPolicy(signal({ type: "heat", level: "important", id: "weather:heat:2026-08-12:2026-08-13", title: "Mycket varmt för odlingen" }), now);
  const heatInfo = evaluateNotificationPolicy(signal({ type: "heat", level: "info", id: "weather:heat:info" }), now);

  assert.equal(wateringImportant.eligible, true);
  if (wateringImportant.eligible) {
    assert.equal(wateringImportant.candidate.urgency, "normal");
    assert.equal(wateringImportant.candidate.title, "Kontrollera jorden idag");
  }
  assert.deepEqual(wateringAttention, { eligible: false, reason: "type_policy" });
  assert.deepEqual(wateringInfo, { eligible: false, reason: "level_too_low" });
  assert.equal(heatImportant.eligible, true);
  if (heatImportant.eligible) {
    assert.equal(heatImportant.candidate.urgency, "normal");
    assert.equal(heatImportant.candidate.title, "Varm dag väntas");
  }
  assert.deepEqual(heatInfo, { eligible: false, reason: "level_too_low" });
});

test("expired signals are suppressed with Europe/Stockholm local time semantics", () => {
  const expired = evaluateNotificationPolicy(signal({ validFrom: "2026-08-12T18:00", validTo: "2026-08-13T09:00" }), new Date("2026-08-13T08:00:00Z"));
  const activeDateOnly = evaluateNotificationPolicy(signal({ type: "heat", id: "weather:heat:2026-08-13:2026-08-13", validFrom: "2026-08-13", validTo: "2026-08-13" }), new Date("2026-08-13T20:00:00Z"));

  assert.deepEqual(expired, { eligible: false, reason: "expired" });
  assert.equal(activeDateOnly.eligible, true);
});

test("candidate id and deduplication key are deterministic and allow escalation", () => {
  const attentionSignal = signal({ level: "attention" });
  const importantSignal = signal({ level: "important" });
  const first = evaluateNotificationPolicy(attentionSignal, new Date("2026-08-12T10:00:00Z"));
  const second = evaluateNotificationPolicy(attentionSignal, new Date("2026-08-12T10:00:00Z"));
  const escalated = evaluateNotificationPolicy(importantSignal, new Date("2026-08-12T10:00:00Z"));

  assert.equal(first.eligible, true);
  assert.equal(second.eligible, true);
  assert.equal(escalated.eligible, true);
  if (first.eligible && second.eligible && escalated.eligible) {
    assert.equal(first.candidate.id, second.candidate.id);
    assert.equal(first.candidate.deduplicationKey, second.candidate.deduplicationKey);
    assert.notEqual(first.candidate.deduplicationKey, escalated.candidate.deduplicationKey);
    assert.match(escalated.candidate.deduplicationKey, /important:high$/);
  }
});

test("candidate copy is short, natural Swedish and data-only", () => {
  const result = evaluateNotificationPolicy(
    signal({
      type: "frost",
      affectedBatches: [batch({ label: "Tomat" }), batch({ batchId: "basil", plantId: "basilika", label: "Basilika" })],
    }),
    new Date("2026-08-12T10:00:00Z"),
  );

  assert.equal(result.eligible, true);
  if (!result.eligible) return;
  const candidate = result.candidate;

  assert.equal(candidate.title, "Frost väntas i natt");
  assert.equal(candidate.body, "Tomat och Basilika kan behöva skyddas.");
  assert.equal(candidate.href, "/vader");
  assert.ok(candidate.title.length < 60);
  assert.ok(candidate.body.length < 120);
  assert.equal(Object.values(candidate).some((value) => typeof value === "function"), false);
  assert.doesNotMatch(JSON.stringify(candidate), /weather_code|temperature_2m|et0_fao_evapotranspiration|VAPID|subscription|serviceWorker|callback/i);
});

test("affected plant copy handles one, two, many, duplicates, variants and Swedish characters", () => {
  assert.equal(formatNotificationAffectedPlants([batch({ label: "Tomat" })]), "Tomat");
  assert.equal(formatNotificationAffectedPlants([batch({ label: "Tomat" }), batch({ batchId: "basil", plantId: "basilika", label: "Basilika" })]), "Tomat och Basilika");
  assert.equal(
    formatNotificationAffectedPlants([
      batch({ label: "Tomat · Sungold" }),
      batch({ batchId: "tomat-b", plantId: "tomat", label: "Tomat · Moneymaker" }),
      batch({ batchId: "basil-a", plantId: "basilika", label: "Basilika · Vanlig" }),
    ]),
    "Tomat · Sungold, Tomat · Moneymaker och Basilika · Vanlig",
  );
  assert.equal(
    formatNotificationAffectedPlants([
      batch({ label: "Chili · vanlig", plantId: "chili", batchId: "chili-a" }),
      batch({ label: "Basilika · Vanlig", plantId: "basilika", batchId: "basil-a" }),
      batch({ label: "Basilika · Vanlig", plantId: "basilika", batchId: "basil-b" }),
      batch({ label: "Sallat", plantId: "sallat", batchId: "sallat-a" }),
      batch({ label: "Gurka", plantId: "gurka", batchId: "gurka-a" }),
    ]),
    "Chili · vanlig, Basilika · Vanlig och 2 andra odlingar",
  );
  assert.equal(formatNotificationAffectedPlants([batch({ label: "Körsbärstomat · Röd" })]), "Körsbärstomat · Röd");
});

test("aggregator filters suppressed signals, removes duplicates and sorts high before normal", () => {
  const signals = [
    signal({ id: "weather:heat:2026-08-12:2026-08-13", type: "heat", level: "important", validFrom: "2026-08-12", validTo: "2026-08-13" }),
    signal({ id: "weather:frost:2026-08-12T18:00:2026-08-13T09:00", type: "frost", level: "important" }),
    signal({ id: "weather:watering:info", type: "watering", level: "info" }),
    signal({ id: "weather:heat:2026-08-12:2026-08-13", type: "heat", level: "important", validFrom: "2026-08-12", validTo: "2026-08-13" }),
  ];
  const first = buildNotificationCandidates(signals, new Date("2026-08-12T10:00:00Z"));
  const second = buildNotificationCandidates([...signals].reverse(), new Date("2026-08-12T10:00:00Z"));

  assert.deepEqual(
    first.map((candidate) => `${candidate.urgency}:${candidate.type}`),
    ["high:frost", "normal:heat"],
  );
  assert.equal(new Set(first.map((candidate) => candidate.id)).size, first.length);
  assert.deepEqual(
    first.map((candidate) => candidate.id),
    second.map((candidate) => candidate.id),
  );
});

test("notification policy stays separated from UI signals, assessments, providers, delivery and persistence", () => {
  const policy = readFileSync("src/domain/notification-policy.ts", "utf8");
  const server = readFileSync("src/lib/notifications/server.ts", "utf8");
  const todayPage = readFileSync("src/app/idag/page.tsx", "utf8");
  const serviceWorker = readFileSync("public/sw.js", "utf8");
  const source = `${policy}\n${server}`;

  assert.match(server, /getSignalsForUser/);
  assert.doesNotMatch(policy, /FrostAssessment|WaterAssessment|HeatAssessment|fetchWeatherForecast|Open-Meteo|weather_code|temperature_2m|et0_fao_evapotranspiration/);
  assert.doesNotMatch(todayPage, /NotificationCandidate|notification-policy|notifications\/server/);
  assert.doesNotMatch(source, /serviceWorker|PushManager|Notification\.requestPermission|VAPID|Queue|Cron|scheduled|send|INSERT|UPDATE|DELETE|db\./i);
  assert.match(serviceWorker, /skipWaiting/);
  assert.match(serviceWorker, /clients\.claim/);
  assert.doesNotMatch(serviceWorker, /showNotification|notificationclick|caches\.|fetch\(|PushManager|VAPID/i);

  for (const file of sourceFiles("public")) {
    if (file.endsWith("sw.js")) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /serviceWorker|PushManager|VAPID|push/i);
  }
});

test("SignalType is intentionally closed until future product signals are added", () => {
  const typeNames: SignalType[] = ["frost", "watering", "heat"];
  const levels: SignalLevel[] = ["info", "attention", "important"];

  assert.deepEqual(typeNames, ["frost", "watering", "heat"]);
  assert.deepEqual(levels, ["info", "attention", "important"]);
});
