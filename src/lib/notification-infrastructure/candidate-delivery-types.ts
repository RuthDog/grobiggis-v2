import type { NotificationUrgency } from "@/domain/notification-policy";
import type { SignalType } from "@/domain/signals";

export type NotificationCandidatePreview =
  | {
      status: "available";
      candidate: {
        type: SignalType;
        urgency: NotificationUrgency;
        title: string;
        body: string;
        href: string;
      };
    }
  | { status: "none_available" | "preference_disabled" | "already_delivered" };

export type SendNotificationCandidateStatus =
  | "sent"
  | "none_available"
  | "preference_disabled"
  | "already_delivered"
  | "subscription_invalid"
  | "partial_success"
  | "failed";

export type SendNotificationCandidateResult = { status: SendNotificationCandidateStatus };
