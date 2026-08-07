import type { PlanDateRange } from "./growing-types.ts";

export const swedishMonths = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
] as const;

const dateAtNoon = (value: string) => new Date(`${value}T12:00:00Z`);
const day = (value: string) => dateAtNoon(value).getUTCDate();
const month = (value: string) => dateAtNoon(value).getUTCMonth();

export function formatSwedishDateRange({ from, to }: PlanDateRange) {
  const fromDate = dateAtNoon(from);
  const toDate = dateAtNoon(to);
  const fromMonth = fromDate.getUTCMonth();
  const toMonth = toDate.getUTCMonth();

  if (from === to) return `${day(from)} ${swedishMonths[fromMonth].toLowerCase()}`;
  if (fromMonth === toMonth && fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
    return `${day(from)}-${day(to)} ${swedishMonths[fromMonth].toLowerCase()}`;
  }

  return `${day(from)} ${swedishMonths[fromMonth].toLowerCase()}-${day(to)} ${swedishMonths[toMonth].toLowerCase()}`;
}

export function sortPlanItems<T extends PlanDateRange & { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.id.localeCompare(right.id));
}

export function monthsForRange({ from, to }: PlanDateRange) {
  const months: number[] = [];
  const cursor = new Date(Date.UTC(dateAtNoon(from).getUTCFullYear(), month(from), 1));
  const end = dateAtNoon(to);

  while (cursor.getTime() <= end.getTime()) {
    months.push(cursor.getUTCMonth());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return [...new Set(months)];
}

export function groupByMonth<T extends PlanDateRange & { id: string }>(items: T[], year: number) {
  return swedishMonths
    .map((name, index) => ({
      name,
      index,
      items: sortPlanItems(items.filter((item) => dateAtNoon(item.from).getUTCFullYear() === year && month(item.from) === index)),
    }))
    .filter((group) => group.items.length > 0);
}
