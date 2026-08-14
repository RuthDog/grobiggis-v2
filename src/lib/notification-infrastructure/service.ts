import {
  assertNotificationUser,
  disabledNotificationPreferenceSettings,
  notificationDeliveryInputFromCandidate,
  notificationPreferencesToSettings,
  notificationSignalTypes,
  validateNotificationDeliveryLogInput,
  validatePushSubscriptionInput,
  validateSaveNotificationPreferencesInput,
  type NotificationPreferenceSettings,
} from "../../domain/notification-infrastructure.ts";
import type { NotificationCandidate } from "../../domain/notification-policy.ts";
import type {
  NotificationDeliveryRepository,
  NotificationPreferenceRepository,
  PushSubscriptionRepository,
} from "../../repositories/notification-infrastructure-repository.ts";

export async function getNotificationPreferencesForUser(
  repository: NotificationPreferenceRepository,
  user: { id: string } | null | undefined,
) {
  const userId = assertNotificationUser(user);
  return notificationPreferencesToSettings(await repository.listForUser(userId));
}

export async function saveNotificationPreferencesForUser(
  repository: NotificationPreferenceRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const settings = validateSaveNotificationPreferencesInput(input);
  const existing = new Map((await repository.listForUser(userId)).map((preference) => [preference.signalType, preference]));
  const timestamp = now.toISOString();

  await Promise.all(
    notificationSignalTypes.map((signalType) =>
      repository.upsertForUser(userId, {
        id: createId(),
        userId,
        signalType,
        enabled: settings[signalType],
        createdAt: existing.get(signalType)?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }),
    ),
  );

  return getNotificationPreferencesForUser(repository, user);
}

export async function addPushSubscriptionForUser(
  repository: PushSubscriptionRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const subscription = validatePushSubscriptionInput(input);
  const timestamp = now.toISOString();

  return repository.addOrRefreshForUser(userId, {
    id: createId(),
    userId,
    ...subscription,
    createdAt: timestamp,
    updatedAt: timestamp,
    revokedAt: null,
  });
}

export async function listActivePushSubscriptionsForUser(repository: PushSubscriptionRepository, user: { id: string } | null | undefined) {
  return repository.listActiveForUser(assertNotificationUser(user));
}

export async function revokePushSubscriptionForUser(
  repository: PushSubscriptionRepository,
  user: { id: string } | null | undefined,
  subscriptionId: unknown,
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  if (typeof subscriptionId !== "string" || !subscriptionId.trim()) return null;
  return repository.revokeForUser(userId, subscriptionId, now.toISOString());
}

export async function hasNotificationDeliveryForUser(
  repository: NotificationDeliveryRepository,
  user: { id: string } | null | undefined,
  deduplicationKey: string,
) {
  return repository.hasDeliveredForUser(assertNotificationUser(user), deduplicationKey);
}

export async function recordNotificationDeliveryForUser(
  repository: NotificationDeliveryRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const delivery = validateNotificationDeliveryLogInput(input);
  const timestamp = now.toISOString();

  return repository.recordDeliveredForUser(userId, {
    id: createId(),
    userId,
    ...delivery,
    subscriptionId: delivery.subscriptionId ?? null,
    deliveredAt: timestamp,
    createdAt: timestamp,
  });
}

export async function recordNotificationCandidateDeliveryForUser(
  repository: NotificationDeliveryRepository,
  user: { id: string } | null | undefined,
  candidate: NotificationCandidate,
  subscriptionId?: string | null,
  createId?: () => string,
  now?: Date,
) {
  return recordNotificationDeliveryForUser(repository, user, notificationDeliveryInputFromCandidate(candidate, subscriptionId), createId, now);
}

export function defaultNotificationPreferences(): NotificationPreferenceSettings {
  return disabledNotificationPreferenceSettings();
}
