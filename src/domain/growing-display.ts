import type { GrowingBatch, GrowingBatchStatus, GrowingStartType, PlanEventStatus } from "./growing-types.ts";
import { formatSwedishDateRange } from "./plan-presentation.ts";

export const startTypeLabels: Record<GrowingStartType, string> = {
  seed: "Frö / förodling",
  direct: "Direktsådd",
  purchased: "Köpt planta",
  divided: "Delad/förökad planta",
  established: "Redan etablerad",
};

export const batchStatusLabels: Record<GrowingBatchStatus, string> = {
  active: "Aktiv",
  completed: "Avslutad",
};

export const planEventStatusLabels: Record<PlanEventStatus, string> = {
  planned: "Planerad",
  done: "Genomförd",
  postponed: "Senarelagd",
  irrelevant: "Inte längre relevant",
};

export function startTypeLabel(startType: GrowingStartType) {
  return startTypeLabels[startType];
}

export function batchStatusLabel(status: GrowingBatchStatus) {
  return batchStatusLabels[status];
}

export function planEventStatusLabel(status: PlanEventStatus) {
  return planEventStatusLabels[status];
}

export function batchDisplayName(batch: GrowingBatch, plantName: string) {
  return batch.variety ? `${plantName} · ${batch.variety}` : plantName;
}

export function batchStartLabel(batch: GrowingBatch) {
  return batch.startDate ? `Startad ${formatSwedishDateRange({ from: batch.startDate, to: batch.startDate })}` : "Startdatum saknas";
}
