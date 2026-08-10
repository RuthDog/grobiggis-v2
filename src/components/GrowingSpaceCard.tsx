import { CreateGrowingSpaceDialog } from "@/components/CreateGrowingSpaceDialog";
import { PlaceBatchDialog, type PlaceableBatchOption } from "@/components/PlaceBatchDialog";
import { PlacedBatchCard, type PlacedBatchView } from "@/components/PlacedBatchCard";
import { growingSpaceTypeLabels } from "@/domain/growing-spaces";
import type { GrowingSpace } from "@/domain/growing-types";

export function GrowingSpaceCard({
  placeableBatches,
  placedBatches,
  space,
}: Readonly<{
  placeableBatches: PlaceableBatchOption[];
  placedBatches: PlacedBatchView[];
  space: GrowingSpace;
}>) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-[color:var(--line)] bg-[var(--paper)] p-4 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">{growingSpaceTypeLabels[space.type]}</p>
          <h2 className="mt-1 text-2xl font-semibold">{space.name}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{placedBatches.length} aktiva placeringar</p>
        </div>
        <PlaceBatchDialog batches={placeableBatches} spaceId={space.id} />
      </div>

      {placedBatches.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {placedBatches.map((item) => (
            <PlacedBatchCard item={item} key={item.placement.id} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-dashed border-[color:var(--line)] bg-white/70 p-5">
          <h3 className="font-semibold">Här är det tomt just nu.</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Lägg till en aktiv odlingsomgång när du vill visa vad som växer på den här ytan.
          </p>
          {placeableBatches.length ? <div className="mt-4"><PlaceBatchDialog batches={placeableBatches} spaceId={space.id} /></div> : null}
        </div>
      )}
    </section>
  );
}

export function EmptyGrowingSpacesState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-16 text-center">
      <p className="text-sm font-bold uppercase text-[var(--moss)]">Mina odlingar</p>
      <h2 className="mt-3 text-2xl font-semibold">Skapa din första odlingsyta.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
        Börja med platsen där du odlar: en pallkrage, ett växthus, friland eller en kruka.
      </p>
      <div className="mt-6">
        <CreateGrowingSpaceDialog />
      </div>
    </section>
  );
}
