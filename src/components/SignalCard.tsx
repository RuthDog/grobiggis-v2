import Link from "next/link";
import type { GrobiggisSignal, SignalLevel, SignalType } from "@/domain/signals";
import { uniqueAffectedBatchLabelsForPresentation } from "@/components/signal-card-presentation";

interface SignalCardProps {
  signal: GrobiggisSignal;
}

const visualByType: Record<SignalType, { label: string; className: string }> = {
  frost: { label: "Frostvakt", className: "border-amber-200 bg-amber-50/80 text-amber-800" },
  watering: { label: "Bevattningskoll", className: "border-[color:var(--line)] bg-[var(--sage-light)]/80 text-[var(--moss)]" },
  heat: { label: "Värmekoll", className: "border-orange-200 bg-orange-50/80 text-orange-800" },
};

const levelLabel: Record<SignalLevel, string> = {
  important: "Viktigt idag",
  attention: "Uppmärksamma",
  info: "Att följa",
};

export function SignalCard({ signal }: SignalCardProps) {
  const visual = visualByType[signal.type];
  const affected = uniqueAffectedBatchLabelsForPresentation(signal.affectedBatches);

  return (
    <section className={`rounded-[1.5rem] border px-5 py-4 text-sm shadow-[0_12px_30px_rgba(28,67,53,0.08)] ${visual.className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold uppercase">{visual.label}</p>
        <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-bold text-[var(--forest)]">{levelLabel[signal.level]}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--forest)]">{signal.title}</h2>
      <p className="mt-2 leading-6 text-[var(--muted)]">{signal.message}</p>
      {affected.length ? <p className="mt-2 text-xs font-semibold text-[var(--forest)]">{affected.join(" · ")}</p> : null}
      {signal.action ? (
        <Link className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white/80 px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href={signal.action.href}>
          {signal.action.label}
        </Link>
      ) : null}
    </section>
  );
}
