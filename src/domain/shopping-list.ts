import { plants } from "../data/plants.ts";
import type { CatalogPlant } from "../data/plant-types.ts";

export interface ShoppingListItem {
  id: string;
  userId: string;
  plantId: string;
  createdAt: string;
}

export interface ShoppingListPlant {
  itemId: string;
  userId: string;
  plantId: string;
  createdAt: string;
  plant?: CatalogPlant;
}

export class ShoppingListInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShoppingListInputError";
  }
}

export function assertShoppingListUser(user: { id: string } | null | undefined) {
  if (!user?.id) throw new Error("Authentication required.");
  return user.id;
}

export function validateShoppingPlantId(plantId: unknown, catalog: CatalogPlant[] = plants) {
  if (typeof plantId !== "string") {
    throw new ShoppingListInputError("Växten kunde inte hittas.");
  }

  const normalizedPlantId = plantId.trim();
  if (!normalizedPlantId) {
    throw new ShoppingListInputError("Växten kunde inte hittas.");
  }

  const plant = catalog.find((entry) => entry.id === normalizedPlantId);
  if (!plant) {
    throw new ShoppingListInputError("Växten kunde inte hittas.");
  }

  return plant;
}

export function validateAddShoppingListInput(input: unknown, catalog: CatalogPlant[] = plants) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ShoppingListInputError("Växten kunde inte hittas.");
  }

  const record = input as Record<string, unknown>;
  if ("userId" in record || "id" in record || "createdAt" in record || "plantName" in record) {
    throw new ShoppingListInputError("Bara växten kan skickas från klienten.");
  }

  const plant = validateShoppingPlantId(record.plantId, catalog);
  return { plantId: plant.id };
}

export function validateRemoveShoppingListInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ShoppingListInputError("Listposten kunde inte hittas.");
  }

  const record = input as Record<string, unknown>;
  if ("userId" in record || "plantId" in record || "createdAt" in record) {
    throw new ShoppingListInputError("Endast listpostens id får skickas.");
  }

  if (typeof record.itemId !== "string" || !record.itemId.trim()) {
    throw new ShoppingListInputError("Listposten kunde inte hittas.");
  }

  return { itemId: record.itemId.trim() };
}

export function mapShoppingListItems(items: ShoppingListItem[], catalog: CatalogPlant[] = plants): ShoppingListPlant[] {
  return items.map((item) => ({
    itemId: item.id,
    userId: item.userId,
    plantId: item.plantId,
    createdAt: item.createdAt,
    plant: catalog.find((plant) => plant.id === item.plantId),
  }));
}

export function shoppingPlantIds(items: ShoppingListItem[]) {
  return new Set(items.map((item) => item.plantId));
}
