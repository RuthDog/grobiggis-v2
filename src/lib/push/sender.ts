import "server-only";

import { buildPushPayload, type PushSubscription as WebPushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import type { PushSubscription } from "@/domain/notification-infrastructure";
import type { PushNotificationPayload } from "./payload";

export type PushSendResult =
  | { ok: true; status: "sent"; statusCode: number }
  | { ok: false; status: "subscription_invalid"; statusCode: 404 | 410 }
  | { ok: false; status: "failed"; statusCode?: number };

export type PushSender = (subscription: PushSubscription, payload: PushNotificationPayload, vapid: VapidKeys) => Promise<PushSendResult>;

function toWebPushSubscription(subscription: PushSubscription): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

function toArrayBufferBody(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function sendWebPushPayload(
  subscription: PushSubscription,
  payload: PushNotificationPayload,
  vapid: VapidKeys,
  fetcher: typeof fetch = fetch,
  timeoutMs = 10000,
): Promise<PushSendResult> {
  const request = await buildPushPayload(
    {
      data: payload,
      options: {
        ttl: 60,
        topic: "grobiggis-test",
        urgency: "normal",
      },
    },
    toWebPushSubscription(subscription),
    vapid,
  );

  const timeout = timeoutSignal(timeoutMs);
  try {
    const response = await fetcher(subscription.endpoint, {
      ...request,
      body: toArrayBufferBody(request.body),
      signal: timeout.signal,
    });

    if (response.ok) return { ok: true, status: "sent", statusCode: response.status };
    if (response.status === 404 || response.status === 410) {
      return { ok: false, status: "subscription_invalid", statusCode: response.status };
    }
    return { ok: false, status: "failed", statusCode: response.status };
  } catch {
    return { ok: false, status: "failed" };
  } finally {
    timeout.clear();
  }
}
