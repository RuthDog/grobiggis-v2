import { plants } from "../data/plants.ts";
import { batchDisplayName, batchStartLabel } from "./growing-display.ts";
import { planBatch, shiftDate } from "./growing-plan.ts";
import type { GrowingBatch, PlannedGrowingEvent } from "./growing-types.ts";
import { formatSwedishDateRange, sortPlanItems } from "./plan-presentation.ts";
import { visibleTodayTasksForBatches } from "./task-visibility.ts";
import { localGreeting, type LocalGreeting, stockholmDateISO } from "./greeting.ts";
import { taskFromPlanEvent } from "./today-tasks.ts";

export type TodayActivity = {
  id: string;
  batchId: string;
  plantId: string;
  planEventId: string;
  eventType: PlannedGrowingEvent["type"];
  plantName: string;
  batchName: string;
  batchStartLabel: string;
  title: string;
  from: string;
  to: string;
  dateLabel: string;
  reason: string;
  href: string;
};

export type TodaySections = {
  today: TodayActivity[];
  now: TodayActivity[];
  next: TodayActivity[];
};

export type TodayView = {
  greeting: LocalGreeting;
  activeBatchCount: number;
  activeBatches: GrowingBatch[];
  sections: TodaySections;
};

function prioritizeActivities(activities: TodayActivity[]) {
  return [...activities].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.id.localeCompare(right.id));
}

function activityFromEvent(batch: GrowingBatch, event: PlannedGrowingEvent) {
  const plant = plants.find((item) => item.id === batch.plantId);
  const plantName = plant?.name ?? "Okand vaxt";

  return {
    id: `today:${event.id}`,
    batchId: batch.id,
    plantId: batch.plantId,
    planEventId: event.id,
    eventType: event.type,
    plantName,
    batchName: batchDisplayName(batch, plantName),
    batchStartLabel: batchStartLabel(batch),
    title: event.title,
    from: event.from,
    to: event.to,
    dateLabel: formatSwedishDateRange(event),
    reason: event.reason,
    href: `/min-plan/${batch.id}`,
  };
}

export function classifyTodayActivities(activities: TodayActivity[], todayISO: string, nextLimit = 3): TodaySections {
  const recentISO = shiftDate(todayISO, -3);
  const today = prioritizeActivities(activities.filter((activity) => activity.from <= todayISO && activity.to >= todayISO));
  const now = prioritizeActivities(
    activities.filter((activity) => activity.to < todayISO && activity.to >= recentISO && !today.some((item) => item.id === activity.id)),
  );
  const next = sortPlanItems(activities.filter((activity) => activity.from > todayISO)).slice(0, nextLimit);

  return { today, now, next };
}

export function buildTodayViewFromBatches(
  batches: GrowingBatch[],
  now = new Date(),
  options: { nextLimit?: number; timeZone?: string } = {},
): TodayView {
  const timeZone = options.timeZone ?? "Europe/Stockholm";
  const todayISO = stockholmDateISO(now, timeZone);
  const activeBatches = batches.filter((batch) => batch.status === "active");

  const plannedEvents = activeBatches.flatMap((batch) =>
    planBatch(batch, plants)
      .events.filter((event) => event.status === "planned")
      .map((event) => ({ batch, event })),
  );

  const visibleTaskIds = new Set(
    visibleTodayTasksForBatches(
      plannedEvents.map(({ event }) => taskFromPlanEvent(event)),
      activeBatches,
    ).map((task) => task.id),
  );

  const activities = plannedEvents
    .map(({ batch, event }) => activityFromEvent(batch, event))
    .filter((activity) => visibleTaskIds.has(activity.id));

  return {
    greeting: localGreeting(now, timeZone),
    activeBatchCount: activeBatches.length,
    activeBatches,
    sections: classifyTodayActivities(activities, todayISO, options.nextLimit ?? 3),
  };
}
