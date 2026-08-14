import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { notificationDeliveryLog, notificationPreferences, pushSubscriptions } from "../src/db/schema.ts";
import {
  NotificationInfrastructureInputError,
  disabledNotificationPreferenceSettings,
  notificationDeliveryInputFromCandidate,
  validateNotificationSignalType,
  validatePushSubscriptionInput,
  validateSaveNotificationPreferencesInput,
  type NotificationDeliveryLogEntry,
  type NotificationPreference,
  type PushSubscription,
} from "../src/domain/notification-infrastructure.ts";
import type { NotificationCandidate } from "../src/domain/notification-policy.ts";
import {
  addPushSubscriptionForUser,
  getNotificationPreferencesForUser,
  hasNotificationDeliveryForUser,
  listActivePushSubscriptionsForUser,
  recordNotificationCandidateDeliveryForUser,
  recordNotificationDeliveryForUser,
  revokePushSubscriptionForUser,
  saveNotificationPreferencesForUser,
} from "../src/lib/notification-infrastructure/service.ts";
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

  async revokeForUser(userId: string, subscriptionId: string, revokedAt: string) {
    const row = this.rows.get(subscriptionId);
    if (!row || row.userId !== userId) return null;
    const snapshot = { ...row, revokedAt, updatedAt: revokedAt };
    this.rows.set(subscriptionId, snapshot);
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
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|md|json)$/.test(entry) ? [path] : [];
  });
}

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
  await assert.rejects(() => addPushSubscriptionForUser(repository, userB, fakeSubscription("a"), createId), /already belongs/);
  assert.equal(await revokePushSubscriptionForUser(repository, userB, first.id), null);

  const revoked = await revokePushSubscriptionForUser(repository, userA, first.id, new Date("2026-08-14T10:03:00Z"));
  assert.equal(revoked?.revokedAt, "2026-08-14T10:03:00.000Z");
  assert.deepEqual((await listActivePushSubscriptionsForUser(repository, userA)).map((row) => row.id), [second.id]);
});

test("push subscription validation treats endpoint and keys as server-owned sensitive delivery data", () => {
  assert.deepEqual(validatePushSubscriptionInput(fakeSubscription("round-trip")), fakeSubscription("round-trip"));
  assert.throws(() => validatePushSubscriptionInput({ ...fakeSubscription("bad"), endpoint: "http://push.example.test/bad" }), /HTTPS/);
  assert.throws(() => validatePushSubscriptionInput({ ...fakeSubscription("bad"), userId: "client-user" }), NotificationInfrastructureInputError);

  const profilePage = read("src/app/profil/page.tsx");
  const preferenceForm = read("src/components/NotificationPreferencesForm.tsx");
  assert.doesNotMatch(`${profilePage}\n${preferenceForm}`, /endpoint|p256dh|auth:|PushManager|Notification\.requestPermission|serviceWorker|VAPID/);
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
  const infrastructureServer = read("src/lib/notification-infrastructure/server.ts");
  const infrastructureActions = read("src/lib/notification-infrastructure/actions.ts");
  const publicSource = sourceFiles("public").map((file) => read(file)).join("\n");

  assert.doesNotMatch(`${todayPage}\n${weatherPage}\n${notificationsServer}\n${signalsServer}`, /recordNotification|notificationDelivery|pushSubscriptions|serviceWorker|PushManager|VAPID|Cron|Queue|scheduled|sendPush/i);
  assert.doesNotMatch(`${infrastructureServer}\n${infrastructureActions}`, /PushManager|Notification\.requestPermission|serviceWorker|VAPID|sendPush|deliverCandidate|processNotificationQueue|runNotificationCron/i);
  assert.doesNotMatch(publicSource, /service-worker\.js|sw\.js|VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|PushManager|serviceWorker/i);
});

test("profile UI copy is honest about future push notifications", () => {
  const page = read("src/app/profil/page.tsx");
  const form = read("src/components/NotificationPreferencesForm.tsx");
  const actions = read("src/lib/notification-infrastructure/actions.ts");
  const combined = `${page}\n${form}\n${actions}`;

  assert.match(page, /getCurrentUserNotificationPreferences/);
  assert.match(form, /Välj vilka typer av odlingsnotiser du vill kunna få när pushnotiser aktiveras/);
  assert.match(form, /Pushnotiser aktiveras i ett senare steg/);
  assert.match(form, /Frostvarningar/);
  assert.match(form, /Bevattningspåminnelser/);
  assert.match(form, /Värmesignaler/);
  assert.match(actions, /revalidatePath\("\/profil"\)/);
  assert.doesNotMatch(combined, /Aktivera pushnotiser|Du får nu notiser|Tillåt notiser|navigator|permission/i);
});
