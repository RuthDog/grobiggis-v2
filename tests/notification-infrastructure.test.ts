import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { notificationDeliveryLog, notificationPreferences, pushSubscriptions } from "../src/db/schema.ts";
import {
  NotificationInfrastructureInputError,
  PushSubscriptionOwnershipConflictError,
  disabledNotificationPreferenceSettings,
  notificationDeliveryInputFromCandidate,
  validateNotificationSignalType,
  validateRevokePushSubscriptionInput,
  validatePushSubscriptionInput,
  validateSaveNotificationPreferencesInput,
  type NotificationDeliveryLogEntry,
  type NotificationPreference,
  type PushSubscription,
  type PushSubscriptionEndpointStatus,
} from "../src/domain/notification-infrastructure.ts";
import type { NotificationCandidate } from "../src/domain/notification-policy.ts";
import {
  addPushSubscriptionForUser,
  ensurePushSubscriptionActiveForUser,
  getNotificationPreferencesForUser,
  hasNotificationDeliveryForUser,
  listActivePushSubscriptionsForUser,
  recordNotificationCandidateDeliveryForUser,
  recordNotificationDeliveryForUser,
  revokePushSubscriptionEndpointForUser,
  revokePushSubscriptionForUser,
  saveNotificationPreferencesForUser,
  sendNotificationCandidateForUser,
  sendTestPushForUser,
} from "../src/lib/notification-infrastructure/service.ts";
import { selectDeliverableNotificationCandidate } from "../src/lib/notification-infrastructure/candidate-selection.ts";
import { pushNotificationPayloadFromCandidate } from "../src/lib/push/payload.ts";
import type { PushSender } from "../src/lib/push/sender.ts";
import type {
  NotificationDeliveryRepository,
  NotificationPreferenceRepository,
  PushSubscriptionRepository,
} from "../src/repositories/notification-infrastructure-repository.ts";

class MemoryNotificationPreferenceRepository implements NotificationPreferenceRepository {
  readonly rows = new Map<string, NotificationPreference>();

  async listForUser(userId: string) {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .map((row) => structuredClone(row));
  }

  async upsertForUser(userId: string, preference: NotificationPreference) {
    const existing = [...this.rows.values()].find((row) => row.userId === userId && row.signalType === preference.signalType);
    const snapshot = {
      ...structuredClone(preference),
      userId,
      id: existing?.id ?? preference.id,
      createdAt: existing?.createdAt ?? preference.createdAt,
    };
    if (existing) this.rows.delete(existing.id);
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }
}

class MemoryPushSubscriptionRepository implements PushSubscriptionRepository {
  readonly rows = new Map<string, PushSubscription>();

  async addOrRefreshForUser(userId: string, subscription: PushSubscription) {
    const existing = [...this.rows.values()].find((row) => row.endpoint === subscription.endpoint);
    if (existing && existing.userId !== userId) throw new Error("Push subscription endpoint already belongs to another user.");

    const snapshot = {
      ...structuredClone(subscription),
      userId,
      id: existing?.id ?? subscription.id,
      createdAt: existing?.createdAt ?? subscription.createdAt,
      revokedAt: null,
    };

    if (existing) this.rows.delete(existing.id);
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }

  async listActiveForUser(userId: string) {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId && row.revokedAt === null)
      .map((row) => structuredClone(row));
  }

  async endpointStatusForUser(userId: string, endpoint: string): Promise<PushSubscriptionEndpointStatus> {
    const row = [...this.rows.values()].find((subscription) => subscription.endpoint === endpoint);
    if (!row) return "not_found";
    if (row.userId !== userId) return "owned_by_other";
    return row.revokedAt === null ? "active" : "same_user_revoked";
  }

  async getActiveByEndpointForUser(userId: string, endpoint: string) {
    const row = [...this.rows.values()].find((subscription) => subscription.userId === userId && subscription.endpoint === endpoint && subscription.revokedAt === null);
    return row ? structuredClone(row) : null;
  }

  async revokeForUser(userId: string, subscriptionId: string, revokedAt: string) {
    const row = this.rows.get(subscriptionId);
    if (!row || row.userId !== userId) return null;
    const snapshot = { ...row, revokedAt, updatedAt: revokedAt };
    this.rows.set(subscriptionId, snapshot);
    return structuredClone(snapshot);
  }

  async revokeByEndpointForUser(userId: string, endpoint: string, revokedAt: string) {
    const row = [...this.rows.values()].find((subscription) => subscription.userId === userId && subscription.endpoint === endpoint);
    if (!row) return null;
    const snapshot = { ...row, revokedAt, updatedAt: revokedAt };
    this.rows.set(row.id, snapshot);
    return structuredClone(snapshot);
  }
}

class MemoryNotificationDeliveryRepository implements NotificationDeliveryRepository {
  readonly rows = new Map<string, NotificationDeliveryLogEntry>();

  async getByDeduplicationKeyForUser(userId: string, deduplicationKey: string) {
    const row = [...this.rows.values()].find((entry) => entry.userId === userId && entry.deduplicationKey === deduplicationKey);
    return row ? structuredClone(row) : null;
  }

  async hasDeliveredForUser(userId: string, deduplicationKey: string) {
    return Boolean(await this.getByDeduplicationKeyForUser(userId, deduplicationKey));
  }

  async recordDeliveredForUser(userId: string, entry: NotificationDeliveryLogEntry) {
    const existing = await this.getByDeduplicationKeyForUser(userId, entry.deduplicationKey);
    if (existing) return existing;
    const snapshot = { ...structuredClone(entry), userId };
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }
}

const userA = { id: "user-a" };
const userB = { id: "user-b" };
const read = (path: string) => readFileSync(path, "utf8");

