"use client";

import { useId, useMemo, useState } from "react";
import { GuideCard } from "@/components/GuideCard";
import { guideCategories, guides } from "@/data/guides";
import { searchableGuides } from "@/domain/guide-search";

export function TipsLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alla");
  const searchId = useId();
  const results = useMemo(() => searchableGuides(guides, query, category), [category, query]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-9 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Tips & kunskap</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Granskade guider för vanliga odlingsfrågor.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Sök och filtrera bland GroBiggis befintliga kunskapsartiklar. Allt är statiskt i V2 och fungerar utan konto,
            API eller databas.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)]">
          <label className="text-sm font-semibold" htmlFor={searchId}>
            Sök bland guider
          </label>
          <input
            className="mt-3 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-base outline-none transition placeholder:text-[#8f9a94] focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
            id={searchId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Till exempel frost, tomat eller vatten"
            type="search"
            value={query}
          />
          <p aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">
            {results.length} av {guides.length} guider visas.
          </p>
        </div>
      </section>

      <section aria-label="Kategorier" className="flex gap-2 overflow-x-auto pb-1">
        {guideCategories.map((item) => (
          <button
            aria-pressed={category === item}
            className="min-h-11 shrink-0 rounded-full border border-[color:var(--line)] bg-white/70 px-4 text-sm font-bold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] aria-pressed:bg-[var(--forest)] aria-pressed:text-white"
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      {results.length > 0 ? (
        <section aria-label="Guider" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((guide) => (
            <GuideCard guide={guide} key={guide.slug} />
          ))}
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold">Ingen guide matchar urvalet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Prova ett annat sökord, välj en annan kategori eller visa alla guider igen.
          </p>
        </section>
      )}
    </div>
  );
}
