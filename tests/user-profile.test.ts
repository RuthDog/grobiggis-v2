import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createInternalUserProfileInput,
  UserProfileInputError,
  validateGeocodingCandidateInput,
  validateLatitude,
  validateLongitude,
  validateSaveUserProfileInput,
  type UserProfile,
} from "../src/domain/user-profile.ts";
import { getUserProfileForUser, saveUserProfileForUser } from "../src/lib/user-profile/service.ts";
import type { UserProfileRepository } from "../src/repositories/user-profile-repository.ts";

class MemoryUserProfileRepository implements UserProfileRepository {
  readonly rows = new Map<string, UserProfile>();

  async getForUser(userId: string) {
    const profile = [...this.rows.values()].find((row) => row.userId === userId);
    return profile ? structuredClone(profile) : null;
  }

  async upsertForUser(userId: string, profile: UserProfile) {
    const existing = await this.getForUser(userId);
    const snapshot = { ...structuredClone(profile), userId, id: existing?.id ?? profile.id, createdAt: existing?.createdAt ?? profile.createdAt };
    if (existing) this.rows.delete(existing.id);
    this.rows.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }
}

const userA = { id: "user-a" };
const userB = { id: "user-b" };
const read = (path: string) => readFileSync(path, "utf8");
const halmstadCandidate = {
  providerId: "2708365",
  name: "Halmstad",
  admin1: "Hallands län",
  admin2: "Halmstads Kommun",
  country: "Sverige",
  countryCode: "SE",
  latitude: 56.67446,
  longitude: 12.85676,
  timezone: "Europe/Stockholm",
};

test("profile belongs to Better Auth user id and create stores server-owned fields", async () => {
  const repository = new MemoryUserProfileRepository();
  const profile = await saveUserProfileForUser(repository, userA, { firstName: " Ola ", locality: " Halmstad " }, () => "profile-a", new Date("2026-08-11T08:00:00Z"));

  assert.equal(profile.id, "profile-a");
  assert.equal(profile.userId, "user-a");
  assert.equal(profile.firstName, "Ola");
  assert.equal(profile.locality, "Halmstad");
  assert.equal(profile.countryCode, "SE");
  assert.equal(profile.latitude, null);
  assert.equal(profile.longitude, null);
});

test("one user can only have one profile and upsert updates without duplicate", async () => {
  const repository = new MemoryUserProfileRepository();
  await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Halmstad" }, () => "profile-a", new Date("2026-08-11T08:00:00Z"));
  const updated = await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Varberg" }, () => "profile-b", new Date("2026-08-12T08:00:00Z"));

  assert.equal(repository.rows.size, 1);
  assert.equal(updated.id, "profile-a");
  assert.equal(updated.locality, "Varberg");
  assert.equal(updated.createdAt, "2026-08-11T08:00:00.000Z");
  assert.equal(updated.updatedAt, "2026-08-12T08:00:00.000Z");
});

test("firstName and locality normalize optional text and Swedish letters", () => {
  assert.deepEqual(validateSaveUserProfileInput({ firstName: " Åsa ", locality: " Växjö " }), {
    firstName: "Åsa",
    locality: "Växjö",
    selectedLocation: null,
  });
  assert.equal(validateSaveUserProfileInput({ firstName: "   ", locality: "" }).firstName, null);
  assert.equal(validateSaveUserProfileInput({ firstName: "   ", locality: "" }).locality, null);
});

test("invalid profile input and client-owned fields are rejected", () => {
  assert.throws(() => validateSaveUserProfileInput(null), UserProfileInputError);
  assert.throws(() => validateSaveUserProfileInput({ firstName: "Ola", userId: "client-user" }), UserProfileInputError);
  assert.throws(() => validateSaveUserProfileInput({ firstName: "Ola", id: "client-profile" }), UserProfileInputError);
  assert.throws(() => validateSaveUserProfileInput({ firstName: "Ola", profileId: "profile-b" }), UserProfileInputError);
  assert.throws(() => validateSaveUserProfileInput({ firstName: "x".repeat(61) }), UserProfileInputError);
  assert.throws(() => validateSaveUserProfileInput({ locality: "x".repeat(101) }), UserProfileInputError);
});

