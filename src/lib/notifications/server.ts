import type { NotificationCandidate } from "@/domain/notification-policy";
import { buildNotificationCandidates } from "@/domain/notification-policy";
import type { GrowingBatch, GrowingSpace } from "@/domain/growing-types";
import type { VerifiedGrowingUser } from "@/lib/growing/service";
import { getSignalsForUser } from "@/lib/signals/server";

export async function getNotificationCandidatesForUser(user: VerifiedGrowingUser, activeBatches: GrowingBatch[], spaces: GrowingSpace[] = [], now = new Date()): Promise<NotificationCandidate[]> {
  const signals = await getSignalsForUser(user, activeBatches, spaces, now);
  return buildNotificationCandidates(signals, now);
}
