import type { SignalAffectedBatch } from "@/domain/signals";

export function uniqueAffectedBatchLabelsForPresentation(batches: SignalAffectedBatch[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const batch of batches) {
    const label = batch.label.trim().replace(/\s+/g, " ");
    const key = `${batch.plantId}:${label.toLocaleLowerCase("sv-SE")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}
