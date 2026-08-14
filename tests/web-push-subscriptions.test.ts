import test from "node:test";
import assert from "node:assert/strict";
import {
  activatePushOnCurrentDevice,
  deactivatePushOnCurrentDevice,
  detectPushSupport,
  extractPushSubscriptionPayload,
  notificationPermission,
  pushHomeScreenHint,
  pushSupportMessage,
  readPushDeviceState,
  readSyncedPushDeviceState,
  serviceWorkerDetails,
  urlBase64ToUint8Array,
  type BrowserNotificationLike,
  type BrowserPushEnvironment,
  type BrowserPushManagerLike,
  type BrowserPushSubscriptionLike,
  type BrowserServiceWorkerContainerLike,
  type BrowserServiceWorkerRegistrationLike,
} from "../src/lib/push/client.ts";

function createSubscription(
  endpoint: string,
  patch: Partial<BrowserPushSubscriptionLike> = {},
): BrowserPushSubscriptionLike & { unsubscribeCalls: number } {
  let unsubscribeCalls = 0;

  return {
    endpoint,
    getKey(name: "p256dh" | "auth") {
      if (name === "p256dh") return Uint8Array.from([1, 2, 3, 4]).buffer;
      return Uint8Array.from([5, 6, 7, 8]).buffer;
    },
    async unsubscribe() {
      unsubscribeCalls += 1;
      return true;
    },
    get unsubscribeCalls() {
      return unsubscribeCalls;
    },
    ...patch,
  };
}

function createEnvironment(options: {
  secure?: boolean;
  permission?: NotificationPermission;
  requestPermission?: () => Promise<NotificationPermission>;
  existingSubscription?: BrowserPushSubscriptionLike | null;
  subscribe?: BrowserPushManagerLike["subscribe"];
  register?: BrowserServiceWorkerContainerLike["register"];
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  hasNotification?: boolean;
  hasServiceWorker?: boolean;
  hasPushManager?: boolean;
} = {}): BrowserPushEnvironment {
  const currentSubscription = { value: options.existingSubscription ?? null };
  const defaultRegistration = () =>
    ({
      pushManager: {
        async getSubscription() {
          return currentSubscription.value;
        },
        async subscribe(subscriptionOptions) {
          if (options.subscribe) return options.subscribe(subscriptionOptions);
          const subscription = createSubscription("https://push.example.test/subscribed");
          currentSubscription.value = subscription;
          return subscription;
        },
      },
    }) satisfies BrowserServiceWorkerRegistrationLike;

  let activeRegistration = defaultRegistration();

  const serviceWorker: BrowserServiceWorkerContainerLike = {
    async register(scriptURL, registerOptions) {
      activeRegistration = options.register ? await options.register(scriptURL, registerOptions) : defaultRegistration();
      return activeRegistration;
    },
    async getRegistration() {
      return activeRegistration;
    },
    get ready() {
      return Promise.resolve(activeRegistration);
    },
  };

  const notification: BrowserNotificationLike = {
    permission: options.permission ?? "default",
    requestPermission: options.requestPermission ?? (async () => "granted"),
  };

  return {
    isSecureContext: options.secure ?? true,
    hasPushManager: options.hasPushManager ?? true,
    notification: options.hasNotification === false ? undefined : notification,
    serviceWorker: options.hasServiceWorker === false ? undefined : serviceWorker,
    userAgent: options.userAgent ?? "Mozilla/5.0",
    platform: options.platform ?? "Win32",
    maxTouchPoints: options.maxTouchPoints ?? 0,
  };
}

test("service worker details are stable for the whole origin", () => {
  assert.deepEqual(serviceWorkerDetails(), { path: "/sw.js", scope: "/" });
});

