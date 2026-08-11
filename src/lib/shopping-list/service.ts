import type { CatalogPlant } from "../../data/plant-types.ts";
import { plants } from "../../data/plants.ts";
import {
  assertShoppingListUser,
  mapShoppingListItems,
  validateAddShoppingListInput,
  validateRemoveShoppingListInput,
} from "../../domain/shopping-list.ts";
import type { ShoppingListRepository } from "../../repositories/shopping-list-repository.ts";

export async function addShoppingListItemForUser(
  repository: ShoppingListRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
  catalog: CatalogPlant[] = plants,
) {
  const userId = assertShoppingListUser(user);
  const { plantId } = validateAddShoppingListInput(input, catalog);
  return repository.addForUser(userId, {
    id: createId(),
    userId,
    plantId,
    createdAt: now.toISOString(),
  });
}

export async function listShoppingListForUser(
  repository: ShoppingListRepository,
  user: { id: string } | null | undefined,
  catalog: CatalogPlant[] = plants,
) {
  const userId = assertShoppingListUser(user);
  return mapShoppingListItems(await repository.listForUser(userId), catalog);
}

export async function getShoppingPlantIdsForUser(repository: ShoppingListRepository, user: { id: string } | null | undefined) {
  const userId = assertShoppingListUser(user);
  return new Set((await repository.listForUser(userId)).map((item) => item.plantId));
}

export async function removeShoppingListItemForUser(repository: ShoppingListRepository, user: { id: string } | null | undefined, input: unknown) {
  const userId = assertShoppingListUser(user);
  const { itemId } = validateRemoveShoppingListInput(input);
  return repository.removeForUser(userId, itemId);
}