const ids = () => {
  let count = 0;
  return () => `id-${++count}`;
};

const fakeSubscription = (suffix: string) => ({
  endpoint: `https://push.example.test/${suffix}`,
  p256dh: `fake-p256dh-${suffix}`,
  auth: `fake-auth-${suffix}`,
});

const candidate = (patch: Partial<NotificationCandidate> = {}): NotificationCandidate => ({
  id: "notification:weather:frost:2026-08-12T18:00:2026-08-13T09:00:important:high",
  signalId: "weather:frost:2026-08-12T18:00:2026-08-13T09:00",
  type: "frost",
  urgency: "high",
  title: "Frost väntas i natt",
  body: "Tomat kan behöva skyddas.",
  href: "/vader",
  deduplicationKey: "weather:frost:2026-08-12T18:00:2026-08-13T09:00:important:high",
  validFrom: "2026-08-12T18:00",
  validTo: "2026-08-13T09:00",
  ...patch,
});

const deliverableCandidate = (patch: Partial<NotificationCandidate> = {}): NotificationCandidate =>
  candidate({
    validFrom: "2026-08-15",
    validTo: "2026-08-16",
    ...patch,
  });

test("notification infrastructure schema has the three user-scoped primitives", () => {
  assert.equal(notificationPreferences.userId.name, "user_id");
  assert.equal(notificationPreferences.signalType.name, "signal_type");
  assert.equal(notificationPreferences.enabled.name, "enabled");
  assert.equal(pushSubscriptions.userId.name, "user_id");
  assert.equal(pushSubscriptions.endpoint.name, "endpoint");
  assert.equal(pushSubscriptions.revokedAt.name, "revoked_at");
  assert.equal(notificationDeliveryLog.userId.name, "user_id");
  assert.equal(notificationDeliveryLog.deduplicationKey.name, "deduplication_key");
  assert.equal(notificationDeliveryLog.subscriptionId.name, "subscription_id");
});

test("missing preference rows mean all notification preferences are disabled", async () => {
  const repository = new MemoryNotificationPreferenceRepository();

  assert.deepEqual(disabledNotificationPreferenceSettings(), { frost: false, watering: false, heat: false });
  assert.deepEqual(await getNotificationPreferencesForUser(repository, userA), { frost: false, watering: false, heat: false });
});

test("user can save and reload frost, watering and heat preferences independently", async () => {
  const repository = new MemoryNotificationPreferenceRepository();
  const createId = ids();

  await saveNotificationPreferencesForUser(repository, userA, { frost: true, watering: false, heat: true }, createId, new Date("2026-08-14T10:00:00Z"));
  assert.deepEqual(await getNotificationPreferencesForUser(repository, userA), { frost: true, watering: false, heat: true });

  await saveNotificationPreferencesForUser(repository, userA, { frost: false, watering: true, heat: true }, createId, new Date("2026-08-14T11:00:00Z"));
  assert.deepEqual(await getNotificationPreferencesForUser(repository, userA), { frost: false, watering: true, heat: true });
  assert.equal(repository.rows.size, 3);
});

test("preference validation rejects unknown signal types and client-owned authority", () => {
  assert.equal(validateNotificationSignalType("frost"), "frost");
  assert.throws(() => validateNotificationSignalType("planting"), NotificationInfrastructureInputError);
  assert.throws(() => validateSaveNotificationPreferencesInput({ frost: true, planting: true }), NotificationInfrastructureInputError);
  assert.throws(() => validateSaveNotificationPreferencesInput({ frost: true, userId: "client-user" }), NotificationInfrastructureInputError);
  assert.throws(() => validateSaveNotificationPreferencesInput({ frost: true, endpoint: "https://push.example.test/a" }), NotificationInfrastructureInputError);
});

test("preference reads and writes are scoped by session user", async () => {
  const repository = new MemoryNotificationPreferenceRepository();
  const createId = ids();

  await saveNotificationPreferencesForUser(repository, userA, { frost: true, watering: false, heat: false }, createId, new Date("2026-08-14T10:00:00Z"));
  await saveNotificationPreferencesForUser(repository, userB, { frost: false, watering: true, heat: false }, createId, new Date("2026-08-14T10:01:00Z"));
  await saveNotificationPreferencesForUser(repository, userA, { frost: false, watering: false, heat: true }, createId, new Date("2026-08-14T10:02:00Z"));

  assert.deepEqual(await getNotificationPreferencesForUser(repository, userA), { frost: false, watering: false, heat: true });
  assert.deepEqual(await getNotificationPreferencesForUser(repository, userB), { frost: false, watering: true, heat: false });
});

test("push subscriptions support multiple devices, unique endpoints and user-scoped revoke", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();

  const first = await addPushSubscriptionForUser(repository, userA, fakeSubscription("a"), createId, new Date("2026-08-14T10:00:00Z"));
  const second = await addPushSubscriptionForUser(repository, userA, fakeSubscription("b"), createId, new Date("2026-08-14T10:01:00Z"));
  await addPushSubscriptionForUser(repository, userB, fakeSubscription("c"), createId, new Date("2026-08-14T10:02:00Z"));

  assert.deepEqual((await listActivePushSubscriptionsForUser(repository, userA)).map((row) => row.id), [first.id, second.id]);
  await assert.rejects(() => addPushSubscriptionForUser(repository, userB, fakeSubscription("a"), createId), /tillhör redan en annan användare/);
  assert.equal(await revokePushSubscriptionForUser(repository, userB, first.id), null);

  const revoked = await revokePushSubscriptionForUser(repository, userA, first.id, new Date("2026-08-14T10:03:00Z"));
  assert.equal(revoked?.revokedAt, "2026-08-14T10:03:00.000Z");
  assert.deepEqual((await listActivePushSubscriptionsForUser(repository, userA)).map((row) => row.id), [second.id]);
});

