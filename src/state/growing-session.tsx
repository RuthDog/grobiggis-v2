"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { createGrowingBatch } from "@/domain/growing-plan";
import type { GrowingBatch, GrowingStartType } from "@/domain/growing-types";
import { growingSessionReducer, initialGrowingSessionState } from "./growing-session-reducer";

export type CreateBatchInput = {
  plantId: string;
  variety?: string;
  startType: GrowingStartType;
  startDate: string;
};

type GrowingSessionValue = {
  batches: GrowingBatch[];
  activeBatches: GrowingBatch[];
  completedBatches: GrowingBatch[];
  createBatch: (input: CreateBatchInput) => GrowingBatch;
  completeBatch: (batchId: string, completedAt?: string) => void;
  findBatch: (batchId: string) => GrowingBatch | undefined;
};

const GrowingSessionContext = createContext<GrowingSessionValue | undefined>(undefined);

export function GrowingSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(growingSessionReducer, initialGrowingSessionState);

  const value = useMemo<GrowingSessionValue>(() => {
    const createBatch = (input: CreateBatchInput) => {
      const batch = createGrowingBatch({
        plantId: input.plantId,
        variety: input.variety?.trim() || undefined,
        startType: input.startType,
        startDate: input.startDate,
      });
      dispatch({ type: "batch-added", batch });
      return batch;
    };

    return {
      batches: state.batches,
      activeBatches: state.batches.filter((batch) => batch.status === "active"),
      completedBatches: state.batches.filter((batch) => batch.status === "completed"),
      createBatch,
      completeBatch: (batchId: string, completedAt = new Date().toISOString().slice(0, 10)) => {
        dispatch({ type: "batch-completed", batchId, completedAt });
      },
      findBatch: (batchId: string) => state.batches.find((batch) => batch.id === batchId),
    };
  }, [state.batches]);

  return <GrowingSessionContext.Provider value={value}>{children}</GrowingSessionContext.Provider>;
}

export function useGrowingSession() {
  const context = useContext(GrowingSessionContext);
  if (!context) throw new Error("useGrowingSession must be used within GrowingSessionProvider");
  return context;
}
