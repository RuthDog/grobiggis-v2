import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { splitBatchesByStatus, listGrowingBatchesForUser } from "@/lib/growing/service";
import { listGrowingSpacesForUser } from "@/lib/growing/spaces";
import { getGrowingRepositoryForRequest, getGrowingSpaceRepositoryForRequest } from "@/lib/growing/server";
import { getNotificationCandidatesForUser } from "@/lib/notifications/server";
import {
  DrizzleNotificationDeliveryRepository,
  DrizzleNotificationPreferenceRepository,
  DrizzlePushSubscriptionRepository,
} from "@/repositories/notification-infrastructure-repository";
import {
  addPushSubscriptionForUser,
  ensurePushSubscriptionActiveForUser,
  getDeliverableNotificationCandidateForUser,
  getNotificationPreferencesForUser,
  revokePushSubscriptionEndpointForUser,
  saveNotificationPreferencesForUser,
  sendNotificationCandidateForUser,
  sendTestPushForUser,
} from "./service";
import { getPushVapidKeysForRequest } from "@/lib/push/server";
import { sendWebPushPayload } from "@/lib/push/sender";

async function getNotificationInfrastructureDbForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for notification infrastructure.");
  return createDb(env.DB);
}

export async function getNotificationPreferenceRepositoryForRequest() {
  return new DrizzleNotificationPreferenceRepository(await getNotificationInfrastructureDbForRequest());
}

export async function getPushSubscriptionRepositoryForRequest() {
  return new DrizzlePushSubscriptionRepository(await getNotificationInfrastructureDbForRequest());
}

export async function getNotificationDeliveryRepositoryForRequest() {
  return new DrizzleNotificationDeliveryRepository(await getNotificationInfrastructureDbForRequest());
}

export async function getCurrentUserNotificationPreferences() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getNotificationPreferencesForUser(await getNotificationPreferenceRepositoryForRequest(), user);
}

export async function saveCurrentUserNotificationPreferences(input: unknown) {
  const user = await requireUser();
  return saveNotificationPreferencesForUser(await getNotificationPreferenceRepositoryForRequest(), user, input);
}

export async function registerCurrentUserPushSubscription(input: unknown) {
  const user = await requireUser();
  return addPushSubscriptionForUser(await getPushSubscriptionRepositoryForRequest(), user, input);
}

export async function ensureCurrentUserPushSubscriptionActive(input: unknown) {
  const user = await requireUser();
  return ensurePushSubscriptionActiveForUser(await getPushSubscriptionRepositoryForRequest(), user, input);
}

export async function revokeCurrentUserPushSubscription(input: unknown) {
  const user = await requireUser();
  return revokePushSubscriptionEndpointForUser(await getPushSubscriptionRepositoryForRequest(), user, input);
}

export async function sendCurrentUserTestPush(input: unknown) {
  const user = await requireUser();
  return sendTestPushForUser(
    await getPushSubscriptionRepositoryForRequest(),
    user,
    input,
    sendWebPushPayload,
    await getPushVapidKeysForRequest(),
  );
}

async function getCurrentNotificationCandidates(user: { id: string }, now = new Date()) {
  const batches = await listGrowingBatchesForUser(await getGrowingRepositoryForRequest(), user);
  const spaces = await listGrowingSpacesForUser(await getGrowingSpaceRepositoryForRequest(), user);
  const { activeBatches } = splitBatchesByStatus(batches);
  return getNotificationCandidatesForUser(user, activeBatches, spaces, now);
}

export async function getCurrentUserNotificationCandidateDeliveryState() {
  const user = await getCurrentUser();
  if (!user) return null;
  const candidates = await getCurrentNotificationCandidates(user);
  return getDeliverableNotificationCandidateForUser(
    await getNotificationPreferenceRepositoryForRequest(),
    await getNotificationDeliveryRepositoryForRequest(),
    user,
    candidates,
  );
}

export async function sendCurrentUserNotificationCandidate(input: unknown) {
  const user = await requireUser();
  const candidates = await getCurrentNotificationCandidates(user);
  return sendNotificationCandidateForUser(
    {
      preferences: await getNotificationPreferenceRepositoryForRequest(),
      pushSubscriptions: await getPushSubscriptionRepositoryForRequest(),
      deliveries: await getNotificationDeliveryRepositoryForRequest(),
    },
    user,
    input,
    candidates,
    sendWebPushPayload,
    await getPushVapidKeysForRequest(),
  );
}
