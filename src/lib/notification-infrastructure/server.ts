import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import {
  DrizzleNotificationDeliveryRepository,
  DrizzleNotificationPreferenceRepository,
  DrizzlePushSubscriptionRepository,
} from "@/repositories/notification-infrastructure-repository";
import { getNotificationPreferencesForUser, saveNotificationPreferencesForUser } from "./service";

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