test("push subscriptions support same-user idempotency, reactivation and endpoint revoke", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();

  const first = await addPushSubscriptionForUser(repository, userA, fakeSubscription("same-user"), createId, new Date("2026-08-14T10:00:00Z"));
  const repeated = await addPushSubscriptionForUser(
    repository,
    userA,
    { ...fakeSubscription("same-user"), p256dh: "updated-p256dh", auth: "updated-auth" },
    createId,
    new Date("2026-08-14T10:01:00Z"),
  );

  assert.equal(first.id, repeated.id);
  assert.equal(repository.rows.size, 1);
  assert.equal(repeated.p256dh, "updated-p256dh");

  const revoked = await revokePushSubscriptionEndpointForUser(repository, userA, { endpoint: first.endpoint }, new Date("2026-08-14T10:02:00Z"));
  assert.equal(revoked?.revokedAt, "2026-08-14T10:02:00.000Z");
  assert.deepEqual(await listActivePushSubscriptionsForUser(repository, userA), []);

  const reactivated = await addPushSubscriptionForUser(
    repository,
    userA,
    { ...fakeSubscription("same-user"), p256dh: "reactivated-p256dh", auth: "reactivated-auth" },
    createId,
    new Date("2026-08-14T10:03:00Z"),
  );

  assert.equal(reactivated.id, first.id);
  assert.equal(reactivated.revokedAt, null);
  assert.equal((await listActivePushSubscriptionsForUser(repository, userA)).length, 1);
});

test("syncing a revoked same-user endpoint reactivates it and updates keys", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();
  const first = await addPushSubscriptionForUser(repository, userA, fakeSubscription("sync-same-endpoint"), createId, new Date("2026-08-14T10:00:00Z"));

  await revokePushSubscriptionEndpointForUser(repository, userA, { endpoint: first.endpoint }, new Date("2026-08-14T10:01:00Z"));
  assert.equal((await listActivePushSubscriptionsForUser(repository, userA)).length, 0);

  const result = await ensurePushSubscriptionActiveForUser(
    repository,
    userA,
    { ...fakeSubscription("sync-same-endpoint"), p256dh: "synced-p256dh", auth: "synced-auth" },
    createId,
    new Date("2026-08-14T10:02:00Z"),
  );

  const active = await listActivePushSubscriptionsForUser(repository, userA);
  assert.deepEqual(result, { status: "reactivated" });
  assert.equal(active.length, 1);
  assert.equal(active[0]?.id, first.id);
  assert.equal(active[0]?.revokedAt, null);
  assert.equal(active[0]?.p256dh, "synced-p256dh");
  assert.equal(active[0]?.auth, "synced-auth");
});

test("reactivation with a new endpoint keeps old revoked rows and creates a new active row", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();
  const first = await addPushSubscriptionForUser(repository, userA, fakeSubscription("old-endpoint"), createId, new Date("2026-08-14T10:00:00Z"));

  await revokePushSubscriptionEndpointForUser(repository, userA, { endpoint: first.endpoint }, new Date("2026-08-14T10:01:00Z"));
  const result = await ensurePushSubscriptionActiveForUser(repository, userA, fakeSubscription("new-endpoint"), createId, new Date("2026-08-14T10:02:00Z"));

  const active = await listActivePushSubscriptionsForUser(repository, userA);
  assert.deepEqual(result, { status: "registered" });
  assert.equal(repository.rows.size, 2);
  assert.equal(active.length, 1);
  assert.equal(active[0]?.endpoint, fakeSubscription("new-endpoint").endpoint);
  assert.equal(repository.rows.get(first.id)?.revokedAt, "2026-08-14T10:01:00.000Z");
});

test("syncing an already active endpoint is read-only at repository level", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();

  await addPushSubscriptionForUser(repository, userA, fakeSubscription("already-active"), createId, new Date("2026-08-14T10:00:00Z"));
  const result = await ensurePushSubscriptionActiveForUser(
    repository,
    userA,
    { ...fakeSubscription("already-active"), p256dh: "ignored-p256dh", auth: "ignored-auth" },
    createId,
    new Date("2026-08-14T10:01:00Z"),
  );

  const active = await listActivePushSubscriptionsForUser(repository, userA);
  assert.deepEqual(result, { status: "active" });
  assert.equal(active.length, 1);
  assert.equal(active[0]?.p256dh, fakeSubscription("already-active").p256dh);
});

test("push lifecycle keeps existing notification preferences unchanged", async () => {
  const preferenceRepository = new MemoryNotificationPreferenceRepository();
  const pushRepository = new MemoryPushSubscriptionRepository();
  const deliveryRepository = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const expectedPreferences = { frost: false, watering: true, heat: true };

  await saveNotificationPreferencesForUser(preferenceRepository, userA, expectedPreferences, createId, new Date("2026-08-14T10:00:00Z"));

  await addPushSubscriptionForUser(pushRepository, userA, fakeSubscription("preference-isolation"), createId, new Date("2026-08-14T10:01:00Z"));
  assert.deepEqual(await getNotificationPreferencesForUser(preferenceRepository, userA), expectedPreferences);

  await revokePushSubscriptionEndpointForUser(
    pushRepository,
    userA,
    { endpoint: fakeSubscription("preference-isolation").endpoint },
    new Date("2026-08-14T10:02:00Z"),
  );
  assert.deepEqual(await getNotificationPreferencesForUser(preferenceRepository, userA), expectedPreferences);

  await ensurePushSubscriptionActiveForUser(
    pushRepository,
    userA,
    { ...fakeSubscription("preference-isolation"), p256dh: "reactivated-p256dh", auth: "reactivated-auth" },
    createId,
    new Date("2026-08-14T10:03:00Z"),
  );

  assert.deepEqual(await getNotificationPreferencesForUser(preferenceRepository, userA), expectedPreferences);
  assert.equal((await listActivePushSubscriptionsForUser(pushRepository, userA)).length, 1);
  assert.equal(deliveryRepository.rows.size, 0);
});

