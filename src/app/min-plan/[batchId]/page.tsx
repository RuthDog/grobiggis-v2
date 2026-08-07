"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PlantVisual } from "@/components/PlantVisual";
import { PlanTimeline } from "@/components/PlanTimeline";
import { plants } from "@/data/plants";
import { batchDisplayName, batchStartLabel, batchStatusLabel, startTypeLabel } from "@/domain/growing-display";
import { planBatch } from "@/domain/growing-plan";
import { formatSwedishDateRange } from "@/domain/plan-presentation";
import { useGrowingSession } from "@/state/growing-session";

export default function BatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const router = useRouter();
  const { completeBatch, findBatch } = useGrowingSession();
  const [confirming, setConfirming] = useState(false);
  const batch = findBatch(params.batchId);

  if (!batch) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-5 px-5 py-12 sm:px-8">
        <Link className="w-fit rounded-full bg-white/80 px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href="/min-plan">
          Till Min plan
        </Link>
        <section className="rounded-[2rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
          <h1 className="text-2xl font-semibold">Odlingsomgången finns inte i den här sessionen.</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            V2-testläget sparar inte odlingar efter omladdning. Starta en ny omgång från Växtbiblioteket.
          </p>
        </section>
      </main>
    );
  }

  const plant = plants.find((item) => item.id === batch.plantId);
  const plantName = plant?.name ?? "Okänd växt";
  const plan = planBatch(batch, plants);

  const complete = () => {
    completeBatch(batch.id);
    setConfirming(false);
    router.push("/min-plan");
  };

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
            {!confirming ? (
              <button
                className="min-h-11 rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--muted)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                onClick={() => setConfirming(true)}
                type="button"
              >
                Avsluta odling
              </button>
            ) : (
              <div className="grid gap-2 rounded-[1.25rem] bg-[var(--sage-light)] p-3">
                <p className="text-sm font-semibold">Avsluta bara den här omgången?</p>
                <div className="flex gap-2">
                  <button className="min-h-10 rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white" onClick={complete} type="button">
                    Ja, avsluta
                  </button>
                  <button className="min-h-10 rounded-full bg-white px-4 text-sm font-bold" onClick={() => setConfirming(false)} type="button">
                    Avbryt
                  </button>
                </div>
              </div>
            )}
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
