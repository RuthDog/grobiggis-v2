import type { AuthDatabase } from "@/lib/auth/server";

declare global {
  interface CloudflareEnv {
    DB?: AuthDatabase;
    BETTER_AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
  }
}

export {};
