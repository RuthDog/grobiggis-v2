import type { LocalGreeting } from "../../domain/greeting.ts";
import type { FrostAssessment } from "../../domain/frost-watch.ts";
import type { GrowingBatch, GrowingSpace } from "../../domain/growing-types.ts";
import type { HeatAssessment } from "../../domain/heat-watch.ts";
import { buildWeatherSignals, type GrobiggisSignal } from "../../domain/signals.ts";
import type { WaterAssessment } from "../../domain/water-watch.ts";
import { buildTodayViewFromBatches, type TodayActivity } from "../../domain/today-view.ts";
import type { GrowingBatchRepository } from "../../repositories/growing-batch-repository.ts";
import type { GrowingSpaceRepository } from "../../repositories/growing-space-repository.ts";
import { listGrowingSpacesForUser } from "./spaces.ts";
import { listGrowingBatchesForUser, type VerifiedGrowingUser } from "./service.ts";

export type CurrentUserTodayView = {
  greeting: LocalGreeting;
  activeBatchCount: number;
  today: TodayActivity[];
  now: TodayActivity[];
  next: TodayActivity[];
  signals: GrobiggisSignal[];
};

type FrostAssessmentLoader = (user: VerifiedGrowingUser, activeBatches: GrowingBatch[], now: Date) => Promise<FrostAssessment>;
type WeatherAssessmentsLoader = (
  user: VerifiedGrowingUser,
  activeBatches: GrowingBatch[],
  spaces: GrowingSpace[],
  now: Date,
) => Promise<{ frostAssessment: FrostAssessment; waterAssessment: WaterAssessment; heatAssessment: HeatAssessment }>;
type SignalsLoader = (user: VerifiedGrowingUser, activeBatches: GrowingBatch[], spaces: GrowingSpace[], now: Date) => Promise<GrobiggisSignal[]>;

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

export async function loadTodayViewForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  now = new Date(),
  options: { loadFrostAssessment?: FrostAssessmentLoader; loadWeatherAssessments?: WeatherAssessmentsLoader; loadSignals?: SignalsLoader; spaceRepository?: GrowingSpaceRepository } = {},
): Promise<CurrentUserTodayView> {
  requireVerifiedUserId(user);
  const batches = await listGrowingBatchesForUser(repository, user);
  const view = buildTodayViewFromBatches(batches, now);
  const spaces = options.spaceRepository ? await listGrowingSpacesForUser(options.spaceRepository, user) : [];
  const signals = options.loadSignals
    ? await options.loadSignals(user, view.activeBatches, spaces, now)
    : options.loadWeatherAssessments
      ? buildWeatherSignals(await options.loadWeatherAssessments(user, view.activeBatches, spaces, now))
      : options.loadFrostAssessment
        ? buildWeatherSignals({
            frostAssessment: await options.loadFrostAssessment(user, view.activeBatches, now),
            waterAssessment: {
              level: "none",
              reason: "",
              rainExpectedSoon: false,
              metrics: { recentPrecipitation: null, forecastPrecipitation: null, referenceEvapotranspiration: null, maxTemperature: null },
              window: { recentStart: "", recentEnd: "", forecastStart: null, forecastEnd: null, timeZone: "Europe/Stockholm" },
              affectedPlants: [],
            },
            heatAssessment: {
              level: "none",
              maximumTemperature: null,
              hottestDate: null,
              window: { start: "", end: "", timeZone: "Europe/Stockholm" },
              affectedPlants: [],
              reason: "",
            },
          })
        : [];

  return {
    greeting: view.greeting,
    activeBatchCount: view.activeBatchCount,
    today: view.sections.today,
    now: view.sections.now,
    next: view.sections.next,
    signals,
  };
}

export async function getCurrentUserTodayView(now = new Date()) {
  const { getCurrentUser } = await import("../auth/server.ts");
  const { getGrowingRepositoryForRequest, getGrowingSpaceRepositoryForRequest } = await import("./server.ts");
  const { getSignalsForUser } = await import("../signals/server.ts");
  const user = await getCurrentUser();
  if (!user) return null;
  return loadTodayViewForUser(await getGrowingRepositoryForRequest(), user, now, {
    loadSignals: getSignalsForUser,
    spaceRepository: await getGrowingSpaceRepositoryForRequest(),
  });
}
