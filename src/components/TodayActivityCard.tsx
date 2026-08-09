import Link from "next/link";
import { PlantVisual } from "@/components/PlantVisual";
import type { TodayActivity } from "@/domain/today-view";

export function TodayActivityCard({ activity }: Readonly<{ activity: TodayActivity }>) {
  return (
    <article className="grid gap-4 rounded-[1.6rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_18px_42px_rgba(28,67,53,0.08)] sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <PlantVisual plantId={activity.plantId} size="medium" />
      <div className="grid gap-2">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">{activity.batchName}</p>
          <h2 className="mt-1 text-xl font-semibold">{activity.title}</h2>
        </div>
        <p className="text-sm font-semibold text-[var(--forest)]">{activity.dateLabel}</p>
        <p className="text-sm text-[var(--muted)]">{activity.batchStartLabel}</p>
        <p className="text-sm leading-6 text-[var(--muted)]">{activity.reason}</p>
      </div>
      <div className="sm:justify-self-end">
        <Link
          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white/85 px-4 text-sm font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
          href={activity.href}
        >
          Oppna i Min plan
        </Link>
      </div>
    </article>
  );
}
