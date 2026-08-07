import { drizzle, type AnyD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type GrobiggisD1Database = AnyD1Database;

export function createDb(database: GrobiggisD1Database) {
  return drizzle(database, { schema });
}

export type GrobiggisDb = ReturnType<typeof createDb>;
