import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { DrizzleUserProfileRepository } from "@/repositories/user-profile-repository";
import { searchOpenMeteoLocalities } from "@/services/geocoding/open-meteo";
import { getUserProfileForUser, saveUserProfileForUser } from "./service";

async function getUserProfileDbForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for profile persistence.");
  return createDb(env.DB);
}

export async function getUserProfileRepositoryForRequest() {
  return new DrizzleUserProfileRepository(await getUserProfileDbForRequest());
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getUserProfileForUser(await getUserProfileRepositoryForRequest(), user);
}

export async function saveCurrentUserProfile(input: unknown) {
  const user = await requireUser();
  return saveUserProfileForUser(await getUserProfileRepositoryForRequest(), user, input);
}

export async function searchCurrentUserProfileLocalities(locality: string) {
  await requireUser();
  return searchOpenMeteoLocalities(locality);
}
