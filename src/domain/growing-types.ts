import type { SpaceType, SunExposure } from "@/data/plant-types";

export type GrowingStartType = "seed" | "direct" | "purchased" | "divided" | "established";
export type PurchasedStage = "small" | "established" | "flowering" | "fruiting";
export type GrowingBatchStatus = "active" | "completed";
export type GrowingEventType =
  | "sådd"
  | "direktsådd"
  | "inköp"
  | "plantering"
  | "omplantering"
  | "avhärdning"
  | "utplantering"
  | "blomning"
  | "frukt"
  | "skörd"
  | "avslutad";
export type PlanEventStatus = "planned" | "done" | "postponed" | "irrelevant";
export type TaskPriority = "Hög" | "Normal" | "Låg";

export interface ActualGrowingEvent {
  id: string;
  batchId: string;
  plantId: string;
  type: GrowingEventType;
  occurredOn: string;
  note?: string;
}

export interface GrowingBatch {
  id: string;
  plantId: string;
  variety?: string;
  startType: GrowingStartType;
  startDate?: string;
  purchasedStage?: PurchasedStage;
  status: GrowingBatchStatus;
  completedAt?: string;
  actualEvents: ActualGrowingEvent[];
}

export interface PlanDateRange {
  from: string;
  to: string;
}

export interface PlannedGrowingEvent extends PlanDateRange {
  id: string;
  batchId: string;
  plantId: string;
  type: GrowingEventType;
  title: string;
  status: PlanEventStatus;
  reason: string;
  source: "calculated" | "actual";
}

export interface GrowingPlan {
  batchId: string;
  plantId: string;
  events: PlannedGrowingEvent[];
  history: ActualGrowingEvent[];
  warning?: string;
}

export interface PlantPlacement {
  id: string;
  spaceId: string;
  plantId: string;
  batchId: string;
  x: number;
  y: number;
}

export interface GrowingSpace {
  id: string;
  name: string;
  type: SpaceType;
  sun: SunExposure;
  plantIds: string[];
  placements: PlantPlacement[];
}

export interface TodayTask extends PlanDateRange {
  id: string;
  batchId?: string;
  plantId?: string;
  title: string;
  priority: TaskPriority;
  state: "pending" | "done" | "snoozed";
}