test("preference save keeps active push subscriptions unchanged", async () => {
  const preferenceRepository = new MemoryNotificationPreferenceRepository();
  const pushRepository = new MemoryPushSubscriptionRepository();
  const createId = ids();
  const subscription = await addPushSubscriptionForUser(pushRepository, userA, fakeSubscription("preference-save"), createId, new Date("2026-08-14T10:00:00Z"));

  await saveNotificationPreferencesForUser(
    preferenceRepository,
    userA,
    { frost: false, watering: true, heat: true },
    createId,
    new Date("2026-08-14T10:01:00Z"),
  );

  const active = await listActivePushSubscriptionsForUser(pushRepository, userA);
  assert.equal(active.length, 1);
  assert.equal(active[0]?.id, subscription.id);
});

test("test push transport sends only to the current active device without delivery-log writes", async () => {
  const preferenceRepository = new MemoryNotificationPreferenceRepository();
  const pushRepository = new MemoryPushSubscriptionRepository();
  const deliveryRepository = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const current = await addPushSubscriptionForUser(pushRepository, userA, fakeSubscription("current-device"), createId, new Date("2026-08-15T10:00:00Z"));
  const other = await addPushSubscriptionForUser(pushRepository, userA, fakeSubscription("other-device"), createId, new Date("2026-08-15T10:01:00Z"));
  const revoked = await addPushSubscriptionForUser(pushRepository, userA, fakeSubscription("revoked-device"), createId, new Date("2026-08-15T10:02:00Z"));
  await revokePushSubscriptionEndpointForUser(pushRepository, userA, { endpoint: revoked.endpoint }, new Date("2026-08-15T10:03:00Z"));
  await saveNotificationPreferencesForUser(preferenceRepository, userA, { frost: false, watering: true, heat: true }, createId, new Date("2026-08-15T10:04:00Z"));

  const sentIds: string[] = [];
  const sender: PushSender = async (subscription, payload, vapid) => {
    sentIds.push(subscription.id);
    assert.equal(payload.type, "test");
    assert.equal(payload.title, "Grobiggis");
    assert.equal(payload.body, "Pushnotiser fungerar på den här enheten.");
    assert.equal(payload.href, "/idag");
    assert.equal(vapid.subject, "mailto:test@example.com");
    return { ok: true, status: "sent", statusCode: 201 };
  };

  const result = await sendTestPushForUser(
    pushRepository,
    userA,
    { endpoint: current.endpoint },
    sender,
    { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" },
    new Date("2026-08-15T10:05:00Z"),
  );

  assert.deepEqual(result, { status: "sent" });
  assert.deepEqual(sentIds, [current.id]);
  assert.equal((await listActivePushSubscriptionsForUser(pushRepository, userA)).some((row) => row.id === other.id), true);
  assert.equal((await listActivePushSubscriptionsForUser(pushRepository, userA)).some((row) => row.id === revoked.id), false);
  assert.deepEqual(await getNotificationPreferencesForUser(preferenceRepository, userA), { frost: false, watering: true, heat: true });
  assert.equal(deliveryRepository.rows.size, 0);
});

test("test push rejects client-owned authority and revoked or cross-user devices", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();
  const active = await addPushSubscriptionForUser(repository, userA, fakeSubscription("owned-active"), createId, new Date("2026-08-15T10:00:00Z"));
  const revoked = await addPushSubscriptionForUser(repository, userA, fakeSubscription("owned-revoked"), createId, new Date("2026-08-15T10:01:00Z"));
  const otherUser = await addPushSubscriptionForUser(repository, userB, fakeSubscription("other-user"), createId, new Date("2026-08-15T10:02:00Z"));
  await revokePushSubscriptionEndpointForUser(repository, userA, { endpoint: revoked.endpoint }, new Date("2026-08-15T10:03:00Z"));
  const sender: PushSender = async () => {
    throw new Error("revoked or cross-user subscriptions must not be sent");
  };
  const vapid = { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" };

  await assert.rejects(() => sendTestPushForUser(repository, userA, { endpoint: active.endpoint, userId: "client-user" }, sender, vapid), NotificationInfrastructureInputError);
  assert.deepEqual(await sendTestPushForUser(repository, userA, { endpoint: revoked.endpoint }, sender, vapid), { status: "subscription_invalid" });
  assert.deepEqual(await sendTestPushForUser(repository, userA, { endpoint: otherUser.endpoint }, sender, vapid), { status: "subscription_invalid" });
});

test("test push invalidates only 404 and 410 endpoints", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();
  const gone = await addPushSubscriptionForUser(repository, userA, fakeSubscription("gone"), createId, new Date("2026-08-15T10:00:00Z"));
  const failing = await addPushSubscriptionForUser(repository, userA, fakeSubscription("server-fail"), createId, new Date("2026-08-15T10:01:00Z"));
  const vapid = { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" };

  const goneResult = await sendTestPushForUser(
    repository,
    userA,
    { endpoint: gone.endpoint },
    async () => ({ ok: false, status: "subscription_invalid", statusCode: 410 }),
    vapid,
    new Date("2026-08-15T10:02:00Z"),
  );
  assert.deepEqual(goneResult, { status: "subscription_invalid" });
  assert.equal((await repository.getActiveByEndpointForUser(userA.id, gone.endpoint)), null);

  const failedResult = await sendTestPushForUser(
    repository,
    userA,
    { endpoint: failing.endpoint },
    async () => ({ ok: false, status: "failed", statusCode: 500 }),
    vapid,
    new Date("2026-08-15T10:03:00Z"),
  );
  assert.deepEqual(failedResult, { status: "failed" });
  assert.equal((await repository.getActiveByEndpointForUser(userA.id, failing.endpoint))?.id, failing.id);
});

test("candidate selection is deterministic and chooses high urgency before normal", () => {
  const high = candidate({ id: "notification:high", urgency: "high", deduplicationKey: "weather:frost:high" });
  const normal = candidate({
    id: "notification:normal",
    signalId: "weather:heat:normal",
    type: "heat",
    urgency: "normal",
    deduplicationKey: "weather:heat:normal",
    validFrom: "2026-08-12",
    validTo: "2026-08-13",
  });

  const first = selectDeliverableNotificationCandidate({
    candidates: [normal, high],
    preferences: { frost: true, watering: true, heat: true },
    deliveredKeys: new Set(),
    now: new Date("2026-08-12T10:00:00Z"),
  });
  const second = selectDeliverableNotificationCandidate({
    candidates: [high, normal],
    preferences: { frost: true, watering: true, heat: true },
    deliveredKeys: new Set(),
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(first.status, "selected");
  assert.equal(second.status, "selected");
  if (first.status === "selected" && second.status === "selected") {
    assert.equal(first.candidate.id, high.id);
    assert.equal(second.candidate.id, high.id);
  }
});

test("candidate selection filters preferences, delivered keys, expired candidates and unsafe hrefs", () => {
  const disabledFrost = candidate({ id: "notification:disabled", deduplicationKey: "weather:frost:disabled" });
  const deliveredHeat = candidate({
    id: "notification:delivered",
    signalId: "weather:heat:delivered",
    type: "heat",
    urgency: "normal",
    deduplicationKey: "weather:heat:delivered",
    validFrom: "2026-08-12",
    validTo: "2026-08-13",
  });
  const expiredWatering = candidate({
    id: "notification:expired",
    signalId: "weather:watering:expired",
    type: "watering",
    urgency: "normal",
    deduplicationKey: "weather:watering:expired",
    validFrom: "2026-08-10",
    validTo: "2026-08-10",
  });
  const unsafeHref = candidate({
    id: "notification:unsafe",
    signalId: "weather:heat:unsafe",
    type: "heat",
    urgency: "normal",
    href: "https://evil.example",
    deduplicationKey: "weather:heat:unsafe",
    validFrom: "2026-08-12",
    validTo: "2026-08-13",
  });
  const next = candidate({
    id: "notification:next",
    signalId: "weather:watering:next",
    type: "watering",
    urgency: "normal",
    deduplicationKey: "weather:watering:next",
    validFrom: "2026-08-12",
    validTo: "2026-08-13",
  });

  const selected = selectDeliverableNotificationCandidate({
    candidates: [disabledFrost, deliveredHeat, expiredWatering, unsafeHref, next],
    preferences: { frost: false, watering: true, heat: true },
    deliveredKeys: new Set([deliveredHeat.deduplicationKey]),
    now: new Date("2026-08-12T10:00:00Z"),
  });

  assert.equal(selected.status, "selected");
  if (selected.status === "selected") assert.equal(selected.candidate.id, next.id);

  assert.deepEqual(
    selectDeliverableNotificationCandidate({
      candidates: [disabledFrost],
      preferences: { frost: false, watering: false, heat: false },
      deliveredKeys: new Set(),
      now: new Date("2026-08-12T10:00:00Z"),
    }),
    { status: "preference_disabled" },
  );
  assert.deepEqual(
    selectDeliverableNotificationCandidate({
      candidates: [deliveredHeat],
      preferences: { frost: false, watering: false, heat: true },
      deliveredKeys: new Set([deliveredHeat.deduplicationKey]),
      now: new Date("2026-08-12T10:00:00Z"),
    }),
    { status: "already_delivered" },
  );
  assert.deepEqual(
    selectDeliverableNotificationCandidate({
      candidates: [],
      preferences: { frost: true, watering: true, heat: true },
      deliveredKeys: new Set(),
      now: new Date("2026-08-12T10:00:00Z"),
    }),
    { status: "none_available" },
  );
});

test("candidate payload maps product notification data without secrets or SignalType confusion", () => {
  const payload = pushNotificationPayloadFromCandidate(candidate());

  assert.deepEqual(payload, {
    version: 1,
    type: "notification",
    title: "Frost väntas i natt",
    body: "Tomat kan behöva skyddas.",
    href: "/vader",
  });
  assert.equal("endpoint" in payload, false);
  assert.equal("p256dh" in payload, false);
  assert.equal("auth" in payload, false);
  assert.equal("signalType" in payload, false);
});

test("candidate delivery requires auth, current-device ownership, enabled preference and writes one delivery log after success", async () => {
  const preferences = new MemoryNotificationPreferenceRepository();
  const pushSubscriptions = new MemoryPushSubscriptionRepository();
  const deliveries = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const subscription = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("candidate-device"), createId, new Date("2026-08-15T10:00:00Z"));
  await addPushSubscriptionForUser(pushSubscriptions, userB, fakeSubscription("other-user-candidate"), createId, new Date("2026-08-15T10:01:00Z"));
  await saveNotificationPreferencesForUser(preferences, userA, { frost: true, watering: true, heat: true }, createId, new Date("2026-08-15T10:02:00Z"));
  const currentCandidate = deliverableCandidate();
  const sent: string[] = [];
  const sender: PushSender = async (target, payload) => {
    sent.push(target.id);
    assert.equal(payload.type, "notification");
    assert.equal(payload.href, "/vader");
    return { ok: true, status: "sent", statusCode: 201 };
  };

  await assert.rejects(
    () =>
      sendNotificationCandidateForUser(
        { preferences, pushSubscriptions, deliveries },
        null,
        { endpoint: subscription.endpoint },
        [currentCandidate],
        sender,
        { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" },
        createId,
        new Date("2026-08-15T10:03:00Z"),
      ),
    /Authentication required/,
  );
  await assert.rejects(
    () =>
      sendNotificationCandidateForUser(
        { preferences, pushSubscriptions, deliveries },
        userA,
        { endpoint: subscription.endpoint, userId: "client-user" },
        [currentCandidate],
        sender,
        { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" },
        createId,
        new Date("2026-08-15T10:03:00Z"),
      ),
    NotificationInfrastructureInputError,
  );

  const result = await sendNotificationCandidateForUser(
    { preferences, pushSubscriptions, deliveries },
    userA,
    { endpoint: subscription.endpoint },
    [currentCandidate],
    sender,
    { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" },
    createId,
    new Date("2026-08-15T10:04:00Z"),
  );

  assert.deepEqual(result, { status: "sent" });
  assert.deepEqual(sent, [subscription.id]);
  assert.equal(deliveries.rows.size, 1);
  const [row] = [...deliveries.rows.values()];
  assert.equal(row?.userId, userA.id);
  assert.equal(row?.subscriptionId, subscription.id);
  assert.equal(row?.signalType, "frost");
  assert.equal(row?.urgency, "high");
  assert.equal(row?.deduplicationKey, currentCandidate.deduplicationKey);
  assert.equal(row?.deliveredAt, "2026-08-15T10:04:00.000Z");
  assert.deepEqual(await getNotificationPreferencesForUser(preferences, userA), { frost: true, watering: true, heat: true });
});

test("candidate delivery suppresses disabled, missing-preference and delivered candidates without sending", async () => {
  const preferences = new MemoryNotificationPreferenceRepository();
  const pushSubscriptions = new MemoryPushSubscriptionRepository();
  const deliveries = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const subscription = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("suppressed-device"), createId, new Date("2026-08-15T10:00:00Z"));
  const currentCandidate = deliverableCandidate();
  const sender: PushSender = async () => {
    throw new Error("suppressed candidates must not send");
  };
  const vapid = { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" };

  assert.deepEqual(
    await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userA, { endpoint: subscription.endpoint }, [currentCandidate], sender, vapid, createId, new Date("2026-08-15T10:01:00Z")),
    { status: "preference_disabled" },
  );

  await saveNotificationPreferencesForUser(preferences, userA, { frost: true, watering: false, heat: false }, createId, new Date("2026-08-15T10:02:00Z"));
  await recordNotificationCandidateDeliveryForUser(deliveries, userA, currentCandidate, subscription.id, createId, new Date("2026-08-15T10:03:00Z"));

  assert.deepEqual(
    await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userA, { endpoint: subscription.endpoint }, [currentCandidate], sender, vapid, createId, new Date("2026-08-15T10:04:00Z")),
    { status: "already_delivered" },
  );
  assert.equal(deliveries.rows.size, 1);
});

test("candidate delivery handles failed sends, invalid subscriptions and partial log failure safely", async () => {
  const preferences = new MemoryNotificationPreferenceRepository();
  const pushSubscriptions = new MemoryPushSubscriptionRepository();
  const deliveries = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const gone = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("candidate-gone"), createId, new Date("2026-08-15T10:00:00Z"));
  const failing = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("candidate-failing"), createId, new Date("2026-08-15T10:01:00Z"));
  const partial = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("candidate-partial"), createId, new Date("2026-08-15T10:02:00Z"));
  await saveNotificationPreferencesForUser(preferences, userA, { frost: true, watering: true, heat: true }, createId, new Date("2026-08-15T10:03:00Z"));
  const vapid = { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" };
  const currentCandidate = deliverableCandidate();

  assert.deepEqual(
    await sendNotificationCandidateForUser(
      { preferences, pushSubscriptions, deliveries },
      userA,
      { endpoint: gone.endpoint },
      [currentCandidate],
      async () => ({ ok: false, status: "subscription_invalid", statusCode: 410 }),
      vapid,
      createId,
      new Date("2026-08-15T10:04:00Z"),
    ),
    { status: "subscription_invalid" },
  );
  assert.equal(await pushSubscriptions.getActiveByEndpointForUser(userA.id, gone.endpoint), null);
  assert.equal(deliveries.rows.size, 0);

  assert.deepEqual(
    await sendNotificationCandidateForUser(
      { preferences, pushSubscriptions, deliveries },
      userA,
      { endpoint: failing.endpoint },
      [currentCandidate],
      async () => ({ ok: false, status: "failed", statusCode: 500 }),
      vapid,
      createId,
      new Date("2026-08-15T10:05:00Z"),
    ),
    { status: "failed" },
  );
  assert.equal((await pushSubscriptions.getActiveByEndpointForUser(userA.id, failing.endpoint))?.id, failing.id);
  assert.equal(deliveries.rows.size, 0);

  const partialDeliveries = new (class extends MemoryNotificationDeliveryRepository {
    override async recordDeliveredForUser(): Promise<NotificationDeliveryLogEntry> {
      throw new Error("D1 unavailable");
    }
  })();
  assert.deepEqual(
    await sendNotificationCandidateForUser(
      { preferences, pushSubscriptions, deliveries: partialDeliveries },
      userA,
      { endpoint: partial.endpoint },
      [currentCandidate],
      async () => ({ ok: true, status: "sent", statusCode: 201 }),
      vapid,
      createId,
      new Date("2026-08-15T10:06:00Z"),
    ),
    { status: "partial_success" },
  );
  assert.equal(partialDeliveries.rows.size, 0);
});

test("candidate delivery dedup is user-scoped and allows escalation with a different key", async () => {
  const preferences = new MemoryNotificationPreferenceRepository();
  const pushSubscriptions = new MemoryPushSubscriptionRepository();
  const deliveries = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const subscriptionA = await addPushSubscriptionForUser(pushSubscriptions, userA, fakeSubscription("dedup-a"), createId, new Date("2026-08-15T10:00:00Z"));
  const subscriptionB = await addPushSubscriptionForUser(pushSubscriptions, userB, fakeSubscription("dedup-b"), createId, new Date("2026-08-15T10:01:00Z"));
  await saveNotificationPreferencesForUser(preferences, userA, { frost: true, watering: true, heat: true }, createId, new Date("2026-08-15T10:02:00Z"));
  await saveNotificationPreferencesForUser(preferences, userB, { frost: true, watering: true, heat: true }, createId, new Date("2026-08-15T10:03:00Z"));
  const vapid = { subject: "mailto:test@example.com", publicKey: "public", privateKey: "private" };
  const sent: string[] = [];
  const sender: PushSender = async (subscription) => {
    sent.push(subscription.id);
    return { ok: true, status: "sent", statusCode: 201 };
  };
  const currentCandidate = deliverableCandidate();

  assert.deepEqual(await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userA, { endpoint: subscriptionA.endpoint }, [currentCandidate], sender, vapid, createId, new Date("2026-08-15T10:04:00Z")), { status: "sent" });
  assert.deepEqual(await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userA, { endpoint: subscriptionA.endpoint }, [currentCandidate], sender, vapid, createId, new Date("2026-08-15T10:05:00Z")), { status: "already_delivered" });
  assert.deepEqual(await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userB, { endpoint: subscriptionB.endpoint }, [currentCandidate], sender, vapid, createId, new Date("2026-08-15T10:06:00Z")), { status: "sent" });

  const escalated = deliverableCandidate({ id: "notification:escalated", urgency: "high", deduplicationKey: `${currentCandidate.deduplicationKey}:escalated` });
  assert.deepEqual(await sendNotificationCandidateForUser({ preferences, pushSubscriptions, deliveries }, userA, { endpoint: subscriptionA.endpoint }, [currentCandidate, escalated], sender, vapid, createId, new Date("2026-08-15T10:07:00Z")), { status: "sent" });
  assert.deepEqual(sent, [subscriptionA.id, subscriptionB.id, subscriptionA.id]);
  assert.equal(deliveries.rows.size, 3);
});

