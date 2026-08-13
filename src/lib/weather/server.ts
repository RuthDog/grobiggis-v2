import { getCurrentUser } from "@/lib/auth/server";
import { plants } from "@/data/plants";
import { assessFrostRisk, unavailableFrostAssessment, type FrostAssessment } from "@/domain/frost-watch";
import { assessWaterAttention, unavailableWaterAssessment, type WaterAssessment } from "@/domain/water-watch";
import type { GrowingBatch, GrowingSpace } from "@/domain/growing-types";
import { getGrowingRepositoryForRequest, getGrowingSpaceRepositoryForRequest } from "@/lib/growing/server";
import { listGrowingBatchesForUser, type VerifiedGrowingUser } from "@/lib/growing/service";
import { listGrowingSpacesForUser } from "@/lib/growing/spaces";
import { getUserProfileRepositoryForRequest } from "@/lib/user-profile/server";
import { getUserProfileForUser } from "@/lib/user-profile/service";
import { fetchWeatherForecast } from "@/services/weather/provider";
import { WeatherForecastError, type WeatherForecast } from "@/services/weather/types";

export type CurrentUserWeatherState =
  | { status: "signed-out" }
  | { status: "missing-location"; locality: string | null }
  | { status: "error"; locality: string; error: string }
  | { status: "ready"; forecast: WeatherForecast; frostAssessment: FrostAssessment; waterAssessment: WaterAssessment };

export interface CurrentUserWeatherAssessments {
  frostAssessment: FrostAssessment;
  waterAssessment: WaterAssessment;
}

function assessWeatherSignals(forecast: WeatherForecast, batches: GrowingBatch[], spaces: GrowingSpace[] = [], now = new Date()): CurrentUserWeatherAssessments {
  return {
    frostAssessment: assessFrostRisk({ forecast, batches, plantCatalog: plants, now }),
    waterAssessment: assessWaterAttention({ forecast, batches, plantCatalog: plants, growingSpaces: spaces, now }),
  };
}

export async function getWeatherAssessmentsForUser(
  user: VerifiedGrowingUser,
  batches: GrowingBatch[],
  spaces: GrowingSpace[] = [],
  now = new Date(),
): Promise<CurrentUserWeatherAssessments> {
  if (!user.id) throw new Error("Authentication required.");
  const profile = await getUserProfileForUser(await getUserProfileRepositoryForRequest(), user);
  if (!profile?.locality || profile.latitude === null || profile.longitude === null) {
    return { frostAssessment: unavailableFrostAssessment(now), waterAssessment: unavailableWaterAssessment(now) };
  }

  try {
    const forecast = await fetchWeatherForecast(
      {
        location: {
          locality: profile.locality,
          countryCode: "SE",
        },
        latitude: profile.latitude,
        longitude: profile.longitude,
      },
      { now: () => now },
    );

    return assessWeatherSignals(forecast, batches, spaces, now);
  } catch {
    return { frostAssessment: unavailableFrostAssessment(now), waterAssessment: unavailableWaterAssessment(now) };
  }
}

export async function getFrostAssessmentForUser(user: VerifiedGrowingUser, batches: GrowingBatch[], now = new Date()): Promise<FrostAssessment> {
  return (await getWeatherAssessmentsForUser(user, batches, [], now)).frostAssessment;
}

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

    const batches = await listGrowingBatchesForUser(await getGrowingRepositoryForRequest(), user);
    const spaces = await listGrowingSpacesForUser(await getGrowingSpaceRepositoryForRequest(), user);
    const { frostAssessment, waterAssessment } = assessWeatherSignals(forecast, batches, spaces);

    return { status: "ready", forecast, frostAssessment, waterAssessment };
  } catch (error) {
    if (error instanceof WeatherForecastError) return { status: "error", locality: profile.locality, error: error.message };
    return { status: "error", locality: profile.locality, error: "Vädret kunde inte hämtas just nu." };
  }
}
