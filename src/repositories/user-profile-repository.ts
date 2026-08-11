import { eq } from "drizzle-orm";
import type { GrobiggisDb } from "@/db/client";
import { userProfiles, type UserProfileRow } from "@/db/schema";
import type { UserProfile } from "@/domain/user-profile";

export interface UserProfileRepository {
  getForUser(userId: string): Promise<UserProfile | null>;
  upsertForUser(userId: string, profile: UserProfile): Promise<UserProfile>;
}

function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    locality: row.locality,
    countryCode: row.countryCode,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function userProfileToRow(profile: UserProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    firstName: profile.firstName,
    locality: profile.locality,
    countryCode: profile.countryCode,
    latitude: profile.latitude,
    longitude: profile.longitude,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export class DrizzleUserProfileRepository implements UserProfileRepository {
  private readonly db: GrobiggisDb;

  constructor(db: GrobiggisDb) {
    this.db = db;
  }

  async getForUser(userId: string) {
    const [row] = await this.db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return row ? rowToUserProfile(row) : null;
  }

  async upsertForUser(userId: string, profile: UserProfile) {
    const existing = await this.getForUser(userId);
    const snapshot = { ...structuredClone(profile), userId, id: existing?.id ?? profile.id, createdAt: existing?.createdAt ?? profile.createdAt };

    if (!existing) {
      await this.db.insert(userProfiles).values(userProfileToRow(snapshot));
      return snapshot;
    }

    await this.db
      .update(userProfiles)
      .set({
        firstName: snapshot.firstName,
        locality: snapshot.locality,
        countryCode: snapshot.countryCode,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        updatedAt: snapshot.updatedAt,
      })
      .where(eq(userProfiles.userId, userId));

    return snapshot;
  }
}
