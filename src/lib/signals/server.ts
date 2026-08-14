import type { GrobiggisSignal } from "@/domain/signals";
import { buildWeatherSignals } from "@/domain/signals";
import type { GrowingBatch, GrowingSpace } from "@/domain/growing-types";
import { getWeatherAssessmentsForUser } from "@/lib/weather/server";
import type { VerifiedGrowingUser } from "@/lib/growing/service";

export async function getSignalsForUser(user: VerifiedGrowingUser, activeBatches: GrowingBatch[], spaces: GrowingSpace[] = [], now = new Date()): Promise<GrobiggisSignal[]> {
  const assessments = await getWeatherAssessmentsForUser(user, activeBatches, spaces, now);
  return buildWeatherSignals(assessments);
}
