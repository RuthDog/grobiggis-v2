import type { HeatAssessment, HeatAssessmentLevel } from "@/domain/heat-watch";
import { formatTemperature } from "@/services/weather/presentation";

interface HeatWatchCardProps {
  assessment: HeatAssessment;
  compact?: boolean;
  showNeutral?: boolean;
}

const headingByLevel: Record<HeatAssessmentLevel, string> = {
  high_attention: "Mycket varmt för odlingen",
  attention: "Varm dag – håll extra koll",
  watch: "Varmt nog att följa",
  none: "Ingen tydlig värmesignal",
  unavailable: "Värmekollen saknar prognos",
};

const listFormatter = new Intl.ListFormat("sv-SE", { style: "long", type: "conjunction" });

function uniquePlantNames(assessment: HeatAssessment) {
  return [...new Set(assessment.affectedPlants.map((plant) => plant.plantName))];
}

function affectedSummary(assessment: HeatAssessment) {
  const names = uniquePlantNames(assessment);
  if (!names.length) return "Ingen av dina aktiva odlingar behöver extra värmeuppmärksamhet utifrån prognosen just nu.";
  return `${listFormatter.format(names)} kan behöva följas lite extra under värmen.`;
}

function detailText(assessment: HeatAssessment) {
  if (assessment.maximumTemperature === null) return assessment.reason;
  return `Högsta prognos: ${formatTemperature(assessment.maximumTemperature)}. ${assessment.reason}`;
}

export function HeatWatchCard({ assessment, compact = false, showNeutral = true }: HeatWatchCardProps) {
  const hasRelevantPlantSignal = !["none", "unavailable"].includes(assessment.level) && assessment.affectedPlants.length > 0;
  if (!showNeutral && !hasRelevantPlantSignal) return null;

  if (compact) {
    return (
      <section className="rounded-[1.5rem] border border-orange-200 bg-orange-50/80 px-5 py-4 text-sm shadow-[0_12px_30px_rgba(154,88,28,0.08)]">
        <p className="font-bold uppercase text-orange-800">Värmekoll</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-2 leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
        <p className="mt-2 leading-6 text-[var(--muted)]">{detailText(assessment)}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[2rem] border border-orange-200 bg-orange-50/80 p-5 shadow-[0_18px_46px_rgba(154,88,28,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase text-orange-800">Värmekoll</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--forest)]">{headingByLevel[assessment.level]}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{affectedSummary(assessment)}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Högsta prognos</dt>
          <dd className="mt-1 text-lg font-semibold text-[var(--forest)]">
            {assessment.maximumTemperature === null ? "Okänd" : formatTemperature(assessment.maximumTemperature)}
          </dd>
        </div>
        <div className="rounded-[1.25rem] bg-white/75 px-4 py-3">
          <dt className="font-bold text-[var(--moss)]">Period</dt>
          <dd className="mt-1 text-sm text-[var(--muted)]">I dag–i morgon</dd>
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
        Värmekoll är odlingsstöd, inte en allmän vädervarning. Mikroklimat, skugga, vind och växthus kan göra faktisk temperatur annorlunda.
      </p>
    </section>
  );
}
