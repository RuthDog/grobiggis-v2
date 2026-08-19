import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import {
  DrizzleNotificationDeliveryRepository,
  DrizzleNotificationPreferenceRepository,
  DrizzlePushSubscriptionRepository,
} from "@/repositories/notification-infrastructure-repository";
import {
  addPushSubscriptionForUser,
  ensurePushSubscriptionActiveForUser,
  getNotificationPreferencesForUser,
  revokePushSubscriptionEndpointForUser,
  saveNotificationPreferencesForUser,
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
