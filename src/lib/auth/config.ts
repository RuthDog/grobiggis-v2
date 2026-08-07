export const AUTH_BASE_URL = "https://v2.grobiggis.se";
export const AUTH_BASE_PATH = "/api/auth";
export const AUTH_TRUSTED_ORIGINS = [
  "https://v2.grobiggis.se",
  "https://grobiggis-v2.ola-fischer85.workers.dev",
  "http://localhost:3000",
] as const;
export const AUTH_TABLES = ["user", "session", "account", "verification"] as const;
export const AUTH_METHOD = "magic-link" as const;
export const BETTER_AUTH_SECRET_NAME = "BETTER_AUTH_SECRET";
export const RESEND_API_KEY_NAME = "RESEND_API_KEY";
export const AUTH_EMAIL_FROM_NAME = "AUTH_EMAIL_FROM";
export const RECOMMENDED_AUTH_EMAIL_DOMAIN = "auth.grobiggis.se";
export const RECOMMENDED_AUTH_EMAIL_FROM = `GroBiggis <login@${RECOMMENDED_AUTH_EMAIL_DOMAIN}>`;

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

export function resolveResendApiKey(env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  const apiKey = env[RESEND_API_KEY_NAME];
  if (apiKey) return apiKey;
  if (mode === "production") throw new AuthConfigurationError(`${RESEND_API_KEY_NAME} must be configured in production.`);
  return undefined;
}

export function resolveAuthEmailFrom(env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  const from = env[AUTH_EMAIL_FROM_NAME];
  if (from) return from;
  if (mode === "production") throw new AuthConfigurationError(`${AUTH_EMAIL_FROM_NAME} must be configured in production.`);
  return undefined;
}

export function productionEmailTransportReady(env: AuthRuntimeEnv = process.env) {
  return Boolean(env[RESEND_API_KEY_NAME] && env[AUTH_EMAIL_FROM_NAME]);
}

export function assertProductionEmailTransport(env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  if (mode === "production" && !productionEmailTransportReady(env)) {
    throw new AuthConfigurationError(`${RESEND_API_KEY_NAME} and ${AUTH_EMAIL_FROM_NAME} must be configured before sending login links.`);
  }
}
