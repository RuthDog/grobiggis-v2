import type { TodayTask } from "./growing-types.ts";
import { shiftDate } from "./growing-plan.ts";

const priorityWeight: Record<TodayTask["priority"], number> = { "Hög": 0, "Normal": 1, "Låg": 2 };

export function prioritizeTodayTasks(tasks: TodayTask[]) {
  return [...tasks].sort((left, right) => priorityWeight[left.priority] - priorityWeight[right.priority] || left.from.localeCompare(right.from));
}

export function completeTodayTask(tasks: TodayTask[], id: string) {
  return tasks.map((task) => (task.id === id ? { ...task, state: "done" as const } : task));
}

export function postponeTodayTask(tasks: TodayTask[], id: string, days = 1) {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          state: "snoozed" as const,
          from: shiftDate(task.from, days),
          to: shiftDate(task.to, days),
        }
      : task,
  );
}

export function taskFromPlanEvent(event: { id: string; batchId: string; plantId: string; title: string; from: string; to: string }): TodayTask {
  return {
    id: `today:${event.id}`,
    batchId: event.batchId,
    plantId: event.plantId,
    title: event.title,
    from: event.from,
    to: event.to,
    priority: "Normal",
    state: "pending",
  };
}
