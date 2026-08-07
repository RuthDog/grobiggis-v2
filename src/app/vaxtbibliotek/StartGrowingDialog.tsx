"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlantVisual } from "@/components/PlantVisual";
import type { CatalogPlant } from "@/data/plant-types";
import { startTypeLabels } from "@/domain/growing-display";
import type { GrowingStartType } from "@/domain/growing-types";
import { useGrowingSession } from "@/state/growing-session";

const startTypes: GrowingStartType[] = ["seed", "direct", "purchased", "divided", "established"];

const today = () => new Date().toISOString().slice(0, 10);

export function StartGrowingDialog({
  plant,
  onClose,
}: Readonly<{ plant: CatalogPlant; onClose: () => void }>) {
  const router = useRouter();
  const { createBatch } = useGrowingSession();
  const [variety, setVariety] = useState("");
  const [startType, setStartType] = useState<GrowingStartType>("seed");
  const [startDate, setStartDate] = useState(today);
  const [error, setError] = useState("");
  const titleId = useId();
  const varietyId = useId();
  const startTypeId = useId();
  const startDateId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startDate) {
      setError("Välj ett startdatum.");
      return;
    }

    const batch = createBatch({
      plantId: plant.id,
      variety,
      startType,
      startDate,
    });
    router.push(`/min-plan/${batch.id}`);
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-[rgba(14,36,29,0.36)] p-3 sm:place-items-center sm:p-6">
      <button aria-label="Stäng" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-auto rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_28px_80px_rgba(14,36,29,0.24)] sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <PlantVisual plant={plant} size="small" />
            <div>
              <p className="text-sm font-bold uppercase text-[var(--moss)]">Starta odling</p>
              <h2 className="text-2xl font-semibold" id={titleId}>
                {plant.name}
              </h2>
            </div>
          </div>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[color:var(--line)] bg-white text-xl font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <div>
            <label className="text-sm font-semibold" htmlFor={varietyId}>
              Sort (valfritt)
            </label>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
              id={varietyId}
              onChange={(event) => setVariety(event.target.value)}
              placeholder="Till exempel Gardener's Delight"
              value={variety}
            />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor={startTypeId}>
              Starttyp
            </label>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
              id={startTypeId}
              onChange={(event) => setStartType(event.target.value as GrowingStartType)}
              value={startType}
            >
              {startTypes.map((item) => (
                <option key={item} value={item}>
                  {startTypeLabels[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor={startDateId}>
              Startdatum
            </label>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
              id={startDateId}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </div>

          {error ? <p className="rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#8a4a23]">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="min-h-12 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              onClick={onClose}
              type="button"
            >
              Avbryt
            </button>
            <button
              className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              type="submit"
            >
              Skapa odlingsomgång
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
