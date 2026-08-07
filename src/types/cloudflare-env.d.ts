import type { AuthDatabase } from "@/lib/auth/server";

declare global {
  interface CloudflareEnv {
    DB?: AuthDatabase;
    BETTER_AUTH_SECRET?: string;
    MAGIC_LINK_EMAIL_TRANSPORT?: string;
  }
}

export {};