test("cross-account endpoint conflicts stay opaque and cannot be silently reassigned", async () => {
  const repository = new MemoryPushSubscriptionRepository();
  const createId = ids();

  await addPushSubscriptionForUser(repository, userA, fakeSubscription("shared-browser"), createId, new Date("2026-08-14T10:00:00Z"));

  await assert.rejects(
    () => addPushSubscriptionForUser(repository, userB, fakeSubscription("shared-browser"), createId, new Date("2026-08-14T10:01:00Z")),
    PushSubscriptionOwnershipConflictError,
  );

  assert.equal(await revokePushSubscriptionEndpointForUser(repository, userB, { endpoint: fakeSubscription("shared-browser").endpoint }), null);
  assert.equal((await listActivePushSubscriptionsForUser(repository, userA)).length, 1);
});

test("push subscription validation treats endpoint and keys as server-owned sensitive delivery data", () => {
  assert.deepEqual(validatePushSubscriptionInput(fakeSubscription("round-trip")), fakeSubscription("round-trip"));
  assert.throws(() => validatePushSubscriptionInput({ ...fakeSubscription("bad"), endpoint: "http://push.example.test/bad" }), /HTTPS/);
  assert.throws(() => validatePushSubscriptionInput({ ...fakeSubscription("bad"), userId: "client-user" }), NotificationInfrastructureInputError);
  assert.deepEqual(validateRevokePushSubscriptionInput({ endpoint: "https://push.example.test/revoke" }), { endpoint: "https://push.example.test/revoke" });
  assert.throws(() => validateRevokePushSubscriptionInput({ endpoint: "http://push.example.test/revoke" }), /HTTPS/);

  const actions = read("src/lib/notification-infrastructure/actions.ts");
  const pushCard = read("src/components/PushNotificationsCard.tsx");
  assert.doesNotMatch(`${actions}\n${pushCard}`, /p256dh|auth:/);
});

