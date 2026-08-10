import Link from "next/link";
import { CreateGrowingSpaceDialog } from "@/components/CreateGrowingSpaceDialog";
import { EmptyGrowingSpacesState, GrowingSpaceCard } from "@/components/GrowingSpaceCard";
import type { PlaceableBatchOption } from "@/components/PlaceBatchDialog";
import type { PlacedBatchView } from "@/components/PlacedBatchCard";
import { plants } from "@/data/plants";
import { batchDisplayName, batchStartLabel } from "@/domain/growing-display";
import type { GrowingBatch, GrowingSpace } from "@/domain/growing-types";
import { getCurrentUserGrowingBatches, getCurrentUserGrowingSpaces } from "@/lib/growing/server";

export const dynamic = "force-dynamic";

function plantNameFor(plantId: string) {
  return plants.find((plant) => plant.id === plantId)?.name ?? "Okänd växt";
}

function placeableBatchOptions(batches: GrowingBatch[], spaces: GrowingSpace[]): PlaceableBatchOption[] {
  const placedBatchIds = new Set(spaces.flatMap((space) => space.placements.map((placement) => placement.batchId)));
  return batches
    .filter((batch) => batch.status === "active" && !placedBatchIds.has(batch.id))
    .map((batch) => {
      const plantName = plantNameFor(batch.plantId);
      return {
        batchId: batch.id,
        plantId: batch.plantId,
        plantName,
        displayName: batchDisplayName(batch, plantName),
        startLabel: batchStartLabel(batch),
      };
    });
}

function placedBatchViews(space: GrowingSpace, batches: GrowingBatch[]): PlacedBatchView[] {
  const batchesById = new Map(batches.map((batch) => [batch.id, batch]));
  return space.placements
    .map((placement) => {
      const batch = batchesById.get(placement.batchId);
      if (!batch) return undefined;
      const plantName = plantNameFor(batch.plantId);
      return {
        batch,
        placement,
        plantName,
        displayName: batchDisplayName(batch, plantName),
      };
    })
    .filter((item): item is PlacedBatchView => Boolean(item));
}

export default async function MinaOdlingarPage() {
  const [spaces, batches] = await Promise.all([getCurrentUserGrowingSpaces(), getCurrentUserGrowingBatches()]);

  if (!spaces || !batches) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Mina odlingar</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behöver logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Logga in för att skapa odlingsytor och se var dina odlingsomgångar står.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/logga-in"
          >
            Logga in
          </Link>
        </section>
      </main>
    );
  }

  const placeableBatches = placeableBatchOptions(batches, spaces);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Mina odlingar</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Din fysiska odlingsöversikt.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Här ser du var odlingsomgångarna står. Plan och historik finns kvar i Min plan.
          </p>
        </div>
        <CreateGrowingSpaceDialog />
      </section>

      {!spaces.length ? (
        <EmptyGrowingSpacesState />
      ) : (
        <div className="grid gap-5">
          {spaces.map((space) => (
            <GrowingSpaceCard
              key={space.id}
              placeableBatches={placeableBatches}
              placedBatches={placedBatchViews(space, batches)}
              space={space}
            />
          ))}
        </div>
      )}

      {spaces.length && !placeableBatches.length ? (
        <section className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-5">
          <h2 className="text-lg font-semibold">Inga fler odlingsomgångar att placera just nu.</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Starta en ny aktiv odling i Växtbiblioteket när du vill fylla fler ytor.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/vaxtbibliotek"
          >
            Gå till Växtbibliotek
          </Link>
        </section>
      ) : null}
    </main>
  );
}
