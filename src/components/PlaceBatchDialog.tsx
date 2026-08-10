"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { PlantVisual } from "@/components/PlantVisual";
import { placeBatchInSpaceAction } from "@/lib/growing/actions";

export type PlaceableBatchOption = {
  batchId: string;
  plantId: string;
  plantName: string;
  displayName: string;
  startLabel: string;
};

export function PlaceBatchDialog({
  batches,
  spaceId,
}: Readonly<{
  batches: PlaceableBatchOption[];
  spaceId: string;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savingBatchId, setSavingBatchId] = useState("");
  const [error, setError] = useState("");
  const titleId = useId();

  const close = () => {
    if (savingBatchId) return;
    setOpen(false);
    setError("");
  };

  const place = async (batchId: string) => {
    setSavingBatchId(batchId);
    setError("");
    const result = await placeBatchInSpaceAction({ spaceId, batchId });
    setSavingBatchId("");

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/90 px-4 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        Lägg till odling
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-[rgba(14,36,29,0.36)] p-3 sm:place-items-center sm:p-6">
          <button aria-label="Stäng" className="absolute inset-0 cursor-default" onClick={close} type="button" />
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative z-10 max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-auto rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_28px_80px_rgba(14,36,29,0.24)] sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-[var(--moss)]">Placera odling</p>
                <h2 className="mt-1 text-2xl font-semibold" id={titleId}>
                  Välj odlingsomgång
                </h2>
              </div>
              <button
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[color:var(--line)] bg-white text-xl font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                onClick={close}
                type="button"
              >
                x
              </button>
            </div>

            {batches.length ? (
              <div className="mt-6 grid gap-3">
                {batches.map((batch) => (
                  <button
                    className="flex min-h-20 items-center gap-4 rounded-[1.25rem] border border-[color:var(--line)] bg-white/80 p-4 text-left transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-wait disabled:opacity-60"
                    disabled={Boolean(savingBatchId)}
                    key={batch.batchId}
                    onClick={() => place(batch.batchId)}
                    type="button"
                  >
                    <PlantVisual plantId={batch.plantId} size="small" />
                    <span className="grid min-w-0 gap-1">
                      <span className="font-semibold">{batch.displayName}</span>
                      <span className="text-sm text-[var(--muted)]">{batch.startLabel}</span>
                    </span>
                    <span className="ml-auto rounded-full bg-[var(--sage-light)] px-3 py-1 text-xs font-bold text-[var(--moss)]">
                      {savingBatchId === batch.batchId ? "Placerar..." : batch.plantName}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/70 p-5">
                <h3 className="font-semibold">Du har inga odlingsomgångar som kan placeras här just nu.</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Starta en aktiv odlingsomgång i Växtbiblioteket, eller frigör en redan placerad batch först.
                </p>
                <a
                  className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/vaxtbibliotek"
                >
                  Gå till Växtbibliotek
                </a>
              </div>
            )}

            {error ? <p className="mt-4 rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#8a4a23]">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
