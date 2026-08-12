"use server";

import { revalidatePath } from "next/cache";
import { UserProfileInputError } from "@/domain/user-profile";
import type { GeocodingCandidate } from "@/services/geocoding/types";
import { GeocodingSearchError } from "@/services/geocoding/types";
import { saveCurrentUserProfile, searchCurrentUserProfileLocalities } from "./server";

export type UserProfileActionResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string };

export type SearchLocalityActionResult =
  | { ok: true; candidates: GeocodingCandidate[] }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof UserProfileInputError) return error.message;
  if (error instanceof GeocodingSearchError) return error.message;
  if (error instanceof Error && /Authentication required/i.test(error.message)) return "Du behöver logga in.";
  return fallback;
}

export async function saveUserProfileAction(input: unknown): Promise<UserProfileActionResult> {
  try {
    const profile = await saveCurrentUserProfile(input);
    revalidatePath("/profil");
    return { ok: true, profileId: profile.id };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Profilen kunde inte sparas.") };
  }
}

export async function searchLocalityAction(locality: string): Promise<SearchLocalityActionResult> {
  try {
    const candidates = await searchCurrentUserProfileLocalities(locality);
    return { ok: true, candidates };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Det gick inte att söka efter orten just nu.") };
  }
}
