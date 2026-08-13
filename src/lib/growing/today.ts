import type { LocalGreeting } from "../../domain/greeting.ts";
import type { FrostAssessment } from "../../domain/frost-watch.ts";
import type { GrowingBatch, GrowingSpace } from "../../domain/growing-types.ts";
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
  frostAssessment: FrostAssessment | null;
  waterAssessment: WaterAssessment | null;
};

type FrostAssessmentLoader = (user: VerifiedGrowingUser, activeBatches: GrowingBatch[], now: Date) => Promise<FrostAssessment>;
type WeatherAssessmentsLoader = (
  user: VerifiedGrowingUser,
  activeBatches: GrowingBatch[],
  spaces: GrowingSpace[],
  now: Date,
) => Promise<{ frostAssessment: FrostAssessment; waterAssessment: WaterAssessment }>;

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

export async function loadTodayViewForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  now = new Date(),
  options: { loadFrostAssessment?: FrostAssessmentLoader; loadWeatherAssessments?: WeatherAssessmentsLoader; spaceRepository?: GrowingSpaceRepository } = {},
): Promise<CurrentUserTodayView> {
  requireVerifiedUserId(user);
  const batches = await listGrowingBatchesForUser(repository, user);
  const view = buildTodayViewFromBatches(batches, now);
  const spaces = options.spaceRepository ? await listGrowingSpacesForUser(options.spaceRepository, user) : [];
  const assessments = options.loadWeatherAssessments ? await options.loadWeatherAssessments(user, view.activeBatches, spaces, now) : null;
  const frostAssessment = assessments?.frostAssessment ?? (options.loadFrostAssessment ? await options.loadFrostAssessment(user, view.activeBatches, now) : null);
  const waterAssessment = assessments?.waterAssessment ?? null;

  return {
    greeting: view.greeting,
    activeBatchCount: view.activeBatchCount,
    today: view.sections.today,
    now: view.sections.now,
    next: view.sections.next,
    frostAssessment,
    waterAssessment,
  };
}

export async function getCurrentUserTodayView(now = new Date()) {
  const { getCurrentUser } = await import("../auth/server.ts");
  const { getGrowingRepositoryForRequest, getGrowingSpaceRepositoryForRequest } = await import("./server.ts");
  const { getWeatherAssessmentsForUser } = await import("../weather/server.ts");
  const user = await getCurrentUser();
  if (!user) return null;
  return loadTodayViewForUser(await getGrowingRepositoryForRequest(), user, now, {
    loadWeatherAssessments: getWeatherAssessmentsForUser,
    spaceRepository: await getGrowingSpaceRepositoryForRequest(),
  });
}