test("deduplication state is user-level and allows different users to share the same key", async () => {
  const repository = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const input = notificationDeliveryInputFromCandidate(candidate(), "subscription-a");

  const first = await recordNotificationDeliveryForUser(repository, userA, input, createId, new Date("2026-08-14T10:00:00Z"));
  const duplicateDevice = await recordNotificationDeliveryForUser(repository, userA, { ...input, subscriptionId: "subscription-b" }, createId, new Date("2026-08-14T10:01:00Z"));
  const otherUser = await recordNotificationDeliveryForUser(repository, userB, input, createId, new Date("2026-08-14T10:02:00Z"));

  assert.equal(first.subscriptionId, "subscription-a");
  assert.equal(duplicateDevice.id, first.id);
  assert.equal(otherUser.userId, "user-b");
  assert.equal(await hasNotificationDeliveryForUser(repository, userA, input.deduplicationKey), true);
  assert.equal(repository.rows.size, 2);
});

test("escalated candidate state stores a separate deduplication key", async () => {
  const repository = new MemoryNotificationDeliveryRepository();
  const createId = ids();
  const attention = candidate({ id: "notification:frost-attention", urgency: "normal", deduplicationKey: "weather:frost:window:attention:normal" });
  const important = candidate({ id: "notification:frost-important", urgency: "high", deduplicationKey: "weather:frost:window:important:high" });

  await recordNotificationCandidateDeliveryForUser(repository, userA, attention, null, createId, new Date("2026-08-14T10:00:00Z"));
  await recordNotificationCandidateDeliveryForUser(repository, userA, important, null, createId, new Date("2026-08-14T10:01:00Z"));

  assert.equal(repository.rows.size, 2);
  assert.equal(await hasNotificationDeliveryForUser(repository, userA, attention.deduplicationKey), true);
  assert.equal(await hasNotificationDeliveryForUser(repository, userA, important.deduplicationKey), true);
});

