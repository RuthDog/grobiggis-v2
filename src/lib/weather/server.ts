import { getCurrentUser } from "@/lib/auth/server";
import { getUserProfileRepositoryForRequest } from "@/lib/user-profile/server";
import { getUserProfileForUser } from "@/lib/user-profile/service";
import { fetchWeatherForecast } from "@/services/weather/provider";
import { WeatherForecastError, type WeatherForecast } from "@/services/weather/types";

export type CurrentUserWeatherState =
  | { status: "signed-out" }
  | { status: "missing-location"; locality: string | null }
  | { status: "error"; locality: string; error: string }
  | { status: "ready"; forecast: WeatherForecast };

export async function getCurrentUserWeatherForecast(): Promise<CurrentUserWeatherState> {
  const user = await getCurrentUser();
  if (!user) return { status: "signed-out" };

  const profile = await getUserProfileForUser(await getUserProfileRepositoryForRequest(), user);
  if (!profile?.locality || profile.latitude === null || profile.longitude === null) {
    return { status: "missing-location", locality: profile?.locality ?? null };
  }

  try {
    const forecast = await fetchWeatherForecast({
      location: {
        locality: profile.locality,
        countryCode: "SE",
      },
      latitude: profile.latitude,
      longitude: profile.longitude,
    });

    return { status: "ready", forecast };
  } catch (error) {
    if (error instanceof WeatherForecastError) return { status: "error", locality: profile.locality, error: error.message };
    return { status: "error", locality: profile.locality, error: "Vädret kunde inte hämtas just nu." };
  }
}
