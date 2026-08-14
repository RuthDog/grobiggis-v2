import type { NotificationCandidate, NotificationUrgency } from "./notification-policy.ts";
import type { SignalType } from "./signals.ts";

export const notificationSignalTypes = ["frost", "watering", "heat"] as const satisfies SignalType[];
export type NotificationPreferenceSettings = Record<SignalType, boolean>;

export class NotificationInfrastructureInputError extends Error {}

export interface NotificationPreference {
  id: string;
  userId: string;
  signalType: SignalType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export interface NotificationDeliveryLogEntry {
  id: string;
  userId: string;
  candidateId: string;
  signalId: string;
  deduplicationKey: string;
  signalType: SignalType;
  urgency: NotificationUrgency;
  subscriptionId: string | null;
  deliveredAt: string;
  createdAt: string;
}

export type NewPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NewNotificationDeliveryLogInput = {
  candidateId: string;
  signalId: string;
  deduplicationKey: string;
  signalType: SignalType;
  urgency: NotificationUrgency;
  subscriptionId?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectServerOwnedFields(input: Record<string, unknown>, fields: string[], message: string) {
  for (const field of fields) {
    if (field in input) throw new NotificationInfrastructureInputError(message);
  }
}

function validateRequiredString(value: unknown, message: string, maxLength = 500) {
  if (typeof value !== "string") throw new NotificationInfrastructureInputError(message);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) throw new NotificationInfrastructureInputError(message);
  return trimmed;
}

export function assertNotificationUser(user: { id: string } | null | undefined) {
  if (!user?.id) throw new Error("Authentication required.");
  return user.id;
}

export function isNotificationSignalType(value: unknown): value is SignalType {
  return typeof value === "string" && (notificationSignalTypes as readonly string[]).includes(value);
}

export function validateNotificationSignalType(value: unknown): SignalType {
  if (!isNotificationSignalType(value)) throw new NotificationInfrastructureInputError("Notistypen stöds inte.");
  return value;
}

export function disabledNotificationPreferenceSettings(): NotificationPreferenceSettings {
  return { frost: false, watering: false, heat: false };
}

export function notificationPreferencesToSettings(preferences: NotificationPreference[]): NotificationPreferenceSettings {
  const settings = disabledNotificationPreferenceSettings();

  for (const preference of preferences) {
    settings[validateNotificationSignalType(preference.signalType)] = preference.enabled;
  }

  return settings;
}

export function validateSaveNotificationPreferencesInput(input: unknown): NotificationPreferenceSettings {
  if (!isRecord(input)) throw new NotificationInfrastructureInputError("Notisinställningarna kunde inte sparas.");

  rejectServerOwnedFields(input, ["id", "userId", "createdAt", "updatedAt", "browserPermission", "endpoint", "p256dh", "auth"], "Notisinställningarna kunde inte sparas.");

  const allowedKeys = new Set<string>(notificationSignalTypes);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) throw new NotificationInfrastructureInputError("Notistypen stöds inte.");
  }

  return {
    frost: input.frost === true,
    watering: input.watering === true,
    heat: input.heat === true,
  };
}

export function validateNotificationPreferencePatch(input: unknown) {
  if (!isRecord(input)) throw new NotificationInfrastructureInputError("Notisinställningen kunde inte sparas.");
  rejectServerOwnedFields(input, ["id", "userId", "createdAt", "updatedAt"], "Notisinställningen kunde inte sparas.");

  return {
    signalType: validateNotificationSignalType(input.signalType),
    enabled: input.enabled === true,
  };
}

export function validatePushSubscriptionInput(input: unknown): NewPushSubscriptionInput {
  if (!isRecord(input)) throw new NotificationInfrastructureInputError("Push-prenumerationen kunde inte sparas.");
  rejectServerOwnedFields(input, ["id", "userId", "createdAt", "updatedAt", "revokedAt"], "Push-prenumerationen kunde inte sparas.");

  const endpoint = validateRequiredString(input.endpoint, "Push-endpoint saknas.", 2048);
  if (!/^https:\/\//i.test(endpoint)) throw new NotificationInfrastructureInputError("Push-endpoint måste vara HTTPS.");

  return {
    endpoint,
    p256dh: validateRequiredString(input.p256dh, "Push-nyckeln saknas.", 512),
    auth: validateRequiredString(input.auth, "Push-auth saknas.", 512),
  };
}

export function notificationDeliveryInputFromCandidate(candidate: NotificationCandidate, subscriptionId?: string | null): NewNotificationDeliveryLogInput {
  return {
    candidateId: candidate.id,
    signalId: candidate.signalId,
    deduplicationKey: candidate.deduplicationKey,
    signalType: candidate.type,
    urgency: candidate.urgency,
    subscriptionId: subscriptionId ?? null,
  };
}

export function validateNotificationDeliveryLogInput(input: unknown): NewNotificationDeliveryLogInput {
  if (!isRecord(input)) throw new NotificationInfrastructureInputError("Leveransstatusen kunde inte sparas.");
  rejectServerOwnedFields(input, ["id", "userId", "deliveredAt", "createdAt", "status"], "Leveransstatusen kunde inte sparas.");

  const urgency = input.urgency;
  if (urgency !== "normal" && urgency !== "high") throw new NotificationInfrastructureInputError("Notisens prioritet stöds inte.");

  return {
    candidateId: validateRequiredString(input.candidateId, "Notiskandidaten saknas.", 500),
    signalId: validateRequiredString(input.signalId, "Signalen saknas.", 500),
    deduplicationKey: validateRequiredString(input.deduplicationKey, "Dedupliceringsnyckeln saknas.", 500),
    signalType: validateNotificationSignalType(input.signalType),
    urgency,
    subscriptionId: input.subscriptionId === null || input.subscriptionId === undefined ? null : validateRequiredString(input.subscriptionId, "Push-prenumerationen saknas.", 500),
  };
}
