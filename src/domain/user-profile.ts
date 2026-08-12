import type { GeocodingCandidate } from "../services/geocoding/types.ts";

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
  selectedLocation: GeocodingCandidate | null;
}

export interface UserProfilePersistenceInput {
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

function validateCandidateText(value: unknown, fieldLabel: string, maxLength: number, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new UserProfileInputError(`${fieldLabel} behöver vara text.`);
    return null;
  }
  if (typeof value !== "string") throw new UserProfileInputError(`${fieldLabel} behöver vara text.`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new UserProfileInputError(`${fieldLabel} behöver vara text.`);
    return null;
  }
  if (trimmed.length > maxLength) throw new UserProfileInputError(`${fieldLabel} är för långt.`);
  return trimmed;
}

export function validateGeocodingCandidateInput(value: unknown): GeocodingCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserProfileInputError("Välj en verifierad svensk ort innan du sparar platsen.");
  }

  const record = value as Record<string, unknown>;
  const countryCode = validateCandidateText(record.countryCode, "Landkod", 2, true);
  if (countryCode !== "SE") throw new UserProfileInputError("Grobiggis stödjer bara svenska odlingsorter än så länge.");

  if (typeof record.latitude !== "number" || typeof record.longitude !== "number") {
    throw new UserProfileInputError("Den valda orten saknar giltiga koordinater.");
  }

  const providerId = validateCandidateText(record.providerId, "Provider-id", 80, true);
  const name = validateCandidateText(record.name, "Odlingsort", 100, true);
  const latitude = validateLatitude(record.latitude);
  const longitude = validateLongitude(record.longitude);

  if (!providerId || !name || latitude === null || longitude === null) {
    throw new UserProfileInputError("Den valda orten saknar giltiga koordinater.");
  }

  return {
    providerId,
    name,
    admin1: validateCandidateText(record.admin1, "Region", 100),
    admin2: validateCandidateText(record.admin2, "Område", 100),
    country: validateCandidateText(record.country, "Land", 100),
    countryCode: "SE",
    latitude,
    longitude,
    timezone: validateCandidateText(record.timezone, "Tidszon", 80),
  };
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
    selectedLocation: record.selectedLocation === undefined || record.selectedLocation === null ? null : validateGeocodingCandidateInput(record.selectedLocation),
  };
}

export function createInternalUserProfileInput(input: UserProfileInput, existingProfile?: UserProfile | null): UserProfilePersistenceInput {
  if (input.selectedLocation) {
    return {
      firstName: input.firstName,
      locality: input.selectedLocation.name,
      countryCode: "SE",
      latitude: validateLatitude(input.selectedLocation.latitude),
      longitude: validateLongitude(input.selectedLocation.longitude),
    };
  }

  const keepsVerifiedLocation =
    input.locality !== null &&
    existingProfile?.locality === input.locality &&
    existingProfile.latitude !== null &&
    existingProfile.longitude !== null;

  return {
    firstName: input.firstName,
    locality: input.locality,
    countryCode: "SE",
    latitude: keepsVerifiedLocation ? validateLatitude(existingProfile.latitude) : null,
    longitude: keepsVerifiedLocation ? validateLongitude(existingProfile.longitude) : null,
  };
}
