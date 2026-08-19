import { hasNotificationCandidateExpired, sortNotificationCandidates, type NotificationCandidate } from "../../domain/notification-policy.ts";
import { isNotificationSignalType, type NotificationPreferenceSettings } from "../../domain/notification-infrastructure.ts";
import { safePushHref } from "../push/payload.ts";

export type DeliverableNotificationCandidateSelection =
  | { status: "selected"; candidate: NotificationCandidate }
  | { status: "none_available" | "preference_disabled" | "already_delivered" };

export function selectDeliverableNotificationCandidate({
  candidates,
  preferences,
  deliveredKeys,
  now = new Date(),
}: {
  candidates: NotificationCandidate[];
  preferences: NotificationPreferenceSettings;
  deliveredKeys: ReadonlySet<string>;
  now?: Date;
}): DeliverableNotificationCandidateSelection {
  const currentCandidates = sortNotificationCandidates(candidates).filter((candidate) => {
    if (!isNotificationSignalType(candidate.type)) return false;
    if (!candidate.deduplicationKey.trim()) return false;
    if (safePushHref(candidate.href, "") !== candidate.href) return false;
    return !hasNotificationCandidateExpired(candidate, now);
  });

  if (!currentCandidates.length) return { status: "none_available" };

  const preferenceEnabledCandidates = currentCandidates.filter((candidate) => preferences[candidate.type]);
  if (!preferenceEnabledCandidates.length) return { status: "preference_disabled" };

  const candidate = preferenceEnabledCandidates.find((item) => !deliveredKeys.has(item.deduplicationKey));
  if (!candidate) return { status: "already_delivered" };

  return { status: "selected", candidate };
}
