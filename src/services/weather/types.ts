export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "thunderstorm"
  | "unknown";

export interface WeatherLocation {
  locality: string;
  countryCode: "SE";
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  condition: WeatherCondition;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
}

export interface DailyWeather {
  date: string;
  condition: WeatherCondition;
  temperatureMin: number;
  temperatureMax: number;
  precipitationSum: number;
  referenceEvapotranspiration: number | null;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number;
  windGustsMax: number;
  sunrise: string | null;
  sunset: string | null;
  isPast: boolean;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
}

export interface WeatherForecast {
  location: WeatherLocation;
  timezone: string;
  fetchedAt: string;
  current: CurrentWeather;
  daily: DailyWeather[];
  hourly: HourlyWeather[];
  attribution: {
    label: string;
    url: string;
  };
}

export interface WeatherSearchOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  revalidateSeconds?: number;
  now?: () => Date;
}

export class WeatherForecastError extends Error {
  readonly kind: "http" | "malformed" | "network" | "timeout";

  constructor(message = "Vädret kunde inte hämtas just nu.", kind: "http" | "malformed" | "network" | "timeout" = "network") {
    super(message);
    this.name = "WeatherForecastError";
    this.kind = kind;
  }
}
