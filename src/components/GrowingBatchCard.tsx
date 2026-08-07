import Link from "next/link";
import { PlantVisual } from "@/components/PlantVisual";
import type { CatalogPlant } from "@/data/plant-types";
import { batchDisplayName, batchStartLabel, batchStatusLabel, startTypeLabel } from "@/domain/growing-display";
import type { GrowingBatch } from "@/domain/growing-types";

export function GrowingBatchCard({
  batch,
  plant,
}: Readonly<{ batch: GrowingBatch; plant?: CatalogPlant }>) {
  const plantName = plant?.name ?? "Okänd växt";

  return (
    <Link
      className={`grid gap-4 rounded-[1.5rem] border border-[color:var(--line)] bg-[rgba(255,254,250,0.9)] p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
        batch.status === "completed" ? "opacity-72" : ""
      }`}
      href={`/min-plan/${batch.id}`}
    >
      <div className="flex items-start gap-4">
        <PlantVisual plant={plant} plantId={batch.plantId} size="small" />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{batchDisplayName(batch, plantName)}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{batchStartLabel(batch)}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-[var(--sage-light)] px-3 py-1 text-xs font-bold text-[var(--moss)]">
          {batchStatusLabel(batch.status)}
        </span>
      </div>
      <p className="text-sm text-[var(--muted)]">{startTypeLabel(batch.startType)}</p>
    </Link>
  );
}
