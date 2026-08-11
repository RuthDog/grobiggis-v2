import { basePlanActivityLabels, type BasePlanActivityView } from "@/domain/base-plan";

const activityTone: Record<BasePlanActivityView["type"], string> = {
  preSow: "bg-[#f3ede1] text-[#7a5a26]",
  directSow: "bg-[#edf5e8] text-[#45673a]",
  transplant: "bg-[#eef2f9] text-[#365076]",
  harvest: "bg-[#f9efe4] text-[#8c5123]",
};

export function BasePlanActivity({ activity }: Readonly<{ activity: BasePlanActivityView }>) {
  return (
    <article className="flex items-start gap-2.5 rounded-xl px-0.5 py-0.5">
      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${activityTone[activity.type]}`}>
        {basePlanActivityLabels[activity.type]}
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold leading-5">{activity.plantName}</h4>
      </div>
    </article>
  );
}
