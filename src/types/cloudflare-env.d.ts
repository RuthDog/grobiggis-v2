import type { AuthDatabase } from "@/lib/auth/server";

declare global {
  interface CloudflareEnv {
    DB?: AuthDatabase;
    BETTER_AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
  }
}

export {};
