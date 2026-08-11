import { and, eq } from "drizzle-orm";
import type { GrobiggisDb } from "@/db/client";
import { shoppingListItems, type ShoppingListItemRow } from "@/db/schema";
import type { ShoppingListItem } from "@/domain/shopping-list";

export interface ShoppingListRepository {
  addForUser(userId: string, item: ShoppingListItem): Promise<ShoppingListItem>;
  listForUser(userId: string): Promise<ShoppingListItem[]>;
  removeForUser(userId: string, itemId: string): Promise<ShoppingListItem | null>;
  hasPlantForUser(userId: string, plantId: string): Promise<boolean>;
}

function rowToShoppingListItem(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    userId: row.userId,
    plantId: row.plantId,
    createdAt: row.createdAt,
  };
}

function shoppingListItemToRow(item: ShoppingListItem) {
  return {
    id: item.id,
    userId: item.userId,
    plantId: item.plantId,
    createdAt: item.createdAt,
  };
}

export class DrizzleShoppingListRepository implements ShoppingListRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async addForUser(userId: string, item: ShoppingListItem) {
    const existing = await this.findByPlantForUser(userId, item.plantId);
    if (existing) return existing;

    const snapshot = { ...structuredClone(item), userId };

    try {
      await this.db.insert(shoppingListItems).values(shoppingListItemToRow(snapshot));
      return snapshot;
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        const duplicate = await this.findByPlantForUser(userId, item.plantId);
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async listForUser(userId: string) {
    const rows = await this.db.select().from(shoppingListItems).where(eq(shoppingListItems.userId, userId));
    return rows.map(rowToShoppingListItem).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async removeForUser(userId: string, itemId: string) {
    const [row] = await this.db
      .select()
      .from(shoppingListItems)
      .where(and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.id, itemId)))
      .limit(1);

    if (!row) return null;

    await this.db.delete(shoppingListItems).where(and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.id, itemId)));
    return rowToShoppingListItem(row);
  }

  async hasPlantForUser(userId: string, plantId: string) {
    return Boolean(await this.findByPlantForUser(userId, plantId));
  }

  private async findByPlantForUser(userId: string, plantId: string) {
    const [row] = await this.db
      .select()
      .from(shoppingListItems)
      .where(and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.plantId, plantId)))
      .limit(1);

    return row ? rowToShoppingListItem(row) : null;
  }
}
