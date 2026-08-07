export const AUTH_BASE_URL = "https://v2.grobiggis.se";
export const AUTH_BASE_PATH = "/api/auth";
export const AUTH_TRUSTED_ORIGINS = [
  "https://v2.grobiggis.se",
  "https://grobiggis-v2.ola-fischer85.workers.dev",
  "http://localhost:3000",
] as const;
export const AUTH_TABLES = ["user", "session", "account", "verification"] as const;
export const AUTH_METHOD = "magic-link" as const;
export const AUTH_EMAIL_TRANSPORT_SECRET = "MAGIC_LINK_EMAIL_TRANSPORT";
export const BETTER_AUTH_SECRET_NAME = "BETTER_AUTH_SECRET";

const DEV_ONLY_SECRET = "grobiggis-v2-dev-only-better-auth-secret";

export type RuntimeMode = "development" | "test" | "production";
export type AuthRuntimeEnv = Partial<Record<string, string | undefined>>;

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

export function runtimeMode(value = process.env.NODE_ENV): RuntimeMode {
  if (value === "production" || value === "test") return value;
  return "development";
}

export function validateLoginEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isTrustedAuthOrigin(origin: string) {
  return AUTH_TRUSTED_ORIGINS.includes(origin as (typeof AUTH_TRUSTED_ORIGINS)[number]);
}

export function isTrustedCallbackURL(callbackURL: string, baseURL = AUTH_BASE_URL) {
  try {
    const url = new URL(callbackURL, baseURL);
    return isTrustedAuthOrigin(url.origin);
  } catch {
    return false;
  }
}

export function resolveBetterAuthSecret(env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  const secret = env[BETTER_AUTH_SECRET_NAME];
  if (secret) return secret;
  if (mode === "production") throw new AuthConfigurationError(`${BETTER_AUTH_SECRET_NAME} must be configured in production.`);
  return DEV_ONLY_SECRET;
}

export function productionEmailTransportReady(env: AuthRuntimeEnv = process.env) {
  return env[AUTH_EMAIL_TRANSPORT_SECRET] === "configured";
}

export function assertProductionEmailTransport(env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  if (mode === "production" && !productionEmailTransportReady(env)) {
    throw new AuthConfigurationError("A production magic-link email transport must be configured before sending login links.");
  }
}
