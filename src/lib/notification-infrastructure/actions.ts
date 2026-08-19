"use server";

import { revalidatePath } from "next/cache";
import {
  NotificationInfrastructureInputError,
  PushSubscriptionOwnershipConflictError,
  type NotificationPreferenceSettings,
} from "@/domain/notification-infrastructure";
import {
  ensureCurrentUserPushSubscriptionActive,
  registerCurrentUserPushSubscription,
  revokeCurrentUserPushSubscription,
  sendCurrentUserNotificationCandidate,
  sendCurrentUserTestPush,
  saveCurrentUserNotificationPreferences,
} from "./server";
import type { SendNotificationCandidateResult } from "./candidate-delivery-types";

export type NotificationPreferencesActionResult =
  | { ok: true; preferences: NotificationPreferenceSettings }
  | { ok: false; error: string };

export type RegisterPushSubscriptionActionResult =
  | { ok: true }
  | { ok: false; code?: "endpoint_conflict"; error: string };

export type SyncPushSubscriptionActionResult =
  | { ok: true; status: "active" | "registered" | "reactivated" }
  | { ok: false; code?: "endpoint_conflict"; error: string };

export type RevokePushSubscriptionActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type SendTestPushActionResult =
  | { ok: true; status: "sent"; message: string }
  | { ok: false; status: "subscription_invalid" | "failed"; message: string };

export type SendNotificationCandidateActionResult =
  | { ok: true; status: "sent"; message: string }
  | { ok: false; status: Exclude<SendNotificationCandidateResult["status"], "sent">; message: string };

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

export async function registerPushSubscriptionAction(input: unknown): Promise<RegisterPushSubscriptionActionResult> {
  try {
    await registerCurrentUserPushSubscription(input);
    revalidatePath("/profil");
    return { ok: true };
  } catch (error) {
    if (error instanceof PushSubscriptionOwnershipConflictError) {
      return { ok: false, code: "endpoint_conflict", error: "Pushnotiser kunde inte aktiveras på den här enheten just nu." };
    }
    if (error instanceof NotificationInfrastructureInputError) {
      return { ok: false, error: "Pushnotiser kunde inte aktiveras på den här enheten just nu." };
    }
    if (error instanceof Error && /Authentication required/i.test(error.message)) {
      return { ok: false, error: "Du behöver logga in." };
    }
    return { ok: false, error: "Pushnotiser kunde inte aktiveras på den här enheten just nu." };
  }
}

export async function syncPushSubscriptionAction(input: unknown): Promise<SyncPushSubscriptionActionResult> {
  try {
    const result = await ensureCurrentUserPushSubscriptionActive(input);
    revalidatePath("/profil");
    return { ok: true, status: result.status };
  } catch (error) {
    if (error instanceof PushSubscriptionOwnershipConflictError) {
      return { ok: false, code: "endpoint_conflict", error: "Pushnotiser behÃ¶ver aktiveras om pÃ¥ den hÃ¤r enheten." };
    }
    if (error instanceof NotificationInfrastructureInputError) {
      return { ok: false, error: "Pushnotiser kunde inte synkas pÃ¥ den hÃ¤r enheten." };
    }
    if (error instanceof Error && /Authentication required/i.test(error.message)) {
      return { ok: false, error: "Du behÃ¶ver logga in." };
    }
    return { ok: false, error: "Pushnotiser kunde inte synkas pÃ¥ den hÃ¤r enheten." };
  }
}

export async function revokePushSubscriptionAction(input: unknown): Promise<RevokePushSubscriptionActionResult> {
  try {
    await revokeCurrentUserPushSubscription(input);
    revalidatePath("/profil");
    return { ok: true };
  } catch (error) {
    if (error instanceof NotificationInfrastructureInputError) {
      return { ok: false, error: "Pushnotiser kunde inte stängas av på den här enheten." };
    }
    if (error instanceof Error && /Authentication required/i.test(error.message)) {
      return { ok: false, error: "Du behöver logga in." };
    }
    return { ok: false, error: "Pushnotiser kunde inte stängas av på den här enheten." };
  }
}

export async function sendTestPushAction(input: unknown): Promise<SendTestPushActionResult> {
  try {
    const result = await sendCurrentUserTestPush(input);
    if (result.status === "sent") {
      return { ok: true, status: "sent", message: "Testnotisen skickades." };
    }
    if (result.status === "subscription_invalid") {
      return { ok: false, status: "subscription_invalid", message: "Pushnotiser behöver aktiveras på nytt på den här enheten." };
    }
    return { ok: false, status: "failed", message: "Testnotisen kunde inte skickas. Försök igen." };
  } catch {
    return { ok: false, status: "failed", message: "Testnotisen kunde inte skickas. Försök igen." };
  }
}

function messageForCandidateDeliveryStatus(status: SendNotificationCandidateResult["status"]) {
  if (status === "sent") return "Notisen skickades.";
  if (status === "none_available") return "Ingen aktuell odlingsnotis finns att skicka just nu.";
  if (status === "preference_disabled") return "Aktuella notiser är avstängda i dina notisval.";
  if (status === "already_delivered") return "Den aktuella notisen har redan skickats.";
  if (status === "subscription_invalid") return "Pushnotiser behöver aktiveras på nytt på den här enheten.";
  if (status === "partial_success") return "Notisen skickades, men leveransen kunde inte registreras korrekt. Försök inte skicka igen direkt.";
  return "Notisen kunde inte skickas. Försök igen.";
}

export async function sendNotificationCandidateAction(input: unknown): Promise<SendNotificationCandidateActionResult> {
  try {
    const result = await sendCurrentUserNotificationCandidate(input);
    revalidatePath("/profil");
    const message = messageForCandidateDeliveryStatus(result.status);
    if (result.status === "sent") return { ok: true, status: "sent", message };
    return { ok: false, status: result.status, message };
  } catch {
    return { ok: false, status: "failed", message: messageForCandidateDeliveryStatus("failed") };
  }
}
