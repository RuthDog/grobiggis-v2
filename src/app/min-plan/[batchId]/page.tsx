import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleteBatchControl } from "@/components/CompleteBatchControl";
import { PlantVisual } from "@/components/PlantVisual";
import { PlanTimeline } from "@/components/PlanTimeline";
import { plants } from "@/data/plants";
import { batchDisplayName, batchStartLabel, batchStatusLabel, startTypeLabel } from "@/domain/growing-display";
import { planBatch } from "@/domain/growing-plan";
import { formatSwedishDateRange } from "@/domain/plan-presentation";
import { getCurrentUserGrowingBatch } from "@/lib/growing/server";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({ params }: Readonly<{ params: Promise<{ batchId: string }> }>) {
  const { batchId } = await params;
  let batch = null;

  try {
    batch = await getCurrentUserGrowingBatch(batchId);
  } catch (error) {
    if (error instanceof Error && /Authentication required/i.test(error.message)) {
      return (
        <main className="mx-auto grid w-full max-w-3xl gap-5 px-5 py-12 sm:px-8">
          <Link className="w-fit rounded-full bg-white/80 px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href="/min-plan">
            Till Min plan
          </Link>
          <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
            <h1 className="text-2xl font-semibold">Du behöver logga in.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Logga in med e-postlänk för att se dina sparade odlingsomgångar.
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
    throw error;
  }

  if (!batch) notFound();

  const plant = plants.find((item) => item.id === batch.plantId);
  const plantName = plant?.name ?? "Okänd växt";
  const plan = planBatch(batch, plants);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-7 px-5 py-8 sm:px-8 lg:py-12">
      <Link className="w-fit rounded-full bg-white/80 px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href="/min-plan">
        Till Min plan
      </Link>

      <header className="grid gap-6 rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_22px_70px_rgba(28,67,53,0.1)] sm:p-7 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <PlantVisual plant={plant} plantId={batch.plantId} size="large" />
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Odlingsomgång</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight">{batchDisplayName(batch, plantName)}</h1>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold text-[var(--muted)]">Starttyp</dt>
              <dd className="mt-1">{startTypeLabel(batch.startType)}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--muted)]">Startdatum</dt>
              <dd className="mt-1">{batchStartLabel(batch)}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--muted)]">Status</dt>
              <dd className="mt-1">{batchStatusLabel(batch.status)}</dd>
            </div>
            {batch.completedAt ? (
              <div>
                <dt className="font-bold text-[var(--muted)]">Avslutad</dt>
                <dd className="mt-1">{formatSwedishDateRange({ from: batch.completedAt, to: batch.completedAt })}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        {batch.status === "active" ? (
          <div className="grid gap-2">
            <CompleteBatchControl batchId={batch.id} />
          </div>
        ) : null}
      </header>

      <section className="grid gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Plan</p>
          <h2 className="mt-2 text-2xl font-semibold">{batch.status === "completed" ? "Historik" : "Kommande aktiviteter"}</h2>
        </div>
        <PlanTimeline events={plan.events} />
      </section>
    </main>
  );
}
