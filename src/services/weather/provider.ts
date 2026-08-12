import { fetchOpenMeteoForecast } from "./open-meteo.ts";
import type { WeatherForecast, WeatherLocation, WeatherSearchOptions } from "./types.ts";

export interface WeatherForecastRequest {
  location: WeatherLocation;
  latitude: number;
  longitude: number;
}

export interface WeatherProvider {
  getForecast(input: WeatherForecastRequest, options?: WeatherSearchOptions): Promise<WeatherForecast>;
}

const activeWeatherProvider: WeatherProvider = {
  getForecast(input, options) {
    return fetchOpenMeteoForecast(input.location, input.latitude, input.longitude, options);
  },
};

export function fetchWeatherForecast(input: WeatherForecastRequest, options?: WeatherSearchOptions) {
  return activeWeatherProvider.getForecast(input, options);
}
