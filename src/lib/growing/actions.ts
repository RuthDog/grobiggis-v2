"use server";

import { revalidatePath } from "next/cache";
import { GrowingSpaceInputError } from "@/domain/growing-spaces";
import { PlantPlacementConflictError } from "@/repositories/growing-space-repository";
import {
  completeCurrentUserGrowingBatch,
  completeCurrentUserPlanActivity,
  createCurrentUserGrowingBatch,
  createCurrentUserGrowingSpace,
  placeCurrentUserBatchInSpace,
  releaseCurrentUserPlantPlacement,
} from "./server";
import { GrowingInputError } from "./validation";

export type GrowingActionResult =
  | { ok: true; batchId: string }
  | { ok: false; error: string };

export type GrowingSpaceActionResult =
  | { ok: true; spaceId: string }
  | { ok: false; error: string };

export type PlantPlacementActionResult =
  | { ok: true; placementId: string }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof GrowingInputError) return error.message;
  if (error instanceof GrowingSpaceInputError) return error.message;
  if (error instanceof PlantPlacementConflictError) return "Den här odlingen är redan placerad.";
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
    revalidatePath("/mina-odlingar");
    return { ok: true, batchId: batch.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Odlingsomgången kunde inte sparas.") };
  }
}

export async function completePlanActivityAction(input: unknown): Promise<GrowingActionResult> {
  try {
    const batch = await completeCurrentUserPlanActivity(input);
    if (!batch) return { ok: false, error: "Odlingsomgången kunde inte hittas." };
    revalidatePath("/idag");
    revalidatePath("/min-plan");
    revalidatePath(`/min-plan/${batch.id}`);
    return { ok: true, batchId: batch.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Aktiviteten kunde inte sparas.") };
  }
}

export async function createGrowingSpaceAction(input: unknown): Promise<GrowingSpaceActionResult> {
  try {
    const space = await createCurrentUserGrowingSpace(input);
    revalidatePath("/mina-odlingar");
    return { ok: true, spaceId: space.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Det gick inte att skapa odlingsytan.") };
  }
}

export async function placeBatchInSpaceAction(input: unknown): Promise<PlantPlacementActionResult> {
  try {
    const placement = await placeCurrentUserBatchInSpace(input);
    if (!placement) return { ok: false, error: "Odlingsytan eller odlingen kunde inte hittas." };
    revalidatePath("/mina-odlingar");
    revalidatePath("/min-plan");
    revalidatePath(`/min-plan/${placement.batchId}`);
    return { ok: true, placementId: placement.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Placeringen kunde inte sparas.") };
  }
}

export async function releasePlantPlacementAction(placementId: string): Promise<PlantPlacementActionResult> {
  try {
    const placement = await releaseCurrentUserPlantPlacement(placementId);
    if (!placement) return { ok: false, error: "Placeringen kunde inte hittas." };
    revalidatePath("/mina-odlingar");
    revalidatePath("/min-plan");
    revalidatePath(`/min-plan/${placement.batchId}`);
    return { ok: true, placementId: placement.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Det gick inte att frigöra platsen.") };
  }
}
