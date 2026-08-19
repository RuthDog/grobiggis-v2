import type { GrobiggisSignal, SignalAffectedBatch, SignalType } from "./signals.ts";

export type NotificationUrgency = "normal" | "high";
export type NotificationSuppressionReason = "expired" | "level_too_low" | "type_policy";

export interface NotificationCandidate {
  id: string;
  signalId: string;
  type: SignalType;
  urgency: NotificationUrgency;
  title: string;
  body: string;
  href: string;
  deduplicationKey: string;
  validFrom: string | null;
  validTo: string | null;
}

export type NotificationPolicyResult =
  | { eligible: true; candidate: NotificationCandidate }
  | { eligible: false; reason: NotificationSuppressionReason };

const DEFAULT_TIME_ZONE = "Europe/Stockholm";
const MINUTES_PER_DAY = 24 * 60;
const FROST_ATTENTION_NEAR_MINUTES = 36 * 60;
const urgencyOrder: Record<NotificationUrgency, number> = { high: 0, normal: 1 };

function localParts(now: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function daySerial(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function localMinuteSerial(year: number, month: number, day: number, hour: number, minute = 0) {
  return daySerial(year, month, day) * MINUTES_PER_DAY + hour * 60 + minute;
}

function nowLocalMinuteSerial(now: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = localParts(now, timeZone);
  return localMinuteSerial(parts.year, parts.month, parts.day, parts.hour, parts.minute);
}

function parseSignalTime(value: string, boundary: "start" | "end") {
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (dateTime) {
    const [, year, month, day, hour, minute] = dateTime;
    return localMinuteSerial(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return null;
  const [, year, month, day] = dateOnly;
  return localMinuteSerial(Number(year), Number(month), Number(day), boundary === "start" ? 0 : 23, boundary === "start" ? 0 : 59);
}

function hasExpired(signal: GrobiggisSignal, now: Date) {
  if (!signal.validTo) return false;
  const validTo = parseSignalTime(signal.validTo, "end");
  if (validTo === null) return false;
  return validTo < nowLocalMinuteSerial(now);
}

function startsNearNow(signal: GrobiggisSignal, now: Date, maxMinutes: number) {
  if (!signal.validFrom) return false;
  const validFrom = parseSignalTime(signal.validFrom, "start");
  if (validFrom === null) return false;
  const current = nowLocalMinuteSerial(now);
  return validFrom <= current + maxMinutes;
}

function notificationState(signal: GrobiggisSignal, urgency: NotificationUrgency) {
  return `${signal.level}:${urgency}`;
}

function deduplicationKey(signal: GrobiggisSignal, urgency: NotificationUrgency) {
  return `${signal.id}:${notificationState(signal, urgency)}`;
}

function uniqueAffectedLabels(batches: SignalAffectedBatch[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const batch of batches) {
    const label = batch.label.trim().replace(/\s+/g, " ");
    const key = `${batch.plantId}:${label.toLocaleLowerCase("sv-SE")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}

export function formatNotificationAffectedPlants(batches: SignalAffectedBatch[]) {
  const labels = uniqueAffectedLabels(batches);
  if (labels.length === 0) return "Dina odlingar";
  if (labels.length <= 3) return new Intl.ListFormat("sv-SE", { style: "long", type: "conjunction" }).format(labels);
  return `${labels.slice(0, 2).join(", ")} och ${labels.length - 2} andra odlingar`;
}

function titleFor(signal: GrobiggisSignal) {
  if (signal.type === "heat") return "Varm dag väntas";
  return signal.title;
}

function bodyFor(signal: GrobiggisSignal) {
  const plants = formatNotificationAffectedPlants(signal.affectedBatches);
  if (signal.type === "frost") return `${plants} kan behöva skyddas.`;
  if (signal.type === "watering") return `${plants} kan behöva ses över efter torra dagar.`;
  return `${plants} kan behöva extra tillsyn i värmen.`;
}

function candidateFor(signal: GrobiggisSignal, urgency: NotificationUrgency): NotificationCandidate {
  const key = deduplicationKey(signal, urgency);
  return {
    id: `notification:${key}`,
    signalId: signal.id,
    type: signal.type,
    urgency,
    title: titleFor(signal),
    body: bodyFor(signal),
    href: signal.action?.href ?? "/",
    deduplicationKey: key,
    validFrom: signal.validFrom,
    validTo: signal.validTo,
  };
}

function urgencyForSignal(signal: GrobiggisSignal, now: Date): NotificationUrgency | null {
  if (signal.level === "info") return null;

  if (signal.type === "frost") {
    if (signal.level === "important") return "high";
    if (signal.level === "attention" && startsNearNow(signal, now, FROST_ATTENTION_NEAR_MINUTES)) return "normal";
    return null;
  }

  if (signal.type === "watering") {
    return signal.level === "important" ? "normal" : null;
  }

  if (signal.type === "heat") {
    return signal.level === "important" ? "normal" : null;
  }

  return null;
}

export function evaluateNotificationPolicy(signal: GrobiggisSignal, now = new Date()): NotificationPolicyResult {
  if (hasExpired(signal, now)) return { eligible: false, reason: "expired" };
  if (signal.level === "info") return { eligible: false, reason: "level_too_low" };

  const urgency = urgencyForSignal(signal, now);
  if (!urgency) return { eligible: false, reason: "type_policy" };

  return { eligible: true, candidate: candidateFor(signal, urgency) };
}

function candidateSortTime(candidate: NotificationCandidate) {
  if (!candidate.validFrom) return Number.MAX_SAFE_INTEGER;
  return parseSignalTime(candidate.validFrom, "start") ?? Number.MAX_SAFE_INTEGER;
}

export function hasNotificationCandidateExpired(candidate: NotificationCandidate, now = new Date()) {
  if (!candidate.validTo) return false;
  const validTo = parseSignalTime(candidate.validTo, "end");
  if (validTo === null) return false;
  return validTo < nowLocalMinuteSerial(now);
}

export function sortNotificationCandidates(candidates: NotificationCandidate[]) {
  return [...candidates].sort((left, right) => {
    const urgencyDiff = urgencyOrder[left.urgency] - urgencyOrder[right.urgency];
    if (urgencyDiff) return urgencyDiff;
    const timeDiff = candidateSortTime(left) - candidateSortTime(right);
    if (timeDiff) return timeDiff;
    return left.deduplicationKey.localeCompare(right.deduplicationKey, "sv-SE");
  });
}

export function buildNotificationCandidates(signals: GrobiggisSignal[], now = new Date()): NotificationCandidate[] {
  const candidates = signals.flatMap((signal) => {
    const result = evaluateNotificationPolicy(signal, now);
    return result.eligible ? [result.candidate] : [];
  });

  return sortNotificationCandidates([...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()]);
}
