import Link from "next/link";
import { TodayActivityCard } from "@/components/TodayActivityCard";
import { getCurrentUserTodayView } from "@/lib/growing/today";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const view = await getCurrentUserTodayView();

  if (!view) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Idag</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behover logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Logga in for att se vad som ar aktuellt i din odling just nu.
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

  const hasCurrentWork = view.today.length + view.now.length > 0;
  const hasUpcomingWork = view.next.length > 0;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <header className="grid gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">{view.greeting.heading}.</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">Idag</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">{view.greeting.support}</p>
        </div>
        <p className="w-fit rounded-full bg-[var(--sage-light)] px-4 py-2 text-sm font-semibold text-[var(--moss)]">{view.greeting.dateLabel}</p>
      </header>

      {view.activeBatchCount === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">Du har inga aktiva odlingar just nu.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Starta en odlingsomgang i Vaxtbiblioteket for att fa en personlig Idag-vy.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/vaxtbibliotek"
          >
            Ga till Vaxtbibliotek
          </Link>
        </section>
      ) : (
        <div className="grid gap-8">
          {view.today.length ? (
            <section className="grid gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-[var(--moss)]">Idag</p>
                <h2 className="mt-2 text-2xl font-semibold">Det har ar aktuellt nu.</h2>
              </div>
              <div className="grid gap-4">{view.today.map((activity) => <TodayActivityCard activity={activity} key={activity.id} />)}</div>
            </section>
          ) : null}

          {view.now.length ? (
            <section className="grid gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-[var(--moss)]">Att gora nu</p>
                <h2 className="mt-2 text-2xl font-semibold">Nyligen aktuellt och fortfarande relevant.</h2>
              </div>
              <div className="grid gap-4">{view.now.map((activity) => <TodayActivityCard activity={activity} key={activity.id} />)}</div>
            </section>
          ) : null}

          {!hasCurrentWork ? (
            <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/70 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold">Det finns inget som behover goras just idag.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Din odling ar i fas. Nar nagot blir aktuellt visas det har, och tills dess kan du lugnt kika pa det som kommer narmast.
              </p>
            </section>
          ) : null}

          {hasUpcomingWork ? (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase text-[var(--moss)]">Harnast</p>
                  <h2 className="mt-2 text-2xl font-semibold">Narmast kommande steg.</h2>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white/80 px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/min-plan"
                >
                  Se hela Min plan
                </Link>
              </div>
              <div className="grid gap-4">{view.next.map((activity) => <TodayActivityCard activity={activity} key={activity.id} />)}</div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
