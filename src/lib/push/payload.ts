import type { NotificationCandidate } from "@/domain/notification-policy";

export type TestPushNotificationPayload = {
  version: 1;
  type: "test";
  title: string;
  body: string;
  href: string;
};

export type CandidatePushNotificationPayload = {
  version: 1;
  type: "notification";
  title: string;
  body: string;
  href: string;
};

export type PushNotificationPayload = TestPushNotificationPayload | CandidatePushNotificationPayload;

export const testPushNotificationPayload: TestPushNotificationPayload = {
  version: 1,
  type: "test",
  title: "Grobiggis",
  body: "Pushnotiser fungerar på den här enheten.",
  href: "/idag",
};

export function safePushHref(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (/[\u0000-\u001f]/u.test(trimmed)) return fallback;
  return trimmed;
}

export function pushNotificationPayloadFromCandidate(candidate: NotificationCandidate): CandidatePushNotificationPayload {
  return {
    version: 1,
    type: "notification",
    title: candidate.title,
    body: candidate.body,
    href: safePushHref(candidate.href, "/"),
  };
}

export function validatePushNotificationPayload(value: unknown): PushNotificationPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || (input.type !== "test" && input.type !== "notification")) return null;
  if (typeof input.title !== "string" || typeof input.body !== "string") return null;
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return null;
  return {
    version: 1,
    type: input.type,
    title,
    body,
    href: safePushHref(input.href, "/"),
  };
}

export function pushPayloadContainsSecretLikeFields(value: PushNotificationPayload) {
  return "endpoint" in value || "p256dh" in value || "auth" in value || "userId" in value || "vapidPrivateKey" in value;
}
