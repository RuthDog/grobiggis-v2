import type { WeatherCondition } from "./types.ts";

const labels: Record<WeatherCondition, string> = {
  clear: "Klart",
  partly_cloudy: "Växlande molnighet",
  cloudy: "Mulet",
  fog: "Dimma",
  drizzle: "Duggregn",
  rain: "Regn",
  snow: "Snö",
  showers: "Skurar",
  thunderstorm: "Åska",
  unknown: "Väderläge okänt",
};

export function labelForCondition(condition: WeatherCondition) {
  return labels[condition];
}

export function formatTemperature(value: number) {
  return `${Math.round(value)}°`;
}

export function formatWind(value: number) {
  return `${Math.round(value)} m/s`;
}

export function formatPrecipitation(value: number) {
  if (value <= 0) return "0 mm";
  return `${value.toFixed(value < 1 ? 1 : 0)} mm`;
}

export function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("sv-SE", { weekday: "long", timeZone: "Europe/Stockholm" }).format(new Date(`${date}T12:00:00+02:00`));
}
