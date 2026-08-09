import type { LocalGreeting } from "../../domain/greeting.ts";
import { buildTodayViewFromBatches, type TodayActivity } from "../../domain/today-view.ts";
import type { GrowingBatchRepository } from "../../repositories/growing-batch-repository.ts";
import { listGrowingBatchesForUser, type VerifiedGrowingUser } from "./service.ts";

export type CurrentUserTodayView = {
  greeting: LocalGreeting;
  activeBatchCount: number;
  today: TodayActivity[];
  now: TodayActivity[];
  next: TodayActivity[];
};

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

export async function loadTodayViewForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  now = new Date(),
): Promise<CurrentUserTodayView> {
  requireVerifiedUserId(user);
  const batches = await listGrowingBatchesForUser(repository, user);
  const view = buildTodayViewFromBatches(batches, now);

  return {
    greeting: view.greeting,
    activeBatchCount: view.activeBatchCount,
    today: view.sections.today,
    now: view.sections.now,
    next: view.sections.next,
  };
}

export async function getCurrentUserTodayView(now = new Date()) {
  const { getCurrentUser } = await import("../auth/server.ts");
  const { getGrowingRepositoryForRequest } = await import("./server.ts");
  const user = await getCurrentUser();
  if (!user) return null;
  return loadTodayViewForUser(await getGrowingRepositoryForRequest(), user, now);
}
