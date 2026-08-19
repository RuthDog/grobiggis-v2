import {
  assertNotificationUser,
  disabledNotificationPreferenceSettings,
  notificationDeliveryInputFromCandidate,
  notificationPreferencesToSettings,
  notificationSignalTypes,
  PushSubscriptionOwnershipConflictError,
  validateRevokePushSubscriptionInput,
  validateNotificationDeliveryLogInput,
  validatePushSubscriptionInput,
  validateSaveNotificationPreferencesInput,
  type NotificationPreferenceSettings,
} from "../../domain/notification-infrastructure.ts";
import type { NotificationCandidate } from "../../domain/notification-policy.ts";
import { pushNotificationPayloadFromCandidate, testPushNotificationPayload } from "../push/payload.ts";
import type { PushSender } from "../push/sender.ts";
import { selectDeliverableNotificationCandidate } from "./candidate-selection.ts";
import type { NotificationCandidatePreview } from "./candidate-delivery-types.ts";
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

  try {
    return await repository.addOrRefreshForUser(userId, {
      id: createId(),
      userId,
      ...subscription,
      createdAt: timestamp,
      updatedAt: timestamp,
      revokedAt: null,
    });
  } catch (error) {
    if (error instanceof Error && /already belongs to another user/i.test(error.message)) {
      throw new PushSubscriptionOwnershipConflictError("Push-prenumerationen tillhör redan en annan användare.");
    }
    throw error;
  }
}

export async function ensurePushSubscriptionActiveForUser(
  repository: PushSubscriptionRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const subscription = validatePushSubscriptionInput(input);
  const status = await repository.endpointStatusForUser(userId, subscription.endpoint);

  if (status === "active") {
    return { status: "active" as const };
  }

  if (status === "owned_by_other") {
    throw new PushSubscriptionOwnershipConflictError("Push-prenumerationen tillhÃ¶r redan en annan anvÃ¤ndare.");
  }

  await addPushSubscriptionForUser(repository, user, subscription, createId, now);
  return { status: status === "same_user_revoked" ? "reactivated" as const : "registered" as const };
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

export async function revokePushSubscriptionEndpointForUser(
  repository: PushSubscriptionRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const { endpoint } = validateRevokePushSubscriptionInput(input);
  return repository.revokeByEndpointForUser(userId, endpoint, now.toISOString());
}

export async function sendTestPushForUser(
  repository: PushSubscriptionRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  sendPush: PushSender,
  vapid: { subject: string; publicKey: string; privateKey: string },
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const { endpoint } = validateRevokePushSubscriptionInput(input);
  const subscription = await repository.getActiveByEndpointForUser(userId, endpoint);

  if (!subscription) {
    return { status: "subscription_invalid" as const };
  }

  const result = await sendPush(subscription, testPushNotificationPayload, vapid);
  if (result.ok) return { status: "sent" as const };

  if (result.status === "subscription_invalid") {
    await repository.revokeByEndpointForUser(userId, endpoint, now.toISOString());
    return { status: "subscription_invalid" as const };
  }

  return { status: "failed" as const };
}

export async function getDeliverableNotificationCandidateForUser(
  preferenceRepository: NotificationPreferenceRepository,
  deliveryRepository: NotificationDeliveryRepository,
  user: { id: string } | null | undefined,
  candidates: NotificationCandidate[],
  now: Date = new Date(),
): Promise<NotificationCandidatePreview> {
  const userId = assertNotificationUser(user);
  const preferences = notificationPreferencesToSettings(await preferenceRepository.listForUser(userId));
  const deliveredKeys = new Set<string>();

  await Promise.all(
    candidates.map(async (candidate) => {
      if (await deliveryRepository.hasDeliveredForUser(userId, candidate.deduplicationKey)) {
        deliveredKeys.add(candidate.deduplicationKey);
      }
    }),
  );

  const selection = selectDeliverableNotificationCandidate({ candidates, preferences, deliveredKeys, now });
  if (selection.status !== "selected") return selection;

  const { type, urgency, title, body, href } = selection.candidate;
  return { status: "available", candidate: { type, urgency, title, body, href } };
}

export async function sendNotificationCandidateForUser(
  repositories: {
    preferences: NotificationPreferenceRepository;
    pushSubscriptions: PushSubscriptionRepository;
    deliveries: NotificationDeliveryRepository;
  },
  user: { id: string } | null | undefined,
  input: unknown,
  candidates: NotificationCandidate[],
  sendPush: PushSender,
  vapid: { subject: string; publicKey: string; privateKey: string },
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertNotificationUser(user);
  const { endpoint } = validateRevokePushSubscriptionInput(input);
  const subscription = await repositories.pushSubscriptions.getActiveByEndpointForUser(userId, endpoint);
  if (!subscription) return { status: "subscription_invalid" as const };

  const preferences = notificationPreferencesToSettings(await repositories.preferences.listForUser(userId));
  const deliveredKeys = new Set<string>();

  await Promise.all(
    candidates.map(async (candidate) => {
      if (await repositories.deliveries.hasDeliveredForUser(userId, candidate.deduplicationKey)) {
        deliveredKeys.add(candidate.deduplicationKey);
      }
    }),
  );

  const selection = selectDeliverableNotificationCandidate({ candidates, preferences, deliveredKeys, now });
  if (selection.status !== "selected") return selection;

  const candidate = selection.candidate;
  const result = await sendPush(subscription, pushNotificationPayloadFromCandidate(candidate), vapid);
  if (!result.ok) {
    if (result.status === "subscription_invalid") {
      await repositories.pushSubscriptions.revokeByEndpointForUser(userId, endpoint, now.toISOString());
      return { status: "subscription_invalid" as const };
    }

    return { status: "failed" as const };
  }

  try {
    await recordNotificationCandidateDeliveryForUser(repositories.deliveries, user, candidate, subscription.id, createId, now);
    return { status: "sent" as const };
  } catch {
    return { status: "partial_success" as const };
  }
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
