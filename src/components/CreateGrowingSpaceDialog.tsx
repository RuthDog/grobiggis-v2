"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { growingSpaceTypeLabels, growingSpaceTypes } from "@/domain/growing-spaces";
import type { GrowingSpaceType } from "@/domain/growing-types";
import { createGrowingSpaceAction } from "@/lib/growing/actions";

export function CreateGrowingSpaceDialog({ buttonLabel = "Skapa odlingsyta" }: Readonly<{ buttonLabel?: string }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<GrowingSpaceType>("raised_bed");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const nameId = useId();
  const typeId = useId();

  const close = () => {
    if (saving) return;
    setOpen(false);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await createGrowingSpaceAction({ name, type });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setType("raised_bed");
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-[rgba(14,36,29,0.36)] p-3 sm:place-items-center sm:p-6">
          <button aria-label="Stäng" className="absolute inset-0 cursor-default" onClick={close} type="button" />
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative z-10 max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-auto rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_28px_80px_rgba(14,36,29,0.24)] sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-[var(--moss)]">Mina odlingar</p>
                <h2 className="mt-1 text-2xl font-semibold" id={titleId}>
                  Skapa odlingsyta
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

            <form className="mt-6 grid gap-5" onSubmit={submit}>
              <div>
                <label className="text-sm font-semibold" htmlFor={nameId}>
                  Namn
                </label>
                <input
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
                  id={nameId}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pallkragen vid altanen"
                  required
                  value={name}
                />
              </div>

              <div>
                <label className="text-sm font-semibold" htmlFor={typeId}>
                  Typ
                </label>
                <select
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
                  id={typeId}
                  onChange={(event) => setType(event.target.value as GrowingSpaceType)}
                  value={type}
                >
                  {growingSpaceTypes.map((item) => (
                    <option key={item} value={item}>
                      {growingSpaceTypeLabels[item]}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p className="rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#8a4a23]">{error}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="min-h-12 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  disabled={saving}
                  onClick={close}
                  type="button"
                >
                  Avbryt
                </button>
                <button
                  className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Sparar..." : "Skapa odlingsyta"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
