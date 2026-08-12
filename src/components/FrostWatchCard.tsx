import type { FrostAssessment, FrostAssessmentLevel } from "@/domain/frost-watch";
import { formatTemperature } from "@/services/weather/presentation";

interface FrostWatchCardProps {
  assessment: FrostAssessment;
  compact?: boolean;
  showNeutral?: boolean;
}

const headingByLevel: Record<FrostAssessmentLevel, string> = {
  frost: "Frost väntas i natt",
  near_frost: "Risk för frost i natt",
  cold_night: "Kall natt väntas",
  none: "Ingen tydlig frostrisk i prognosen",
  unavailable: "Frostvakten saknar nattprognos",
};

const listFormatter = new Intl.ListFormat("sv-SE", { style: "long", type: "conjunction" });

function uniquePlantNames(assessment: FrostAssessment) {
  return [...new Set(assessment.affectedPlants.map((plant) => plant.plantName))];
}

function affectedSummary(assessment: FrostAssessment) {
  const names = uniquePlantNames(assessment);
  if (!names.length) return "Ingen av dina aktiva odlingar behöver extra uppmärksamhet utifrån nattens prognos.";
  return `${listFormatter.format(names)} kan behöva skyddas om de står ute eller oskyddat.`;
}

function detailText(assessment: FrostAssessment) {
  if (assessment.minimumTemperature === null) return assessment.reason;
  return `Lägsta prognos: ${formatTemperature(assessment.minimumTemperature)}. ${assessment.reason}`;
}

export function FrostWatchCard({ assessment, compact = false, showNeutral = true }: FrostWatchCardProps) {
  const hasRelevantPlantSignal = !["none", "unavailable"].includes(assessment.level) && assessment.affectedPlants.length > 0;
  if (!showNeutral && !hasRelevantPlantSignal) return null;

  if (compact) {
    return (
      <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm shadow-[0_12px_30px_rgba(120,81,24,0.08)]">
        <p className="font-bold uppercase text-amber-800">Frostvakt</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-2 leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
        <p className="mt-2 leading-6 text-[var(--muted)]">{detailText(assessment)}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-[0_18px_46px_rgba(120,81,24,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase text-amber-800">Frostvakt</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Lägsta prognos</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--forest)]">
            {assessment.minimumTemperature === null ? "Okänd" : formatTemperature(assessment.minimumTemperature)}
          </dd>
        </div>
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Period</dt>
          <dd className="mt-1 text-sm text-[var(--muted)]">I kväll–i morgon bitti</dd>
        </div>
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Berörda odlingar</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--forest)]">{assessment.affectedPlants.length}</dd>
        </div>
      </dl>

      {assessment.affectedPlants.length ? (
        <ul className="grid gap-2 text-sm text-[var(--muted)]">
          {assessment.affectedPlants.map((plant) => (
            <li className="rounded-[1.25rem] bg-white/75 px-4 py-3" key={plant.batchId}>
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
        Mikroklimat, krukor, växthus och placering kan ge annan faktisk temperatur. Frostvakten antar inte att en plats är frostfri.
      </p>
    </section>
  );
}
