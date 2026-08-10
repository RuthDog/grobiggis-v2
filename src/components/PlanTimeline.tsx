import { formatSwedishDateRange, groupByMonth } from "@/domain/plan-presentation";
import { planEventStatusLabel } from "@/domain/growing-display";
import type { PlannedGrowingEvent } from "@/domain/growing-types";

export function PlanTimeline({ events }: Readonly<{ events: PlannedGrowingEvent[] }>) {
  const year = events[0]?.from ? Number(events[0].from.slice(0, 4)) : new Date().getFullYear();
  const groups = groupByMonth(events, year);

  if (!events.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/70 p-6 text-sm leading-6 text-[var(--muted)]">
        Det finns inga planerade framtida aktiviteter för den här omgången.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <section className="grid gap-3" key={group.name}>
          <h3 className="text-sm font-bold uppercase text-[var(--moss)]">{group.name}</h3>
          <div className="grid gap-2">
            {group.items.map((event) => {
              const isDone = event.status === "done";

              return (
                <article
                  className={`grid gap-2 rounded-[1.25rem] border p-4 sm:grid-cols-[8.5rem_1fr_auto] sm:items-center ${
                    isDone ? "border-[color:var(--sage)] bg-[var(--sage-light)]/70" : "border-[color:var(--line)] bg-white/80"
                  }`}
                  key={event.id}
                >
                  <p className="text-sm font-bold text-[var(--forest)]">{formatSwedishDateRange(event)}</p>
                  <div>
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{event.reason}</p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      isDone ? "bg-white/85 text-[var(--forest)]" : "bg-[var(--sage-light)] text-[var(--moss)]"
                    }`}
                  >
                    {planEventStatusLabel(event.status)}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