test("feature detection rejects insecure context, missing Notification, missing service worker and missing PushManager", () => {
  assert.deepEqual(detectPushSupport(createEnvironment({ secure: false })), {
    supported: false,
    reason: "insecure_context",
    showHomeScreenHint: false,
  });
  assert.deepEqual(detectPushSupport(createEnvironment({ hasNotification: false })), {
    supported: false,
    reason: "notification_unsupported",
    showHomeScreenHint: false,
  });
  assert.deepEqual(detectPushSupport(createEnvironment({ hasServiceWorker: false })), {
    supported: false,
    reason: "service_worker_unsupported",
    showHomeScreenHint: false,
  });
  assert.deepEqual(detectPushSupport(createEnvironment({ hasPushManager: false })), {
    supported: false,
    reason: "push_manager_unsupported",
    showHomeScreenHint: false,
  });
});

test("iPhone and iPad contexts expose the home screen hint conservatively", () => {
  const iphone = detectPushSupport(createEnvironment({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }));
  const ipadLike = detectPushSupport(createEnvironment({ platform: "MacIntel", maxTouchPoints: 5 }));

  assert.equal(iphone.showHomeScreenHint, true);
  assert.equal(ipadLike.showHomeScreenHint, true);
  assert.equal(pushHomeScreenHint(true), "På iPhone och iPad kan Grobiggis behöva läggas till på hemskärmen för att använda pushnotiser.");
  assert.equal(pushHomeScreenHint(false), null);
});

test("permission state and readPushDeviceState separate unsupported, denied, inactive, active and missing config", async () => {
  assert.equal(notificationPermission(createEnvironment({ permission: "default" })), "default");

  const unsupported = await readPushDeviceState(createEnvironment({ secure: false }), "BElocal");
  const denied = await readPushDeviceState(createEnvironment({ permission: "denied" }), "BElocal");
  const inactive = await readPushDeviceState(createEnvironment({ permission: "default" }), "BElocal");
  const active = await readPushDeviceState(
    createEnvironment({ permission: "granted", existingSubscription: createSubscription("https://push.example.test/existing") }),
    null,
  );
  const needsConfig = await readPushDeviceState(createEnvironment({ permission: "granted" }), null);

  assert.equal(unsupported.kind, "unsupported");
  assert.equal(denied.kind, "permission_denied");
  assert.deepEqual(inactive, { kind: "inactive", permission: "default", showHomeScreenHint: false });
  assert.deepEqual(active, {
    kind: "active",
    permission: "granted",
    endpoint: "https://push.example.test/existing",
    showHomeScreenHint: false,
  });
  assert.deepEqual(needsConfig, { kind: "needs_config", permission: "granted", showHomeScreenHint: false });
});

test("synced device state is active only after server registration is confirmed", async () => {
  const existing = createSubscription("https://push.example.test/server-confirmed");
  let syncPayload: unknown = null;

  const state = await readSyncedPushDeviceState(
    createEnvironment({ permission: "granted", existingSubscription: existing }),
    "AQIDBA",
    async (payload) => {
      syncPayload = payload;
      return { ok: true };
    },
  );

  assert.deepEqual(state, {
    kind: "active",
    permission: "granted",
    endpoint: "https://push.example.test/server-confirmed",
    showHomeScreenHint: false,
  });
  assert.deepEqual(syncPayload, {
    endpoint: "https://push.example.test/server-confirmed",
    p256dh: "AQIDBA",
    auth: "BQYHCA",
  });
});

test("synced device state does not show false active when server registration fails", async () => {
  const state = await readSyncedPushDeviceState(
    createEnvironment({ permission: "granted", existingSubscription: createSubscription("https://push.example.test/browser-only") }),
    "AQIDBA",
    async () => ({ ok: false, error: "Pushnotiser kunde inte synkas pÃ¥ den hÃ¤r enheten." }),
  );

  assert.deepEqual(state, {
    kind: "sync_required",
    permission: "granted",
    error: "Pushnotiser kunde inte synkas pÃ¥ den hÃ¤r enheten.",
    showHomeScreenHint: false,
  });
});

