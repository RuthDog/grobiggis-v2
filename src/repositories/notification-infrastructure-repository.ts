import { and, eq, isNull } from "drizzle-orm";
import type { GrobiggisDb } from "../db/client.ts";
import {
  notificationDeliveryLog,
  notificationPreferences,
  pushSubscriptions,
  type NotificationDeliveryLogRow,
  type NotificationPreferenceRow,
  type PushSubscriptionRow,
} from "../db/schema.ts";
import type {
  NotificationDeliveryLogEntry,
  NotificationPreference,
  PushSubscription,
} from "../domain/notification-infrastructure.ts";

export interface NotificationPreferenceRepository {
  listForUser(userId: string): Promise<NotificationPreference[]>;
  upsertForUser(userId: string, preference: NotificationPreference): Promise<NotificationPreference>;
}

export interface PushSubscriptionRepository {
  addOrRefreshForUser(userId: string, subscription: PushSubscription): Promise<PushSubscription>;
  listActiveForUser(userId: string): Promise<PushSubscription[]>;
  revokeForUser(userId: string, subscriptionId: string, revokedAt: string): Promise<PushSubscription | null>;
}

export interface NotificationDeliveryRepository {
  getByDeduplicationKeyForUser(userId: string, deduplicationKey: string): Promise<NotificationDeliveryLogEntry | null>;
  hasDeliveredForUser(userId: string, deduplicationKey: string): Promise<boolean>;
  recordDeliveredForUser(userId: string, entry: NotificationDeliveryLogEntry): Promise<NotificationDeliveryLogEntry>;
}

export function rowToNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    id: row.id,
    userId: row.userId,
    signalType: row.signalType,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function notificationPreferenceToRow(preference: NotificationPreference) {
  return {
    id: preference.id,
    userId: preference.userId,
    signalType: preference.signalType,
    enabled: preference.enabled,
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  };
}

export function rowToPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    revokedAt: row.revokedAt,
  };
}

export function pushSubscriptionToRow(subscription: PushSubscription) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    revokedAt: subscription.revokedAt,
  };
}

export function rowToNotificationDeliveryLogEntry(row: NotificationDeliveryLogRow): NotificationDeliveryLogEntry {
  return {
    id: row.id,
    userId: row.userId,
    candidateId: row.candidateId,
    signalId: row.signalId,
    deduplicationKey: row.deduplicationKey,
    signalType: row.signalType,
    urgency: row.urgency,
    subscriptionId: row.subscriptionId,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
  };
}

export function notificationDeliveryLogEntryToRow(entry: NotificationDeliveryLogEntry) {
  return {
    id: entry.id,
    userId: entry.userId,
    candidateId: entry.candidateId,
    signalId: entry.signalId,
    deduplicationKey: entry.deduplicationKey,
    signalType: entry.signalType,
    urgency: entry.urgency,
    subscriptionId: entry.subscriptionId,
    deliveredAt: entry.deliveredAt,
    createdAt: entry.createdAt,
  };
}

export class DrizzleNotificationPreferenceRepository implements NotificationPreferenceRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async listForUser(userId: string) {
    const rows = await this.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return rows.map(rowToNotificationPreference).toSorted((left, right) => left.signalType.localeCompare(right.signalType));
  }

  async upsertForUser(userId: string, preference: NotificationPreference) {
    const [existing] = await this.db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.signalType, preference.signalType)))
      .limit(1);

    const snapshot = {
      ...structuredClone(preference),
      userId,
      id: existing?.id ?? preference.id,
      createdAt: existing?.createdAt ?? preference.createdAt,
    };

    if (!existing) {
      try {
        await this.db.insert(notificationPreferences).values(notificationPreferenceToRow(snapshot));
        return snapshot;
      } catch (error) {
        if (!(error instanceof Error) || !/unique|constraint/i.test(error.message)) throw error;
      }
    }

    await this.db
      .update(notificationPreferences)
      .set({
        enabled: snapshot.enabled,
        updatedAt: snapshot.updatedAt,
      })
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.signalType, snapshot.signalType)));

    const [updated] = await this.db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.signalType, snapshot.signalType)))
      .limit(1);

    return updated ? rowToNotificationPreference(updated) : snapshot;
  }
}

export class DrizzlePushSubscriptionRepository implements PushSubscriptionRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async addOrRefreshForUser(userId: string, subscription: PushSubscription) {
    const existing = await this.findByEndpoint(subscription.endpoint);
    if (existing && existing.userId !== userId) throw new Error("Push subscription endpoint already belongs to another user.");

    const snapshot = {
      ...structuredClone(subscription),
      userId,
      id: existing?.id ?? subscription.id,
      createdAt: existing?.createdAt ?? subscription.createdAt,
      revokedAt: null,
    };

    if (!existing) {
      try {
        await this.db.insert(pushSubscriptions).values(pushSubscriptionToRow(snapshot));
        return snapshot;
      } catch (error) {
        if (!(error instanceof Error) || !/unique|constraint/i.test(error.message)) throw error;
      }
    }

    const duplicate = await this.findByEndpoint(subscription.endpoint);
    if (!duplicate || duplicate.userId !== userId) throw new Error("Push subscription endpoint already belongs to another user.");

    await this.db
      .update(pushSubscriptions)
      .set({
        p256dh: snapshot.p256dh,
        auth: snapshot.auth,
        updatedAt: snapshot.updatedAt,
        revokedAt: null,
      })
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, snapshot.endpoint)));

    return {
      ...duplicate,
      p256dh: snapshot.p256dh,
      auth: snapshot.auth,
      updatedAt: snapshot.updatedAt,
      revokedAt: null,
    };
  }

  async listActiveForUser(userId: string) {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), isNull(pushSubscriptions.revokedAt)));

    return rows.map(rowToPushSubscription).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async revokeForUser(userId: string, subscriptionId: string, revokedAt: string) {
    const [row] = await this.db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.id, subscriptionId)))
      .limit(1);

    if (!row) return null;

    await this.db
      .update(pushSubscriptions)
      .set({ revokedAt, updatedAt: revokedAt })
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.id, subscriptionId)));

    return rowToPushSubscription({ ...row, revokedAt, updatedAt: revokedAt });
  }

  private async findByEndpoint(endpoint: string) {
    const [row] = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
    return row ? rowToPushSubscription(row) : null;
  }
}

export class DrizzleNotificationDeliveryRepository implements NotificationDeliveryRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async getByDeduplicationKeyForUser(userId: string, deduplicationKey: string) {
    const [row] = await this.db
      .select()
      .from(notificationDeliveryLog)
      .where(and(eq(notificationDeliveryLog.userId, userId), eq(notificationDeliveryLog.deduplicationKey, deduplicationKey)))
      .limit(1);

    return row ? rowToNotificationDeliveryLogEntry(row) : null;
  }

  async hasDeliveredForUser(userId: string, deduplicationKey: string) {
    return Boolean(await this.getByDeduplicationKeyForUser(userId, deduplicationKey));
  }

  async recordDeliveredForUser(userId: string, entry: NotificationDeliveryLogEntry) {
    const existing = await this.getByDeduplicationKeyForUser(userId, entry.deduplicationKey);
    if (existing) return existing;

    const snapshot = { ...structuredClone(entry), userId };

    try {
      await this.db.insert(notificationDeliveryLog).values(notificationDeliveryLogEntryToRow(snapshot));
      return snapshot;
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        const duplicate = await this.getByDeduplicationKeyForUser(userId, entry.deduplicationKey);
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }
}
