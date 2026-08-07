import type { GrowingBatch, PlannedGrowingEvent, TodayTask } from "./growing-types.ts";

export function visiblePlanEventsForBatches(events: PlannedGrowingEvent[], batches: GrowingBatch[]) {
  const completed = new Set(batches.filter((batch) => batch.status === "completed").map((batch) => batch.id));
  return events.filter((event) => event.status === "done" || !completed.has(event.batchId));
}

export function visibleTodayTasksForBatches(tasks: TodayTask[], batches: GrowingBatch[]) {
  const completed = new Set(batches.filter((batch) => batch.status === "completed").map((batch) => batch.id));
  return tasks.filter((task) => task.state === "done" || !task.batchId || !completed.has(task.batchId));
}
