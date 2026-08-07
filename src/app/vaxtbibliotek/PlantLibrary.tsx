"use client";

import { useId, useMemo, useState } from "react";
import { PlantCard } from "@/components/PlantCard";
import type { CatalogPlant } from "@/data/plant-types";
import { plants } from "@/data/plants";
import { searchableCatalogPlants } from "@/domain/plant-search";
import { StartGrowingDialog } from "./StartGrowingDialog";

export function PlantLibrary() {
  const [query, setQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState<CatalogPlant | undefined>();
  const searchId = useId();
  const results = useMemo(() => searchableCatalogPlants(plants, query), [query]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-9 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Växtbibliotek</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Den statiska katalogen i GroBiggis V2.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Sök lokalt bland de befintliga växterna. Katalogen är fortfarande statisk och gör inga API-anrop i Version 2.2.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)]">
          <label className="text-sm font-semibold" htmlFor={searchId}>
            Sök på namn eller kategori
          </label>
          <input
            className="mt-3 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-base outline-none transition placeholder:text-[#8f9a94] focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
            id={searchId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Till exempel tomat, ört eller rödbeta"
            type="search"
            value={query}
          />
          <p aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">
            {results.length} av {plants.length} växter visas.
          </p>
        </div>
      </section>

      {results.length > 0 ? (
        <section aria-label="Växter" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((plant) => (
            <PlantCard
              action={
                <button
                  className="min-h-11 w-full rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(25,69,56,0.14)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  onClick={() => setSelectedPlant(plant)}
                  type="button"
                >
                  Starta odling
                </button>
              }
              key={plant.id}
              plant={plant}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold">Ingen växt matchar sökningen</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Prova ett annat svenskt namn, en kategori som örter eller rensa sökfältet för att visa hela katalogen.
          </p>
        </section>
      )}
      {selectedPlant ? <StartGrowingDialog onClose={() => setSelectedPlant(undefined)} plant={selectedPlant} /> : null}
    </div>
  );
}
