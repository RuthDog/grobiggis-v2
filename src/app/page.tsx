import Link from "next/link";
import { PlantVisual } from "@/components/PlantVisual";
import { BRAND } from "@/config/brand";
import { plants } from "@/data/plants";

export default function Home() {
  const featuredPlants = plants.filter((plant) => ["tomat", "basilika", "jordgubbe", "ringblomma"].includes(plant.id));

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.72fr)] lg:items-center lg:py-16">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Version 1.0</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            {BRAND.appName}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Personlig odlingshjälp byggs om på en ny teknisk grund. Första V2-steget är ett rent appskal och ett
            fungerande växtbibliotek.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href="/vaxtbibliotek"
            >
              Öppna Växtbibliotek
            </Link>
            <Link
              className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href="/min-plan"
            >
              Gå till Min plan
            </Link>
            <Link
              className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href="/tips"
            >
              Läs Tips & kunskap
            </Link>
          </div>
          <p className="mt-5 text-sm text-[var(--muted)]">
            V2 är under utveckling och innehåller ännu inte konto, databas, väder, AI eller permanent sparade odlingar.
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Version 1.3 låter dig starta en odlingsomgång i minnet och se den i Min plan tills sidan laddas om.
          </p>
        </div>

        <aside
          aria-label="Exempel från växtkatalogen"
          className="relative overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_22px_70px_rgba(28,67,53,0.1)] sm:p-6"
        >
          <div className="absolute right-6 top-6 size-20 rounded-full bg-[var(--apricot)] opacity-70" />
          <div className="relative grid gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-[var(--moss)]">Katalog</p>
              <h2 className="mt-2 text-2xl font-semibold">27 växter, lokalt sökbara.</h2>
            </div>
            <div className="grid gap-3">
              {featuredPlants.map((plant) => (
                <div className="flex items-center gap-4 rounded-[1.35rem] bg-[var(--sage-light)] p-3" key={plant.id}>
                  <PlantVisual plant={plant} size="small" />
                  <div>
                    <p className="font-semibold">{plant.name}</p>
                    <p className="text-sm text-[var(--muted)]">{plant.harvestLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
