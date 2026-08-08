import Link from "next/link";
import { GrowingBatchCard } from "@/components/GrowingBatchCard";
import { plants } from "@/data/plants";
import { getCurrentUserGrowingBatches } from "@/lib/growing/server";
import { splitBatchesByStatus } from "@/lib/growing/service";

export const dynamic = "force-dynamic";

export default async function MinPlanPage() {
  const batches = await getCurrentUserGrowingBatches();

  if (!batches) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Min plan</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behöver logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Logga in med e-postlänk för att spara och läsa dina odlingsomgångar.
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

  const { activeBatches, completedBatches } = splitBatchesByStatus(batches);
  const hasBatches = activeBatches.length + completedBatches.length > 0;
  const plantFor = (plantId: string) => plants.find((plant) => plant.id === plantId);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Min plan</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Dina odlingsomgångar i V2.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Här samlas aktiva och avslutade odlingar du startar från Växtbiblioteket.
          </p>
        </div>
        <p className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
          Dina odlingsomgångar sparas på ditt konto och följer med efter omladdning.
        </p>
      </section>

      {!hasBatches ? (
        <section className="rounded-[2rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">Du har inte startat någon odling ännu.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Välj en växt i Växtbiblioteket och starta en första odlingsomgång för att se planen här.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/vaxtbibliotek"
          >
            Gå till Växtbibliotek
          </Link>
        </section>
      ) : (
        <div className="grid gap-8">
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Aktiva</h2>
              <span className="text-sm font-semibold text-[var(--muted)]">{activeBatches.length} st</span>
            </div>
            {activeBatches.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeBatches.map((batch) => (
                  <GrowingBatchCard batch={batch} key={batch.id} plant={plantFor(batch.plantId)} />
                ))}
              </div>
            ) : (
              <p className="rounded-[1.5rem] bg-white/70 p-5 text-sm text-[var(--muted)]">Inga aktiva odlingsomgångar just nu.</p>
            )}
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Avslutade</h2>
              <span className="text-sm font-semibold text-[var(--muted)]">{completedBatches.length} st</span>
            </div>
            {completedBatches.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completedBatches.map((batch) => (
                  <GrowingBatchCard batch={batch} key={batch.id} plant={plantFor(batch.plantId)} />
                ))}
              </div>
            ) : (
              <p className="rounded-[1.5rem] bg-white/70 p-5 text-sm text-[var(--muted)]">Avslutade odlingar visas här när de finns.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
