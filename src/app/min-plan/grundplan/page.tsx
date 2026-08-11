import { BasePlanCalendar } from "@/components/BasePlanCalendar";
import { BasePlanPlantPicker } from "@/components/BasePlanPlantPicker";
import { PlanModeNavigation } from "@/components/PlanModeNavigation";
import { plants } from "@/data/plants";
import { basePlanActivitiesForPlants, searchableBasePlanPlants } from "@/domain/base-plan";

function currentMonthInStockholm() {
  const value = new Intl.DateTimeFormat("en-CA", {
    month: "numeric",
    timeZone: "Europe/Stockholm",
  }).format(new Date());
  return Number(value);
}

export default async function GrundplanPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{ q?: string | string[] }>;
}>) {
  const params = searchParams ? await searchParams : undefined;
  const query = typeof params?.q === "string" ? params.q : "";
  const supportedPlants = searchableBasePlanPlants(plants, "");
  const visiblePlants = searchableBasePlanPlants(plants, query);
  const activities = basePlanActivitiesForPlants(
    plants,
    visiblePlants.map((plant) => plant.id),
  );
  const currentMonth = currentMonthInStockholm();

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5">
        <PlanModeNavigation current="/min-plan/grundplan" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-[var(--moss)]">Grundplan</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Generell vägledning genom odlingsåret.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Grundplanen visar ungefär när olika moment brukar vara aktuella under ett normalt svenskt odlingsår.
              Den påverkas inte av dina egna odlingar eller din historik.
            </p>
          </div>
          <BasePlanPlantPicker query={query} resultCount={visiblePlants.length} totalCount={supportedPlants.length} />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-5 text-sm leading-6 text-[var(--muted)]">
        Välj en eller flera växter via sökningen och jämför årets lugna och intensiva månader sida vid sida.
      </section>

      {visiblePlants.length ? (
        <BasePlanCalendar activities={activities} currentMonth={currentMonth} />
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold">Ingen växt matchar filtret</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Prova ett annat svenskt namn eller rensa sökningen för att visa hela Grundplanen igen.
          </p>
        </section>
      )}
    </main>
  );
}
