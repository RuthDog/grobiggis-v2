import { completeGrowingBatch, createGrowingBatch, planBatch } from "../../domain/growing-plan.ts";
import { stockholmDateISO } from "../../domain/greeting.ts";
import type { ActualGrowingEvent, GrowingBatch } from "../../domain/growing-types.ts";
import { plants } from "../../data/plants.ts";
import type { GrowingBatchRepository } from "../../repositories/growing-batch-repository.ts";
import { GrowingInputError, validateBatchId, validateCreateGrowingBatchInput } from "./validation.ts";

export type VerifiedGrowingUser = {
  id: string;
};

function requireVerifiedUserId(user: VerifiedGrowingUser) {
  if (!user.id) throw new Error("Authentication required.");
  return user.id;
}

export function splitBatchesByStatus(batches: GrowingBatch[]) {
  return {
    activeBatches: batches.filter((batch) => batch.status === "active"),
    completedBatches: batches.filter((batch) => batch.status === "completed"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePlanEventId(planEventId: unknown) {
  if (typeof planEventId !== "string" || !planEventId.trim() || planEventId.length > 220) {
    throw new GrowingInputError("Aktiviteten kunde inte hittas.");
  }
  return planEventId;
}

function validateOptionalEventType(eventType: unknown) {
  if (eventType === undefined) return undefined;
  if (typeof eventType !== "string" || !eventType.trim() || eventType.length > 80) {
    throw new GrowingInputError("Aktiviteten kunde inte hittas.");
  }
  return eventType;
}

function rejectCompletionServerOwnedFields(input: Record<string, unknown>) {
  for (const field of ["userId", "occurredOn", "actualEvent", "status", "source", "createdAt", "updatedAt"]) {
    if (field in input) throw new GrowingInputError("Aktiviteten kunde inte sparas.");
  }
}

export async function createGrowingBatchForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  input: unknown,
  idFactory?: () => string,
) {
  const userId = requireVerifiedUserId(user);
  const sanitized = validateCreateGrowingBatchInput(input);
  const batch = createGrowingBatch(sanitized, idFactory);
  return repository.createForUser(userId, batch);
}

export async function listGrowingBatchesForUser(repository: GrowingBatchRepository, user: VerifiedGrowingUser) {
  const batches = await repository.listForUser(requireVerifiedUserId(user));
  return batches.toSorted((left, right) => {
    if (left.status !== right.status) return left.status === "active" ? -1 : 1;
    return (left.startDate ?? "").localeCompare(right.startDate ?? "") || left.id.localeCompare(right.id);
  });
}

export async function getGrowingBatchForUser(repository: GrowingBatchRepository, user: VerifiedGrowingUser, batchId: unknown) {
  return repository.getByIdForUser(requireVerifiedUserId(user), validateBatchId(batchId));
}

export async function completeGrowingBatchForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  batchId: unknown,
  completedAt = new Date().toISOString().slice(0, 10),
) {
  const userId = requireVerifiedUserId(user);
  const existing = await repository.getByIdForUser(userId, validateBatchId(batchId));
  if (!existing) return null;
  return repository.saveForUser(userId, completeGrowingBatch(existing, completedAt));
}

export async function completePlanActivityForUser(
  repository: GrowingBatchRepository,
  user: VerifiedGrowingUser,
  input: unknown,
  now = new Date(),
  idFactory: () => string = () => crypto.randomUUID(),
) {
  const userId = requireVerifiedUserId(user);
  if (!isRecord(input)) throw new GrowingInputError("Aktiviteten kunde inte sparas.");
  rejectCompletionServerOwnedFields(input);

  const batchId = validateBatchId(input.batchId);
  const planEventId = validatePlanEventId(input.planEventId);
  const eventType = validateOptionalEventType(input.eventType);
  const batch = await repository.getByIdForUser(userId, batchId);
  if (!batch) return null;
  if (batch.status === "completed") throw new GrowingInputError("Odlingsomgangen ar redan avslutad.");
  if (!planEventId.startsWith(`${batch.id}:`)) throw new GrowingInputError("Aktiviteten kunde inte hittas.");
  const requestedEventType = eventType ?? planEventId.slice(`${batch.id}:`.length);
  if (batch.actualEvents.some((event) => event.type === requestedEventType)) return batch;

  const plannedEvent = planBatch(batch, plants).events.find(
    (event) =>
      event.source === "calculated" &&
      event.status === "planned" &&
      event.batchId === batch.id &&
      event.id === planEventId &&
      (eventType === undefined || event.type === eventType),
  );

  if (!plannedEvent) throw new GrowingInputError("Aktiviteten kunde inte hittas.");

  const actualEvent: ActualGrowingEvent = {
    id: idFactory(),
    batchId: batch.id,
    plantId: batch.plantId,
    type: plannedEvent.type,
    occurredOn: stockholmDateISO(now),
  };

  return repository.addActualEventForUser(userId, batch.id, actualEvent);
}
