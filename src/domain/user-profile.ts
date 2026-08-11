export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  locality: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInput {
  firstName: string | null;
  locality: string | null;
  countryCode: "SE";
  latitude: number | null;
  longitude: number | null;
}

export class UserProfileInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserProfileInputError";
  }
}

const forbiddenClientFields = ["id", "userId", "profileId", "createdAt", "updatedAt", "countryCode", "latitude", "longitude"];

function normalizeOptionalText(value: unknown, fieldLabel: string, maxLength: number) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new UserProfileInputError(`${fieldLabel} behöver vara text.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new UserProfileInputError(`${fieldLabel} är för långt.`);
  return trimmed;
}

export function assertUserProfileUser(user: { id: string } | null | undefined) {
  if (!user?.id) throw new Error("Authentication required.");
  return user.id;
}

export function validateLatitude(value: number | null) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < -90 || value > 90) throw new UserProfileInputError("Latitude är ogiltig.");
  return value;
}

export function validateLongitude(value: number | null) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < -180 || value > 180) throw new UserProfileInputError("Longitude är ogiltig.");
  return value;
}

export function validateSaveUserProfileInput(input: unknown): UserProfileInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new UserProfileInputError("Profilen kunde inte sparas.");
  }

  const record = input as Record<string, unknown>;
  if (forbiddenClientFields.some((field) => field in record)) {
    throw new UserProfileInputError("Profilen styrs av din inloggade session.");
  }

  return {
    firstName: normalizeOptionalText(record.firstName, "Förnamn", 60),
    locality: normalizeOptionalText(record.locality, "Odlingsort", 100),
    countryCode: "SE",
    latitude: null,
    longitude: null,
  };
}

export function createInternalUserProfileInput(input: UserProfileInput) {
  return {
    ...input,
    latitude: validateLatitude(input.latitude),
    longitude: validateLongitude(input.longitude),
  };
}
