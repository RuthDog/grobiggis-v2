export type GrowingStartType = "seed" | "direct" | "purchased" | "divided" | "established";
export type PurchasedStage = "small" | "established" | "flowering" | "fruiting";
export type GrowingBatchStatus = "active" | "completed";
export type GrowingSpaceType = "raised_bed" | "greenhouse" | "open_ground" | "pot";
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
  userId: string;
  spaceId: string;
  batchId: string;
  placedAt: string;
  removedAt?: string;
}

export interface GrowingSpace {
  id: string;
  userId: string;
  name: string;
  type: GrowingSpaceType;
  createdAt: string;
  updatedAt: string;
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
