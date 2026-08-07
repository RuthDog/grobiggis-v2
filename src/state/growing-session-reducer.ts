import { completeSpecificBatch } from "../domain/batch-completion.ts";
import type { GrowingBatch } from "../domain/growing-types.ts";

export interface GrowingSessionState {
  batches: GrowingBatch[];
}

export type GrowingSessionAction =
  | { type: "batch-added"; batch: GrowingBatch }
  | { type: "batch-completed"; batchId: string; completedAt: string };

export const initialGrowingSessionState: GrowingSessionState = {
  batches: [],
};

export function growingSessionReducer(state: GrowingSessionState, action: GrowingSessionAction): GrowingSessionState {
  switch (action.type) {
    case "batch-added":
      return { ...state, batches: [...state.batches, action.batch] };
    case "batch-completed":
      if (!state.batches.some((batch) => batch.id === action.batchId)) return state;
      return { ...state, batches: completeSpecificBatch(state.batches, action.batchId, action.completedAt) };
    default:
      return state;
  }
}
