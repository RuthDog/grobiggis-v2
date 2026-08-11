import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/db/client";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { DrizzleShoppingListRepository } from "@/repositories/shopping-list-repository";
import { addShoppingListItemForUser, getShoppingPlantIdsForUser, listShoppingListForUser, removeShoppingListItemForUser } from "./service";

async function getShoppingListDbForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for shopping list persistence.");
  return createDb(env.DB);
}

export async function getShoppingListRepositoryForRequest() {
  return new DrizzleShoppingListRepository(await getShoppingListDbForRequest());
}

export async function getCurrentUserShoppingList() {
  const user = await getCurrentUser();
  if (!user) return null;
  return listShoppingListForUser(await getShoppingListRepositoryForRequest(), user);
}

export async function getCurrentUserShoppingPlantIds() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  return getShoppingPlantIdsForUser(await getShoppingListRepositoryForRequest(), user);
}

export async function addCurrentUserShoppingListItem(input: unknown) {
  const user = await requireUser();
  return addShoppingListItemForUser(await getShoppingListRepositoryForRequest(), user, input);
}

export async function removeCurrentUserShoppingListItem(input: unknown) {
  const user = await requireUser();
  return removeShoppingListItemForUser(await getShoppingListRepositoryForRequest(), user, input);
}
