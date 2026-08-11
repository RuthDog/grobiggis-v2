import { assertUserProfileUser, createInternalUserProfileInput, validateSaveUserProfileInput } from "../../domain/user-profile.ts";
import type { UserProfileRepository } from "../../repositories/user-profile-repository.ts";

export async function getUserProfileForUser(repository: UserProfileRepository, user: { id: string } | null | undefined) {
  const userId = assertUserProfileUser(user);
  return repository.getForUser(userId);
}

export async function saveUserProfileForUser(
  repository: UserProfileRepository,
  user: { id: string } | null | undefined,
  input: unknown,
  createId: () => string = () => crypto.randomUUID(),
  now: Date = new Date(),
) {
  const userId = assertUserProfileUser(user);
  const normalized = createInternalUserProfileInput(validateSaveUserProfileInput(input));
  const timestamp = now.toISOString();

  return repository.upsertForUser(userId, {
    id: createId(),
    userId,
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