test("support messaging is calm and specific", () => {
  assert.equal(pushSupportMessage("insecure_context"), "Pushnotiser kräver en säker anslutning.");
  assert.equal(pushSupportMessage("notification_unsupported"), "Pushnotiser stöds inte i den här webbläsaren eller i det här läget.");
});

test("VAPID public key conversion keeps base64url semantics", () => {
  const bytes = urlBase64ToUint8Array("AQIDBA");
  assert.deepEqual([...bytes], [1, 2, 3, 4]);
});

test("subscription payload extraction returns only endpoint and Web Push keys", () => {
  const payload = extractPushSubscriptionPayload(createSubscription("https://push.example.test/device-a"));

  assert.deepEqual(payload, {
    endpoint: "https://push.example.test/device-a",
    p256dh: "AQIDBA",
    auth: "BQYHCA",
  });
  assert.equal("userId" in payload, false);
});

test("activation requests permission only from the explicit activation flow", async () => {
  let permissionRequests = 0;
  let registerCalls = 0;
  let subscribeCalls = 0;
  let registeredPayload: unknown = null;

  const environment = createEnvironment({
    permission: "default",
    requestPermission: async () => {
      permissionRequests += 1;
      return "granted";
    },
    register: async () => {
      registerCalls += 1;
      return {
        pushManager: {
          async getSubscription() {
            return null;
          },
          async subscribe(options) {
            subscribeCalls += 1;
            assert.ok(options);
            assert.equal(options.userVisibleOnly, true);
            const applicationServerKey = options.applicationServerKey as Uint8Array;
            assert.ok(applicationServerKey instanceof Uint8Array);
            assert.deepEqual([...applicationServerKey], [1, 2, 3, 4]);
            return createSubscription("https://push.example.test/new-device");
          },
        },
      };
    },
  });

  const stateBefore = await readPushDeviceState(environment, "AQIDBA");
  assert.equal(stateBefore.kind, "inactive");
  assert.equal(permissionRequests, 0);

  const result = await activatePushOnCurrentDevice({
    environment,
    vapidPublicKey: "AQIDBA",
    registerSubscription: async (payload) => {
      registeredPayload = payload;
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    ok: true,
    endpoint: "https://push.example.test/new-device",
    replacedExistingSubscription: false,
  });
  assert.equal(permissionRequests, 1);
  assert.equal(registerCalls, 1);
  assert.equal(subscribeCalls, 1);
  assert.deepEqual(registeredPayload, {
    endpoint: "https://push.example.test/new-device",
    p256dh: "AQIDBA",
    auth: "BQYHCA",
  });
});

test("activation does not re-request denied permission and does not subscribe without consent", async () => {
  let subscribeCalls = 0;
  const environment = createEnvironment({
    permission: "denied",
    requestPermission: async () => {
      throw new Error("requestPermission should not run when permission is denied");
    },
    register: async () => ({
      pushManager: {
        async getSubscription() {
          return null;
        },
        async subscribe() {
          subscribeCalls += 1;
          return createSubscription("https://push.example.test/denied");
        },
      },
    }),
  });

  const result = await activatePushOnCurrentDevice({
    environment,
    vapidPublicKey: "AQIDBA",
    registerSubscription: async () => ({ ok: true }),
  });

  assert.deepEqual(result, {
    ok: false,
    code: "permission_denied",
    error: "Notiser är blockerade i webbläsaren. Ändra tillåtelsen i webbläsarens inställningar om du vill aktivera dem.",
  });
  assert.equal(subscribeCalls, 0);
});

test("activation reuses an existing browser subscription when it already exists", async () => {
  const existing = createSubscription("https://push.example.test/existing");
  let subscribeCalls = 0;
  let capturedPayload: unknown = null;

  const result = await activatePushOnCurrentDevice({
    environment: createEnvironment({
      permission: "granted",
      existingSubscription: existing,
      register: async () => ({
        pushManager: {
          async getSubscription() {
            return existing;
          },
          async subscribe() {
            subscribeCalls += 1;
            return createSubscription("https://push.example.test/unexpected");
          },
        },
      }),
    }),
    vapidPublicKey: "AQIDBA",
    registerSubscription: async (payload) => {
      capturedPayload = payload;
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    ok: true,
    endpoint: "https://push.example.test/existing",
    replacedExistingSubscription: false,
  });
  assert.equal(subscribeCalls, 0);
  assert.deepEqual(capturedPayload, {
    endpoint: "https://push.example.test/existing",
    p256dh: "AQIDBA",
    auth: "BQYHCA",
  });
});

test("account-switch conflict can be resolved by explicit unsubscribe and fresh subscribe", async () => {
  const conflicting = createSubscription("https://push.example.test/conflict");
  const replacement = createSubscription("https://push.example.test/replacement");
  let subscribeCalls = 0;
  let currentSubscription: BrowserPushSubscriptionLike | null = conflicting;

  const environment = createEnvironment({
    permission: "granted",
    existingSubscription: conflicting,
    register: async () => ({
      pushManager: {
        async getSubscription() {
          return currentSubscription;
        },
        async subscribe() {
          subscribeCalls += 1;
          currentSubscription = replacement;
          return replacement;
        },
      },
    }),
  });

  const payloads: Array<{ endpoint: string; p256dh: string; auth: string }> = [];
  const result = await activatePushOnCurrentDevice({
    environment,
    vapidPublicKey: "AQIDBA",
    registerSubscription: async (payload) => {
      payloads.push(payload);
      if (payload.endpoint === conflicting.endpoint) {
        currentSubscription = null;
        return { ok: false, code: "endpoint_conflict", error: "conflict" };
      }
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    ok: true,
    endpoint: "https://push.example.test/replacement",
    replacedExistingSubscription: true,
  });
  assert.equal(conflicting.unsubscribeCalls, 1);
  assert.equal(subscribeCalls, 1);
  assert.deepEqual(
    payloads.map((payload) => payload.endpoint),
    ["https://push.example.test/conflict", "https://push.example.test/replacement"],
  );
});

test("deactivation unsubscribes in the browser and then revokes on the server", async () => {
  const active = createSubscription("https://push.example.test/active");
  let revokedEndpoint: string | null = null;

  const result = await deactivatePushOnCurrentDevice({
    environment: createEnvironment({ existingSubscription: active }),
    revokeSubscription: async (endpoint) => {
      revokedEndpoint = endpoint;
      return { ok: true };
    },
    lastKnownEndpoint: active.endpoint,
  });

  assert.deepEqual(result, { ok: true, kind: "deactivated" });
  assert.equal(active.unsubscribeCalls, 1);
  assert.equal(revokedEndpoint, active.endpoint);
});

test("deactivation preserves sync retry details if browser unsubscribe succeeded but server revoke failed", async () => {
  const active = createSubscription("https://push.example.test/sync-needed");

  const result = await deactivatePushOnCurrentDevice({
    environment: createEnvironment({ existingSubscription: active }),
    revokeSubscription: async () => ({ ok: false, error: "server revoke failed" }),
    lastKnownEndpoint: active.endpoint,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: "sync_required",
    endpoint: "https://push.example.test/sync-needed",
    error: "server revoke failed",
  });
  assert.equal(active.unsubscribeCalls, 1);
});

test("deactivation can still sync a remembered endpoint when the browser is already inactive", async () => {
  let revokeCalls = 0;

  const result = await deactivatePushOnCurrentDevice({
    environment: createEnvironment({ existingSubscription: null }),
    revokeSubscription: async (endpoint) => {
      revokeCalls += 1;
      assert.equal(endpoint, "https://push.example.test/remembered");
      return { ok: true };
    },
    lastKnownEndpoint: "https://push.example.test/remembered",
  });

  assert.deepEqual(result, { ok: true, kind: "deactivated" });
  assert.equal(revokeCalls, 1);
});