test("ordinary pages and signal evaluation do not write delivery state or build push delivery", () => {
  const todayPage = read("src/app/idag/page.tsx");
  const weatherPage = read("src/app/vader/page.tsx");
  const notificationsServer = read("src/lib/notifications/server.ts");
  const signalsServer = read("src/lib/signals/server.ts");
  const pushClient = read("src/lib/push/client.ts");
  const pushServer = read("src/lib/push/server.ts");
  const pushSender = read("src/lib/push/sender.ts");
  const pushPayload = read("src/lib/push/payload.ts");
  const profilePage = read("src/app/profil/page.tsx");
  const serviceWorker = read("public/sw.js");

  assert.doesNotMatch(`${todayPage}\n${weatherPage}\n${notificationsServer}\n${signalsServer}`, /recordNotification|notificationDelivery|pushSubscriptions|serviceWorker|PushManager|VAPID|Cron|Queue|scheduled|sendPush/i);
  assert.doesNotMatch(`${pushServer}\n${pushClient}\n${profilePage}`, /createVapidJwt|encryptPayload|deliverCandidate|processNotificationQueue|runNotificationCron|showNotification|notificationclick|fetch\(/i);
  assert.match(pushSender, /@block65\/webcrypto-web-push/);
  assert.match(serviceWorker, /skipWaiting/);
  assert.match(serviceWorker, /clients\.claim/);
  assert.match(serviceWorker, /showNotification/);
  assert.match(serviceWorker, /notificationclick/);
  assert.match(pushPayload, /pushNotificationPayloadFromCandidate/);
  assert.doesNotMatch(`${pushSender}\n${serviceWorker}`, /NotificationCandidate|buildNotificationCandidates|buildWeatherSignals|FrostAssessment|WaterAssessment|HeatAssessment/i);
  assert.doesNotMatch(pushPayload, /buildNotificationCandidates|buildWeatherSignals|FrostAssessment|WaterAssessment|HeatAssessment/i);
  assert.doesNotMatch(serviceWorker, /caches\.|addEventListener\(["']fetch["']/i);
  assert.doesNotMatch(`${pushSender}\n${pushPayload}`, /notification_delivery_log|recordNotificationDelivery|recordDeliveredForUser/i);
});

test("profile UI copy is honest about future push notifications", () => {
  const page = read("src/app/profil/page.tsx");
  const form = read("src/components/NotificationPreferencesForm.tsx");
  const actions = read("src/lib/notification-infrastructure/actions.ts");
  const pushCard = read("src/components/PushNotificationsCard.tsx");
  const pushClient = read("src/lib/push/client.ts");
  const combined = `${page}\n${form}\n${actions}\n${pushCard}`;

  assert.match(page, /getCurrentUserNotificationPreferences/);
  assert.match(form, /Välj vilka typer av odlingsnotiser du vill kunna få när pushnotiser aktiveras/);
  assert.match(form, /Pushnotiser aktiveras i ett senare steg/);
  assert.match(form, /Frostvarningar/);
  assert.match(form, /Bevattningspåminnelser/);
  assert.match(form, /Värmesignaler/);
  assert.match(pushCard, /Pushnotiser kräver tillåtelse från din webbläsare\. Du kan stänga av dem igen när du vill\./);
  assert.match(pushCard, /Aktivera pushnotiser/);
  assert.match(pushCard, /Stäng av pushnotiser på den här enheten/);
  assert.equal((pushCard.match(/Pushnotiser är aktiverade på den här enheten\./g) ?? []).length, 1);
  assert.match(pushClient, /På iPhone och iPad kan Grobiggis behöva läggas till på hemskärmen för att använda pushnotiser\./);
  assert.match(form, /notification-preferences-intent/);
  assert.match(form, /isExplicitPreferenceSave/);
  assert.match(pushCard, /onClick=\{activate\}[\s\S]*type="button"/);
  assert.match(pushCard, /onClick=\{deactivate\}[\s\S]*type="button"/);
  assert.match(pushCard, /Skicka testnotis/);
  assert.match(pushCard, /sendTestPushAction/);
  assert.match(pushCard, /Skicka aktuell notis/);
  assert.match(pushCard, /sendNotificationCandidateAction/);
  assert.match(actions, /revalidatePath\("\/profil"\)/);
  assert.doesNotMatch(`${page}\n${form}\n${actions}`, /Notification\.requestPermission|navigator\.serviceWorker|PushManager/i);
  assert.doesNotMatch(combined, /createVapidJwt|encryptPayload|delivery_log/i);
});
