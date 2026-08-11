import { PlantVisual } from "@/components/PlantVisual";
import type { CatalogPlant } from "@/data/plant-types";
import type { ReactNode } from "react";

export function PlantCard({
  plant,
  action,
  secondaryAction,
}: Readonly<{ plant: CatalogPlant; action?: ReactNode; secondaryAction?: ReactNode }>) {
  return (
    <article className="grid min-h-64 gap-5 rounded-[1.75rem] border border-[color:var(--line)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <PlantVisual plant={plant} />
        <span className="rounded-full bg-[var(--sage-light)] px-3 py-1 text-xs font-bold text-[var(--moss)]">
          {plant.category}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{plant.name}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{plant.description}</p>
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-[color:var(--line)] pt-4 text-sm">
        <div>
          <dt className="text-xs font-bold uppercase text-[var(--muted)]">Skörd</dt>
          <dd className="mt-1 font-semibold">{plant.harvestLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-[var(--muted)]">Nivå</dt>
          <dd className="mt-1 font-semibold">{plant.difficulty}</dd>
        </div>
      </dl>
      {action || secondaryAction ? (
        <div className="grid gap-3">
          {action ? <div>{action}</div> : null}
          {secondaryAction ? <div>{secondaryAction}</div> : null}
        </div>
      ) : null}
    </article>
  );
}
