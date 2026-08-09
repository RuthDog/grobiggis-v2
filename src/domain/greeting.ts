export type LocalGreeting = {
  heading: string;
  support: string;
  dateLabel: string;
  dateISO: string;
  timeZone: string;
};

const DEFAULT_TIME_ZONE = "Europe/Stockholm";
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  const key = `parts:${timeZone}`;
  let value = formatterCache.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatterCache.set(key, value);
  }
  return value;
}

function localParts(now: Date, timeZone: string) {
  const values = Object.fromEntries(formatter(timeZone).formatToParts(now).map((part) => [part.type, part.value]));
  return {
    hour: Number(values.hour),
    weekday: values.weekday ?? "",
    year: values.year ?? "",
    month: values.month ?? "",
    day: values.day ?? "",
  };
}

export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 10) return "God morgon";
  if (hour >= 10 && hour < 12) return "God formiddag";
  if (hour >= 12 && hour < 17) return "God eftermiddag";
  if (hour >= 17 && hour < 22) return "God kvall";
  return "Hej";
}

export function stockholmDateISO(now: Date, timeZone = DEFAULT_TIME_ZONE) {
  const local = localParts(now, timeZone);
  return `${local.year}-${local.month}-${local.day}`;
}

export function localGreeting(now: Date, timeZone = DEFAULT_TIME_ZONE): LocalGreeting {
  const local = localParts(now, timeZone);
  const dateText = `${local.weekday} ${Number(local.day)} ${new Intl.DateTimeFormat("sv-SE", { timeZone, month: "long" }).format(now)}`;
  return {
    heading: greetingForHour(local.hour),
    support: "Har ar det som ar aktuellt i din odling.",
    dateLabel: dateText[0]?.toLocaleUpperCase("sv-SE") + dateText.slice(1),
    dateISO: `${local.year}-${local.month}-${local.day}`,
    timeZone,
  };
}
