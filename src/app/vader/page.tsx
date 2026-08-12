import Link from "next/link";
import { getCurrentUserWeatherForecast } from "@/lib/weather/server";
import { formatPrecipitation, formatTemperature, formatWeekday, formatWind, labelForCondition } from "@/services/weather/presentation";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const state = await getCurrentUserWeatherForecast();

  if (state.status === "signed-out") {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Väder</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behöver logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">Logga in för att se väder för din verifierade odlingsplats.</p>
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

  if (state.status === "missing-location") {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Väder</p>
          <h1 className="mt-3 text-3xl font-semibold">Verifiera din odlingsort.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Verifiera din odlingsort i Profil för att se lokalt väder{state.locality ? ` för ${state.locality}` : ""}.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/profil"
          >
            Öppna Profil
          </Link>
        </section>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Väder för {state.locality}</p>
          <h1 className="mt-3 text-3xl font-semibold">Vädret kunde inte hämtas just nu.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{state.error}</p>
        </section>
      </main>
    );
  }

  const { forecast } = state;
  const currentLabel = labelForCondition(forecast.current.condition);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <header className="grid gap-3">
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Väder för {forecast.location.locality}</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Lokalt väder för odlingen.</h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">En enkel prognos för de närmaste dagarna, hämtad från din verifierade odlingsplats.</p>
      </header>

      <section className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-[1.5rem] bg-[var(--sage-light)] p-5">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Nu</p>
          <p className="mt-3 text-6xl font-semibold tracking-normal">{formatTemperature(forecast.current.temperature)}</p>
          <p className="mt-3 text-xl font-semibold">{currentLabel}</p>
          <dl className="mt-5 grid gap-2 text-sm text-[var(--muted)]">
            <div className="flex justify-between gap-4">
              <dt>Känns som</dt>
              <dd className="font-semibold text-[var(--forest)]">{formatTemperature(forecast.current.apparentTemperature)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Vind</dt>
              <dd className="font-semibold text-[var(--forest)]">{formatWind(forecast.current.windSpeed)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Byvind</dt>
              <dd className="font-semibold text-[var(--forest)]">{formatWind(forecast.current.windGusts)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Nederbörd</dt>
              <dd className="font-semibold text-[var(--forest)]">{formatPrecipitation(forecast.current.precipitation)}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-3">
          <div>
            <p className="text-sm font-bold uppercase text-[var(--moss)]">Kommande dagar</p>
            <h2 className="mt-2 text-2xl font-semibold">Femdagarsprognos</h2>
          </div>
          <div className="grid gap-3">
            {forecast.daily.map((day) => (
              <article className="grid gap-3 rounded-[1.25rem] border border-[color:var(--line)] bg-white px-4 py-3 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(0,1fr)_auto] sm:items-center" key={day.date}>
                <div>
                  <h3 className="font-semibold capitalize">{formatWeekday(day.date)}</h3>
                  <p className="text-sm text-[var(--muted)]">{day.date}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--forest)]">{labelForCondition(day.condition)}</p>
                <dl className="grid min-w-36 gap-1 text-sm text-[var(--muted)]">
                  <div className="flex justify-between gap-4">
                    <dt>Temp</dt>
                    <dd className="font-semibold text-[var(--forest)]">
                      {formatTemperature(day.temperatureMin)} / {formatTemperature(day.temperatureMax)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Regn</dt>
                    <dd className="font-semibold text-[var(--forest)]">{day.precipitationProbabilityMax ?? 0} %</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <p className="text-sm leading-6 text-[var(--muted)]">
        <a className="font-semibold underline underline-offset-4" href={forecast.attribution.url} rel="noreferrer" target="_blank">
          {forecast.attribution.label}
        </a>
        . Prognosen sparas inte i Grobiggis.
      </p>
    </main>
  );
}