test("coordinates are nullable and internally range-validated", () => {
  assert.deepEqual(createInternalUserProfileInput({ firstName: null, locality: null, selectedLocation: null }), {
    firstName: null,
    locality: null,
    countryCode: "SE",
    latitude: null,
    longitude: null,
  });
  assert.equal(validateLatitude(57.7), 57.7);
  assert.equal(validateLongitude(12.0), 12.0);
  assert.throws(() => validateLatitude(91), UserProfileInputError);
  assert.throws(() => validateLongitude(181), UserProfileInputError);
});

test("verified Swedish candidate validates and stores locality with coordinates", async () => {
  const repository = new MemoryUserProfileRepository();
  const profile = await saveUserProfileForUser(
    repository,
    userA,
    { firstName: "Ola", locality: "Halmstad", selectedLocation: halmstadCandidate },
    () => "profile-a",
    new Date("2026-08-11T08:00:00Z"),
  );

  assert.equal(profile.locality, "Halmstad");
  assert.equal(profile.countryCode, "SE");
  assert.equal(profile.latitude, 56.67446);
  assert.equal(profile.longitude, 12.85676);
});

test("candidate validation rejects invalid latitude, longitude and non-SE country", () => {
  assert.throws(() => validateGeocodingCandidateInput({ ...halmstadCandidate, latitude: 91 }), UserProfileInputError);
  assert.throws(() => validateGeocodingCandidateInput({ ...halmstadCandidate, longitude: 181 }), UserProfileInputError);
  assert.throws(() => validateGeocodingCandidateInput({ ...halmstadCandidate, countryCode: "DK" }), UserProfileInputError);
});

test("locality changed without a new candidate clears old coordinates", async () => {
  const repository = new MemoryUserProfileRepository();
  await saveUserProfileForUser(
    repository,
    userA,
    { firstName: "Ola", locality: "Halmstad", selectedLocation: halmstadCandidate },
    () => "profile-a",
    new Date("2026-08-11T08:00:00Z"),
  );

  const updated = await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Göteborg" }, () => "ignored", new Date("2026-08-12T08:00:00Z"));

  assert.equal(updated.id, "profile-a");
  assert.equal(updated.locality, "Göteborg");
  assert.equal(updated.latitude, null);
  assert.equal(updated.longitude, null);
});

test("same locality without a new candidate keeps verified coordinates", async () => {
  const repository = new MemoryUserProfileRepository();
  await saveUserProfileForUser(
    repository,
    userA,
    { firstName: "Ola", locality: "Halmstad", selectedLocation: halmstadCandidate },
    () => "profile-a",
    new Date("2026-08-11T08:00:00Z"),
  );

  const updated = await saveUserProfileForUser(repository, userA, { firstName: "Olle", locality: "Halmstad" }, () => "ignored", new Date("2026-08-12T08:00:00Z"));

  assert.equal(updated.firstName, "Olle");
  assert.equal(updated.latitude, 56.67446);
  assert.equal(updated.longitude, 12.85676);
});

test("candidate confirmation is required before coordinates are saved", async () => {
  const repository = new MemoryUserProfileRepository();
  const profile = await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Halmstad" }, () => "profile-a", new Date("2026-08-11T08:00:00Z"));

  assert.equal(profile.locality, "Halmstad");
  assert.equal(profile.latitude, null);
  assert.equal(profile.longitude, null);
});

