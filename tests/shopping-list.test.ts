import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plants } from "../src/data/plants.ts";
import {
  mapShoppingListItems,
  ShoppingListInputError,
  shoppingPlantIds,
  validateAddShoppingListInput,
  validateShoppingPlantId,
} from "../src/domain/shopping-list.ts";
import {
  addShoppingListItemForUser,
  getShoppingPlantIdsForUser,
  listShoppingListForUser,
  removeShoppingListItemForUser,
} from "../src/lib/shopping-list/service.ts";
import type { ShoppingListItem } from "../src/domain/shopping-list.ts";
import type { ShoppingListRepository } from "../src/repositories/shopping-list-repository.ts";

class MemoryShoppingListRepository implements ShoppingListRepository {
  readonly rows = new Map<string, ShoppingListItem>();

  async addForUser(userId: string, item: ShoppingListItem) {
    const duplicate = [...this.rows.values()].find((row) => row.userId === userId && row.plantId === item.plantId);
    if (duplicate) return structuredClone(duplicate);
    const snapshot = { ...structuredClone(item), userId };
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }

  async listForUser(userId: string) {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .map((row) => structuredClone(row))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async removeForUser(userId: string, itemId: string) {
    const row = this.rows.get(itemId);
    if (!row || row.userId !== userId) return null;
    this.rows.delete(itemId);
    return structuredClone(row);
  }

  async hasPlantForUser(userId: string, plantId: string) {
    return [...this.rows.values()].some((row) => row.userId === userId && row.plantId === plantId);
  }
}

const userA = { id: "user-a" };
const userB = { id: "user-b" };
const read = (path: string) => readFileSync(path, "utf8");

test("shopping list uses stable plantId references", async () => {
  const repository = new MemoryShoppingListRepository();
  const item = await addShoppingListItemForUser(
    repository,
    userA,
    { plantId: "tomat" },
    () => "item-a",
    new Date("2026-08-11T08:00:00Z"),
  );

  assert.equal(item.plantId, "tomat");
  assert.equal(plants.some((plant) => plant.id === item.plantId), true);
});

test("valid plantId is accepted and invalid plantId is rejected", () => {
  assert.equal(validateShoppingPlantId("tomat").id, "tomat");
  assert.throws(() => validateShoppingPlantId("okand-plant"), /Växten kunde inte hittas/);
});

test("add requires a verified user", async () => {
  const repository = new MemoryShoppingListRepository();
  await assert.rejects(() => addShoppingListItemForUser(repository, { id: "" }, { plantId: "tomat" }), /Authentication required/i);
});

test("client-owned fields are rejected", () => {
  assert.throws(() => validateAddShoppingListInput({ plantId: "tomat", userId: "client" }), ShoppingListInputError);
  assert.throws(() => validateAddShoppingListInput({ plantId: "tomat", id: "client-item" }), ShoppingListInputError);
  assert.throws(() => validateAddShoppingListInput({ plantId: "tomat", createdAt: "2026-08-11T08:00:00Z" }), ShoppingListInputError);
  assert.throws(() => validateAddShoppingListInput({ plantId: "tomat", plantName: "Tomat" }), ShoppingListInputError);
});

test("session user id is used for created item", async () => {
  const repository = new MemoryShoppingListRepository();
  const item = await addShoppingListItemForUser(
    repository,
    userA,
    { plantId: "tomat" },
    () => "item-a",
    new Date("2026-08-11T08:00:00Z"),
  );

  assert.equal(item.userId, userA.id);
  assert.equal(repository.rows.get("item-a")?.userId, userA.id);
});

test("listForUser isolates users and both users can save the same plant", async () => {
  const repository = new MemoryShoppingListRepository();
  const aTomat = await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-a", new Date("2026-08-11T08:00:00Z"));
  const bTomat = await addShoppingListItemForUser(repository, userB, { plantId: "tomat" }, () => "item-b", new Date("2026-08-11T08:01:00Z"));

  assert.deepEqual((await listShoppingListForUser(repository, userA)).map((item) => item.itemId), ["item-a"]);
  assert.deepEqual((await listShoppingListForUser(repository, userB)).map((item) => item.itemId), ["item-b"]);
  assert.equal(aTomat.plantId, bTomat.plantId);
});

test("duplicate add is idempotent for the same user and plant", async () => {
  const repository = new MemoryShoppingListRepository();
  const first = await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-a", new Date("2026-08-11T08:00:00Z"));
  const second = await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-b", new Date("2026-08-11T08:01:00Z"));

  assert.equal(first.id, second.id);
  assert.equal(repository.rows.size, 1);
});

test("item survives repository round-trip and exposes plant metadata", async () => {
  const repository = new MemoryShoppingListRepository();
  await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-a", new Date("2026-08-11T08:00:00Z"));
  const [item] = await listShoppingListForUser(repository, userA);

  assert.equal(item.plant?.name, "Tomat");
  assert.equal(item.userId, userA.id);
});

test("unknown plant references from DB are handled in a controlled way", () => {
  const [item] = mapShoppingListItems([{ id: "item-x", userId: userA.id, plantId: "future-plant", createdAt: "2026-08-11T08:00:00Z" }]);
  assert.equal(item.plant, undefined);
});

test("remove only deletes the shopping item and user A cannot remove user B item", async () => {
  const repository = new MemoryShoppingListRepository();
  await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-a", new Date("2026-08-11T08:00:00Z"));
  await addShoppingListItemForUser(repository, userB, { plantId: "basilika" }, () => "item-b", new Date("2026-08-11T08:01:00Z"));

  assert.equal(await removeShoppingListItemForUser(repository, userA, { itemId: "item-b" }), null);
  const removed = await removeShoppingListItemForUser(repository, userA, { itemId: "item-a" });

  assert.equal(removed?.id, "item-a");
  assert.equal(repository.rows.has("item-a"), false);
  assert.equal(repository.rows.has("item-b"), true);
});

test("shopping plant id helper is catalog-size agnostic", async () => {
  const repository = new MemoryShoppingListRepository();
  await addShoppingListItemForUser(repository, userA, { plantId: "tomat" }, () => "item-a", new Date("2026-08-11T08:00:00Z"));
  await addShoppingListItemForUser(repository, userA, { plantId: "basilika" }, () => "item-b", new Date("2026-08-11T08:01:00Z"));

  const ids = shoppingPlantIds([...repository.rows.values()]);
  const scoped = await getShoppingPlantIdsForUser(repository, userA);

  assert.equal(ids.has("tomat"), true);
  assert.equal(scoped.has("basilika"), true);
  assert.doesNotMatch(read("src/domain/shopping-list.ts"), /\b27\b/);
});

test("shopping list UI is auth-backed, has empty state, and uses no browser storage", () => {
  const page = read("src/app/inkopslista/page.tsx");
  const library = read("src/app/vaxtbibliotek/PlantLibrary.tsx");
  const addButton = read("src/components/AddToShoppingListButton.tsx");
  const actions = read("src/lib/shopping-list/actions.ts");
  const server = read("src/lib/shopping-list/server.ts");
  const shell = read("src/components/AppShell.tsx");

  assert.match(page, /Du behöver logga in/);
  assert.match(page, /Din inköpslista är tom\./);
  assert.match(page, /Utforska Växtbiblioteket/);
  assert.match(addButton, /På inköpslistan/);
  assert.match(addButton, /Logga in för inköpslista/);
  assert.match(actions, /revalidatePath\("\/vaxtbibliotek"\)/);
  assert.match(actions, /revalidatePath\("\/inkopslista"\)/);
  assert.match(server, /requireUser\(\)/);
  assert.match(shell, /href: "\/inkopslista"/);
  assert.doesNotMatch(`${page}\n${library}\n${addButton}`, /localStorage|sessionStorage|indexedDB/);
});
