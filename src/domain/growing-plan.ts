import type { CatalogPlant } from "@/data/plant-types";
import type {
  ActualGrowingEvent,
  GrowingBatch,
  GrowingEventType,
  GrowingPlan,
  GrowingStartType,
  PlanDateRange,
  PlannedGrowingEvent,
  PurchasedStage,
} from "./growing-types.ts";

const eventTitles: Record<GrowingEventType, string> = {
  "sådd": "Sådd",
  "direktsådd": "Direktsådd",
  "inköp": "Köpt planta",
  "plantering": "Plantering",
  "omplantering": "Omplantering",
  "avhärdning": "Avhärdning",
  "utplantering": "Utplantering",
  "blomning": "Blomning",
  "frukt": "Fruktsättning",
  "skörd": "Skörd",
  "avslutad": "Avslutad",
};

const ranges: Record<GrowingStartType, Partial<Record<GrowingEventType, [number, number]>>> = {
  seed: { omplantering: [18, 28], avhärdning: [48, 62], utplantering: [58, 75], blomning: [85, 115], frukt: [105, 140], skörd: [125, 175] },
  direct: { blomning: [45, 75], frukt: [60, 95], skörd: [35, 115] },
  purchased: { avhärdning: [2, 8], utplantering: [7, 16], blomning: [20, 55], frukt: [40, 80], skörd: [55, 110] },
  divided: { blomning: [35, 80], skörd: [70, 130] },
  established: { blomning: [20, 70], skörd: [55, 125] },
};

const stageSkip: Record<PurchasedStage, GrowingEventType[]> = {
  small: [],
  established: ["avhärdning"],
  flowering: ["avhärdning", "utplantering", "blomning"],
  fruiting: ["avhärdning", "utplantering", "blomning", "frukt"],
};

const purchasedBase: Partial<Record<PurchasedStage, number>> = {
  small: 0,
  established: 7,
  flowering: 20,
  fruiting: 40,
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function createGrowingBatch(
  input: Omit<GrowingBatch, "id" | "status" | "actualEvents"> & Partial<Pick<GrowingBatch, "id" | "status" | "actualEvents">>,
  idFactory: () => string = () => crypto.randomUUID(),
): GrowingBatch {
  return {
    ...input,
    id: input.id ?? idFactory(),
    status: input.status ?? "active",
    actualEvents: input.actualEvents ?? [],
  };
}

export function recordActualEvent(
  batch: GrowingBatch,
  type: GrowingEventType,
  occurredOn: string,
  idFactory: () => string = () => crypto.randomUUID(),
): GrowingBatch {
  const event: ActualGrowingEvent = {
    id: idFactory(),
    batchId: batch.id,
    plantId: batch.plantId,
    type,
    occurredOn,
  };

  return { ...batch, actualEvents: [...batch.actualEvents, event] };
}

export function completeGrowingBatch(batch: GrowingBatch, completedAt: string): GrowingBatch {
  return {
    ...batch,
    status: "completed",
    completedAt,
  };
}

export function completeBatchById(batches: GrowingBatch[], batchId: string, completedAt: string) {
  return batches.map((batch) => (batch.id === batchId ? completeGrowingBatch(batch, completedAt) : batch));
}

function latestActualEvent(batch: GrowingBatch) {
  return batch.actualEvents.toSorted((left, right) => right.occurredOn.localeCompare(left.occurredOn))[0];
}

function completedHistoryEvent(batch: GrowingBatch): ActualGrowingEvent | undefined {
  if (!batch.completedAt) return undefined;

  return {
    id: `${batch.id}:avslutad`,
    batchId: batch.id,
    plantId: batch.plantId,
    type: "avslutad",
    occurredOn: batch.completedAt,
  };
}

export function actualEventAsPlanEvent(event: ActualGrowingEvent): PlannedGrowingEvent {
  return {
    id: `${event.batchId}:${event.type}:actual:${event.id}`,
    batchId: event.batchId,
    plantId: event.plantId,
    type: event.type,
    title: eventTitles[event.type],
    from: event.occurredOn,
    to: event.occurredOn,
    status: "done",
    reason: "Faktiskt registrerad händelse.",
    source: "actual",
  };
}

export function planDateRangeForPlant(plant: CatalogPlant, timingKey: keyof CatalogPlant["timing"], year: number): PlanDateRange | undefined {
  const range = plant.timing[timingKey];
  if (!range) return undefined;
  const [from, to] = range;
  return {
    from: `${year}-${String(from).padStart(2, "0")}-01`,
    to: `${year}-${String(to).padStart(2, "0")}-${new Date(Date.UTC(year, to, 0)).getUTCDate()}`,
  };
}

export function planBatch(batch: GrowingBatch, plants: CatalogPlant[]): GrowingPlan {
  const plant = plants.find((item) => item.id === batch.plantId);
  const history = [...batch.actualEvents, completedHistoryEvent(batch)].filter((item): item is ActualGrowingEvent => Boolean(item));

  if (!plant) {
    return {
      batchId: batch.id,
      plantId: batch.plantId,
      events: history.map(actualEventAsPlanEvent),
      history,
      warning: `Okänd växt: ${batch.plantId}`,
    };
  }

  if (batch.status === "completed") {
    return {
      batchId: batch.id,
      plantId: batch.plantId,
      events: history.map(actualEventAsPlanEvent),
      history,
    };
  }

  const latest = latestActualEvent(batch);
  const anchor = latest?.occurredOn ?? batch.startDate;
  if (!anchor) {
    return {
      batchId: batch.id,
      plantId: batch.plantId,
      events: history.map(actualEventAsPlanEvent),
      history,
      warning: "Startdatum saknas.",
    };
  }

  const startRanges = ranges[batch.startType];
  const skipped = batch.startType === "purchased" && batch.purchasedStage ? stageSkip[batch.purchasedStage] : [];
  const stageBase = batch.startType === "purchased" && batch.purchasedStage ? purchasedBase[batch.purchasedStage] ?? 0 : 0;
  const offsetBase = latest ? startRanges[latest.type]?.[0] ?? stageBase : stageBase;
  const completedTypes = new Set(batch.actualEvents.map((event) => event.type));

  const planned = Object.entries(startRanges)
    .filter(([type, span]) => {
      const eventType = type as GrowingEventType;
      return Boolean(span) && !skipped.includes(eventType) && !completedTypes.has(eventType) && span![1] > offsetBase;
    })
    .map(([type, span]) => {
      const eventType = type as GrowingEventType;
      const [fromOffset, toOffset] = span!;
      return {
        id: `${batch.id}:${eventType}`,
        batchId: batch.id,
        plantId: batch.plantId,
        type: eventType,
        title: eventTitles[eventType],
        from: shiftDate(anchor, Math.max(0, fromOffset - offsetBase)),
        to: shiftDate(anchor, Math.max(1, toOffset - offsetBase)),
        status: "planned" as const,
        reason: `Beräknat från ${latest ? "senaste registrerade händelse" : "startdatum"}.`,
        source: "calculated" as const,
      };
    });

  return {
    batchId: batch.id,
    plantId: batch.plantId,
    events: [...history.map(actualEventAsPlanEvent), ...planned].toSorted((left, right) => left.from.localeCompare(right.from) || left.id.localeCompare(right.id)),
    history,
  };
}

export function planBatches(batches: GrowingBatch[], plants: CatalogPlant[]) {
  return batches.map((batch) => planBatch(batch, plants));
}
