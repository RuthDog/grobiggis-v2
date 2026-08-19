import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  pushPayloadContainsSecretLikeFields,
  pushNotificationPayloadFromCandidate,
  safePushHref,
  testPushNotificationPayload,
  validatePushNotificationPayload,
} from "../src/lib/push/payload.ts";
import type { NotificationCandidate } from "../src/domain/notification-policy.ts";

function loadServiceWorker() {
  type ServiceWorkerTestEvent = {
    data?: { json: () => unknown };
    notification?: { data?: unknown; close: () => void };
    waitUntil: (promise: Promise<unknown>) => void;
  };
  const listeners = new Map<string, (event: ServiceWorkerTestEvent) => void>();
  const shownNotifications: Array<{ title: string; options: NotificationOptions }> = [];
  const focused: string[] = [];
  const opened: string[] = [];
  const closed: string[] = [];

  const sandbox = {
    URL,
    self: {
      location: { origin: "https://v2.grobiggis.se" },
      addEventListener(type: string, listener: (event: ServiceWorkerTestEvent) => void) {
        listeners.set(type, listener);
      },
      skipWaiting() {},
      clients: {
        async claim() {},
        async matchAll() {
          return [
            {
              url: "https://v2.grobiggis.se/idag",
              async focus() {
                focused.push("/idag");
                return this;
              },
            },
          ];
        },
        async openWindow(href: string) {
          opened.push(href);
          return { href };
        },
      },
      registration: {
        async showNotification(title: string, options: NotificationOptions) {
          shownNotifications.push({ title, options });
        },
      },
    },
  };

  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), sandbox);
  return { listeners, shownNotifications, focused, opened, closed };
}

test("test push payload is transport-only and contains no secrets", () => {
  assert.deepEqual(testPushNotificationPayload, {
    version: 1,
    type: "test",
    title: "Grobiggis",
    body: "Pushnotiser fungerar på den här enheten.",
    href: "/idag",
  });
  assert.equal(pushPayloadContainsSecretLikeFields(testPushNotificationPayload), false);
  assert.equal("signalType" in testPushNotificationPayload, false);
});

test("test push payload validation keeps href relative and safe", () => {
  assert.deepEqual(validatePushNotificationPayload(testPushNotificationPayload), testPushNotificationPayload);
  assert.equal(safePushHref("/idag"), "/idag");
  assert.equal(safePushHref("//evil.example"), "/");
  assert.equal(safePushHref("https://evil.example"), "/");
  assert.equal(safePushHref("javascript:alert(1)"), "/");
  assert.equal(validatePushNotificationPayload({ ...testPushNotificationPayload, href: "data:text/html,hello" })?.href, "/");
  assert.equal(validatePushNotificationPayload({ ...testPushNotificationPayload, type: "frost" }), null);
});

test("notification candidate payload is separate from SignalType and keeps safe href", () => {
  const candidate: NotificationCandidate = {
    id: "notification:weather:frost:2026-08-12T18:00:high",
    signalId: "weather:frost:2026-08-12T18:00",
    type: "frost",
    urgency: "high",
    title: "Frost väntas i natt",
    body: "Tomat kan behöva skyddas.",
    href: "/vader",
    deduplicationKey: "weather:frost:2026-08-12T18:00:important:high",
    validFrom: "2026-08-12T18:00",
    validTo: "2026-08-13T09:00",
  };
  const payload = pushNotificationPayloadFromCandidate(candidate);

  assert.deepEqual(payload, {
    version: 1,
    type: "notification",
    title: "Frost väntas i natt",
    body: "Tomat kan behöva skyddas.",
    href: "/vader",
  });
  assert.deepEqual(validatePushNotificationPayload(payload), payload);
  assert.equal("signalType" in payload, false);
  assert.equal(pushPayloadContainsSecretLikeFields(payload), false);
});

test("service worker push event shows the test notification", async () => {
  const worker = loadServiceWorker();
  let pending: Promise<unknown> | undefined;

  worker.listeners.get("push")?.({
    data: {
      json: () => testPushNotificationPayload,
    },
    waitUntil(promise: Promise<unknown>) {
      pending = promise;
    },
  });

  await pending;
  assert.equal(worker.shownNotifications.length, 1);
  assert.equal(worker.shownNotifications[0]?.title, "Grobiggis");
  assert.equal(worker.shownNotifications[0]?.options.body, "Pushnotiser fungerar på den här enheten.");
  assert.equal((worker.shownNotifications[0]?.options.data as { href?: string } | undefined)?.href, "/idag");
});

test("service worker push event shows a notification candidate payload", async () => {
  const worker = loadServiceWorker();
  let pending: Promise<unknown> | undefined;

  worker.listeners.get("push")?.({
    data: {
      json: () => ({
        version: 1,
        type: "notification",
        title: "Frost väntas i natt",
        body: "Tomat kan behöva skyddas.",
        href: "/vader",
      }),
    },
    waitUntil(promise: Promise<unknown>) {
      pending = promise;
    },
  });

  await pending;
  assert.equal(worker.shownNotifications.length, 1);
  assert.equal(worker.shownNotifications[0]?.title, "Frost väntas i natt");
  assert.equal(worker.shownNotifications[0]?.options.body, "Tomat kan behöva skyddas.");
  assert.equal((worker.shownNotifications[0]?.options.data as { href?: string } | undefined)?.href, "/vader");
  assert.equal(worker.shownNotifications[0]?.options.tag, "grobiggis-notification");
});

test("service worker ignores malformed push payloads without crashing", () => {
  const worker = loadServiceWorker();

  assert.doesNotThrow(() =>
    worker.listeners.get("push")?.({
      data: {
        json: () => ({ version: 1, type: "test", title: "", body: "x", href: "/idag" }),
      },
      waitUntil() {
        throw new Error("malformed payload should not schedule notification display");
      },
    }),
  );

  assert.equal(worker.shownNotifications.length, 0);
});

test("service worker notificationclick closes and focuses an existing Grobiggis /idag window", async () => {
  const worker = loadServiceWorker();
  let pending: Promise<unknown> | undefined;

  worker.listeners.get("notificationclick")?.({
    notification: {
      data: { href: "/idag" },
      close() {
        worker.closed.push("closed");
      },
    },
    waitUntil(promise: Promise<unknown>) {
      pending = promise;
    },
  });

  await pending;
  assert.deepEqual(worker.closed, ["closed"]);
  assert.deepEqual(worker.focused, ["/idag"]);
  assert.deepEqual(worker.opened, []);
});

test("service worker notificationclick falls back for external hrefs", async () => {
  const worker = loadServiceWorker();
  let pending: Promise<unknown> | undefined;

  worker.listeners.get("notificationclick")?.({
    notification: {
      data: { href: "https://evil.example" },
      close() {
        worker.closed.push("closed");
      },
    },
    waitUntil(promise: Promise<unknown>) {
      pending = promise;
    },
  });

  await pending;
  assert.deepEqual(worker.opened, ["/"]);
});

test("service worker does not introduce app traffic interception", () => {
  const source = readFileSync("public/sw.js", "utf8");

  assert.doesNotMatch(source, /addEventListener\(["']fetch["']/);
  assert.doesNotMatch(source, /caches\./);
  assert.doesNotMatch(source, /NotificationCandidate|signalType|frost|watering|heat/);
});
