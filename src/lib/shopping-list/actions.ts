"use server";

import { revalidatePath } from "next/cache";
import { ShoppingListInputError } from "@/domain/shopping-list";
import { addCurrentUserShoppingListItem, removeCurrentUserShoppingListItem } from "./server";

export type ShoppingListActionResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof ShoppingListInputError) return error.message;
  if (error instanceof Error && /Authentication required/i.test(error.message)) return "Du behöver logga in.";
  return fallback;
}

export async function addShoppingListItemAction(input: unknown): Promise<ShoppingListActionResult> {
  try {
    const item = await addCurrentUserShoppingListItem(input);
    revalidatePath("/vaxtbibliotek");
    revalidatePath("/inkopslista");
    return { ok: true, itemId: item.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Växten kunde inte läggas till på inköpslistan.") };
  }
}

export async function removeShoppingListItemAction(input: unknown): Promise<ShoppingListActionResult> {
  try {
    const item = await removeCurrentUserShoppingListItem(input);
    if (!item) return { ok: false, error: "Listposten kunde inte hittas." };
    revalidatePath("/vaxtbibliotek");
    revalidatePath("/inkopslista");
    return { ok: true, itemId: item.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Det gick inte att ta bort växten från inköpslistan.") };
  }
}
