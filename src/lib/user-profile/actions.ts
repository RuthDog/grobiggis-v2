"use server";

import { revalidatePath } from "next/cache";
import { UserProfileInputError } from "@/domain/user-profile";
import { saveCurrentUserProfile } from "./server";

export type UserProfileActionResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof UserProfileInputError) return error.message;
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
