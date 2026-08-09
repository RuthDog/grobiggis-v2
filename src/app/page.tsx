import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { PlantVisual } from "@/components/PlantVisual";
import { BRAND } from "@/config/brand";
import { plants } from "@/data/plants";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);
  const featuredPlants = plants.filter((plant) => ["tomat", "basilika", "jordgubbe", "ringblomma"].includes(plant.id));

  return (
    <main className="pb-16">
      <HomeHero compact={isLoggedIn} />

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.72fr)] lg:items-start lg:py-14">
        <div>
          {isLoggedIn ? (
            <>
              <p className="text-sm font-bold uppercase text-[var(--moss)]">Start</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Välkommen tillbaka.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                Här hittar du dina vanliga vägar vidare när du vill fortsätta planera, hitta en växt eller läsa på.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/min-plan"
                >
                  Öppna Min plan
                </Link>
                <Link
                  className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/vaxtbibliotek"
                >
                  Besök Växtbibliotek
                </Link>
                <Link
                  className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/tips"
                >
                  Läs Tips & kunskap
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Link
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/min-plan"
                >
                  <p className="text-sm font-bold uppercase text-[var(--moss)]">Min plan</p>
                  <p className="mt-2 text-base font-semibold">Se dina aktiva och avslutade odlingar.</p>
                </Link>
                <Link
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/vaxtbibliotek"
                >
                  <p className="text-sm font-bold uppercase text-[var(--moss)]">Växtbibliotek</p>
                  <p className="mt-2 text-base font-semibold">Starta en ny odling från växtkatalogen.</p>
                </Link>
                <Link
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(28,67,53,0.06)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/tips"
                >
                  <p className="text-sm font-bold uppercase text-[var(--moss)]">Tips & kunskap</p>
                  <p className="mt-2 text-base font-semibold">Fortsätt med guider för vanliga odlingsfrågor.</p>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold uppercase text-[var(--moss)]">Personlig odlingshjälp</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
                {BRAND.appName}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                Få koll på vad du odlar, vad som behöver göras och vad som kommer härnäst.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/logga-in"
                >
                  Logga in
                </Link>
                <Link
                  className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/vaxtbibliotek"
                >
                  Öppna Växtbibliotek
                </Link>
                <Link
                  className="rounded-full border border-[color:var(--line)] bg-white/80 px-6 py-3 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/tips"
                >
                  Läs Tips & kunskap
                </Link>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Spara dina odlingar, följ dina steg och hitta lugn vägledning genom hela säsongen.
              </p>
            </>
          )}
        </div>

        <aside
          aria-label="Exempel från växtkatalogen"
          className="relative overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_22px_70px_rgba(28,67,53,0.1)] sm:p-6"
        >
          <div className="absolute right-6 top-6 size-20 rounded-full bg-[var(--apricot)] opacity-70" />
          <div className="relative grid gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-[var(--moss)]">{isLoggedIn ? "Att utforska" : "Katalog"}</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {isLoggedIn ? "Hitta nästa odling bland favoriterna." : "Växter att utforska i Grobiggis."}
              </h2>
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
