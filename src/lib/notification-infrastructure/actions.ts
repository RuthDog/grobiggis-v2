"use server";

import { revalidatePath } from "next/cache";
import { NotificationInfrastructureInputError, type NotificationPreferenceSettings } from "@/domain/notification-infrastructure";
import { saveCurrentUserNotificationPreferences } from "./server";

export type NotificationPreferencesActionResult =
  | { ok: true; preferences: NotificationPreferenceSettings }
  | { ok: false; error: string };

function messageForError(error: unknown, fallback: string) {
  if (error instanceof NotificationInfrastructureInputError) return error.message;
  if (error instanceof Error && /Authentication required/i.test(error.message)) return "Du behöver logga in.";
  return fallback;
}

export async function saveNotificationPreferencesAction(input: unknown): Promise<NotificationPreferencesActionResult> {
  try {
    const preferences = await saveCurrentUserNotificationPreferences(input);
    revalidatePath("/profil");
    return { ok: true, preferences };
  } catch (error) {
    return { ok: false, error: messageForError(error, "Notisinställningarna kunde inte sparas.") };
  }
}