test("profile read and update are scoped by verified user", async () => {
  const repository = new MemoryUserProfileRepository();
  await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Halmstad" }, () => "profile-a", new Date("2026-08-11T08:00:00Z"));
  await saveUserProfileForUser(repository, userB, { firstName: "Bea", locality: "Halmstad" }, () => "profile-b", new Date("2026-08-11T08:01:00Z"));

  assert.equal((await getUserProfileForUser(repository, userA))?.id, "profile-a");
  assert.equal((await getUserProfileForUser(repository, userB))?.id, "profile-b");

  await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Laholm" }, () => "ignored", new Date("2026-08-12T08:00:00Z"));

  assert.equal((await getUserProfileForUser(repository, userA))?.locality, "Laholm");
  assert.equal((await getUserProfileForUser(repository, userB))?.locality, "Halmstad");
});

test("profile requires a verified user and survives a reload-equivalent round-trip", async () => {
  const repository = new MemoryUserProfileRepository();
  await assert.rejects(() => saveUserProfileForUser(repository, { id: "" }, { firstName: "Ola", locality: "Halmstad" }), /Authentication required/i);

  await saveUserProfileForUser(repository, userA, { firstName: "Ola", locality: "Halmstad" }, () => "profile-a", new Date("2026-08-11T08:00:00Z"));
  const reloaded = await getUserProfileForUser(repository, userA);

  assert.equal(reloaded?.firstName, "Ola");
  assert.equal(reloaded?.locality, "Halmstad");
});

test("profile foundation does not touch growing, shopping or placement persistence code", () => {
  const service = read("src/lib/user-profile/service.ts");
  const actions = read("src/lib/user-profile/actions.ts");
  const page = read("src/app/profil/page.tsx");
  const form = read("src/components/UserProfileForm.tsx");
  const schema = read("src/db/schema.ts");
  const migration = read("migrations/0004_short_lake.sql");
  const profileSchema = schema.slice(schema.indexOf("export const userProfiles"), schema.indexOf("export const growingBatchRelations"));

  assert.doesNotMatch(`${service}\n${actions}`, /growing|shoppingList|plantPlacements|growingEvents|growingBatches/);
  assert.doesNotMatch(`${page}\n${form}`, /localStorage|sessionStorage|indexedDB|navigator\.geolocation|SMHI|Mapbox|Nominatim|Google Maps|weather|forecast/i);
  assert.doesNotMatch(`${profileSchema}\n${migration}`, /street|address|postal|postcode|zip|house|provider|admin|timezone/i);
});

test("profile route, action and navigation are wired through auth-backed server flow", () => {
  const page = read("src/app/profil/page.tsx");
  const form = read("src/components/UserProfileForm.tsx");
  const server = read("src/lib/user-profile/server.ts");
  const actions = read("src/lib/user-profile/actions.ts");
  const authNav = read("src/components/AuthNav.tsx");

  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /Du behöver logga in|Du behÃ¶ver logga in/);
  assert.match(form, /saveUserProfileAction\(\{/);
  assert.match(form, /searchLocalityAction\(trimmedPlace\)/);
  assert.match(server, /requireUser\(\)/);
  assert.match(actions, /revalidatePath\("\/profil"\)/);
  assert.match(authNav, /href="\/profil"/);
  assert.match(authNav, /Profil/);
});

test("Version 3.1 stores no provider payload and creates no migration", () => {
  const schema = read("src/db/schema.ts");
  const repository = read("src/repositories/user-profile-repository.ts");
  const service = read("src/lib/user-profile/service.ts");
  const actions = read("src/lib/user-profile/actions.ts");
  const form = read("src/components/UserProfileForm.tsx");
  const migrations = readFileSync("migrations/meta/_journal.json", "utf8");
  const profileSchema = schema.slice(schema.indexOf("export const userProfiles"), schema.indexOf("export const growingBatchRelations"));

  assert.doesNotMatch(`${profileSchema}\n${repository}`, /providerId|admin1|admin2|timezone|population|feature_code|postcodes/i);
  assert.doesNotMatch(`${service}\n${actions}\n${form}`, /forecast|weather|SMHI|navigator\.geolocation/i);
  assert.doesNotMatch(migrations, /0005_/);
});
