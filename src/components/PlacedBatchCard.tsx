import Link from "next/link";
import { PlantVisual } from "@/components/PlantVisual";
import { ReleasePlacementControl } from "@/components/ReleasePlacementControl";
import { batchStartLabel, batchStatusLabel } from "@/domain/growing-display";
import type { GrowingBatch, PlantPlacement } from "@/domain/growing-types";

export type PlacedBatchView = {
  batch: GrowingBatch;
  placement: PlantPlacement;
  plantName: string;
  displayName: string;
};

export function PlacedBatchCard({ item }: Readonly<{ item: PlacedBatchView }>) {
  const completed = item.batch.status === "completed";

  return (
    <article
      className={`grid gap-3 rounded-[1.25rem] border p-4 ${
        completed ? "border-[color:var(--sage)] bg-[var(--sage-light)]/70" : "border-[color:var(--line)] bg-white/85"
      }`}
    >
      <div className="flex items-start gap-3">
        <PlantVisual plantId={item.batch.plantId} size="small" />
        <div className="min-w-0">
          <Link
            className="font-semibold text-[var(--forest)] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href={`/min-plan/${item.batch.id}`}
          >
            {item.displayName}
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">{batchStartLabel(item.batch)}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[var(--moss)]">
          {batchStatusLabel(item.batch.status)}
        </span>
      </div>
      {completed ? (
        <p className="text-sm leading-6 text-[var(--muted)]">Avslutad odling som fortfarande står kvar på ytan.</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Placerad {new Date(item.placement.placedAt).toLocaleDateString("sv-SE")}</p>
        <ReleasePlacementControl batchName={item.displayName} placementId={item.placement.id} />
      </div>
    </article>
  );
}
