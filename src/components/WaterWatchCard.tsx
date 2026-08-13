import type { WaterAssessment, WaterAssessmentLevel } from "@/domain/water-watch";
import { dedupeAffectedPlantsForPresentation, uniquePlantNamesForSummary } from "@/components/water-watch-presentation";

interface WaterWatchCardProps {
  assessment: WaterAssessment;
  compact?: boolean;
  showNeutral?: boolean;
}

const headingByLevel: Record<WaterAssessmentLevel, string> = {
  high_attention: "Kontrollera jorden idag",
  attention: "Ökad risk för uttorkning",
  rain_soon: "Torrt - men regn är på väg",
  watch: "Se över jordfukten",
  none: "Ingen tydlig bevattningssignal",
  unavailable: "Bevattningskollen saknar väderdata",
};

const listFormatter = new Intl.ListFormat("sv-SE", { style: "long", type: "conjunction" });

function formatMillimeters(value: number | null) {
  if (value === null) return "Okänt";
  return `${Math.round(value)} mm`;
}

function affectedSummary(assessment: WaterAssessment) {
  const names = uniquePlantNamesForSummary(assessment);
  if (!names.length) return "Ingen av dina aktiva odlingar behöver extra bevattningsuppmärksamhet utifrån väderdata just nu.";
  return `${listFormatter.format(names)} kan behöva ses över. Kontrollera jorden innan du vattnar.`;
}

export function WaterWatchCard({ assessment, compact = false, showNeutral = true }: WaterWatchCardProps) {
  const hasRelevantSignal = !["none", "unavailable"].includes(assessment.level) && assessment.affectedPlants.length > 0;
  const affectedPlants = dedupeAffectedPlantsForPresentation(assessment);
  if (!showNeutral && !hasRelevantSignal) return null;

  if (compact) {
    return (
      <section className="rounded-[1.5rem] border border-[color:var(--line)] bg-[var(--sage-light)]/80 px-5 py-4 text-sm shadow-[0_12px_30px_rgba(28,67,53,0.08)]">
        <p className="font-bold uppercase text-[var(--moss)]">Bevattningskoll</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-2 leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
        <p className="mt-2 leading-6 text-[var(--muted)]">{assessment.reason}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[2rem] border border-[color:var(--line)] bg-[var(--sage-light)]/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Bevattningskoll</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Senaste dagarna</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--forest)]">{formatMillimeters(assessment.metrics.recentPrecipitation)}</dd>
        </div>
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Regn nära framåt</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--forest)]">{formatMillimeters(assessment.metrics.forecastPrecipitation)}</dd>
        </div>
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Vädertryck på avdunstning</dt>
          <dd className="mt-1 text-sm text-[var(--muted)]">{assessment.metrics.referenceEvapotranspiration === null ? "Okänt" : "Förhöjt vid torrt och varmt väder"}</dd>
        </div>
      </dl>

      {affectedPlants.length ? (
        <ul className="grid gap-2 text-sm text-[var(--muted)]">
          {affectedPlants.map((plant) => (
            <li className="rounded-[1.25rem] bg-white/75 px-4 py-3" key={`${plant.plantId}:${plant.variety ?? ""}:${plant.reason}`}>
              <span className="font-semibold text-[var(--forest)]">
                {plant.plantName}
                {plant.variety ? ` · ${plant.variety}` : ""}
              </span>{" "}
              {plant.reason}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-sm leading-6 text-[var(--muted)]">
        Grobiggis mäter inte jordfuktighet och vet inte när du senast vattnade. Se detta som en vädersignal, inte ett bevattningskrav.
      </p>
    </section>
  );
}
