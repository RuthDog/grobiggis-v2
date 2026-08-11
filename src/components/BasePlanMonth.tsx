import { BasePlanActivity } from "@/components/BasePlanActivity";
import type { BasePlanActivityView } from "@/domain/base-plan";

type BasePlanMonthProps = {
  isCurrent: boolean;
  name: string;
  items: BasePlanActivityView[];
};

export function BasePlanMonth({ isCurrent, name, items }: Readonly<BasePlanMonthProps>) {
  return (
    <section
      className={`grid content-start gap-3 rounded-[1.5rem] border bg-[rgba(255,254,250,0.88)] p-4 shadow-[0_10px_24px_rgba(28,67,53,0.05)] ${
        isCurrent ? "border-[var(--moss)]" : "border-[color:var(--line)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase text-[var(--moss)]">{name}</h3>
        {isCurrent ? (
          <span className="rounded-full bg-[var(--forest)] px-2.5 py-1 text-[11px] font-bold uppercase leading-none text-white">Nu</span>
        ) : null}
      </div>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((activity) => (
            <BasePlanActivity activity={activity} key={activity.id} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[var(--muted)]">
          En lugn månad
        </p>
      )}
    </section>
  );
}
