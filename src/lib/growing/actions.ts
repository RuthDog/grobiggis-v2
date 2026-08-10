"use server";

import { revalidatePath } from "next/cache";
import { completeCurrentUserGrowingBatch, completeCurrentUserPlanActivity, createCurrentUserGrowingBatch } from "./server";
import { GrowingInputError } from "./validation";

export type GrowingActionResult =
  | { ok: true; batchId: string }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof GrowingInputError) return error.message;
  if (error instanceof Error && /Authentication required/i.test(error.message)) return "Du behöver logga in.";
  return fallback;
}

export async function createGrowingBatchAction(input: unknown): Promise<GrowingActionResult> {
  try {
    const batch = await createCurrentUserGrowingBatch(input);
    revalidatePath("/min-plan");
    revalidatePath("/vaxtbibliotek");
    return { ok: true, batchId: batch.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Odlingsomgången kunde inte sparas.") };
  }
}

export async function completeGrowingBatchAction(batchId: string): Promise<GrowingActionResult> {
  try {
    const batch = await completeCurrentUserGrowingBatch(batchId);
    if (!batch) return { ok: false, error: "Odlingsomgången kunde inte hittas." };
    revalidatePath("/min-plan");
    revalidatePath(`/min-plan/${batchId}`);
    return { ok: true, batchId: batch.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Odlingsomgången kunde inte sparas.") };
  }
}

export async function completePlanActivityAction(input: unknown): Promise<GrowingActionResult> {
  try {
    const batch = await completeCurrentUserPlanActivity(input);
    if (!batch) return { ok: false, error: "Odlingsomgangen kunde inte hittas." };
    revalidatePath("/idag");
    revalidatePath("/min-plan");
    revalidatePath(`/min-plan/${batch.id}`);
    return { ok: true, batchId: batch.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Aktiviteten kunde inte sparas.") };
  }
}
