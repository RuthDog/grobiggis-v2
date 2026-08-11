import { BasePlanMonth } from "@/components/BasePlanMonth";
import { groupBasePlanActivitiesByMonth, type BasePlanActivityView } from "@/domain/base-plan";

export function BasePlanCalendar({
  activities,
  currentMonth,
}: Readonly<{
  activities: BasePlanActivityView[];
  currentMonth: number;
}>) {
  const months = groupBasePlanActivitiesByMonth(activities, { includeEmptyMonths: true });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {months.map((month) => (
        <BasePlanMonth isCurrent={month.index === currentMonth} items={month.items} key={month.name} name={month.name} />
      ))}
    </div>
  );
}
