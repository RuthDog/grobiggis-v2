import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import {
  AUTH_BASE_PATH,
  AUTH_BASE_URL,
  AUTH_TRUSTED_ORIGINS,
  resolveBetterAuthSecret,
  runtimeMode,
  type AuthRuntimeEnv,
} from "./config.ts";
import { sendMagicLinkEmail } from "./email.ts";

export type AuthDatabase = NonNullable<BetterAuthOptions["database"]>;
export type AuthSession = {
  user: { id: string; email: string; name?: string | null };
  session: { id: string; userId: string };
};

export function createGroBiggisAuthOptions(database: AuthDatabase, env: AuthRuntimeEnv = process.env, mode = runtimeMode()): BetterAuthOptions {
  return {
    appName: "GroBiggis V2",
    baseURL: AUTH_BASE_URL,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: [...AUTH_TRUSTED_ORIGINS],
    database,
    secret: resolveBetterAuthSecret(env, mode),
    emailAndPassword: { enabled: false },
    socialProviders: {},
    plugins: [
      magicLink({
        storeToken: "hashed",
        sendMagicLink: (delivery) => sendMagicLinkEmail(delivery, env, mode),
      }),
      nextCookies(),
    ],
    telemetry: { enabled: false },
  };
}

export function createGroBiggisAuth(database: AuthDatabase, env: AuthRuntimeEnv = process.env, mode = runtimeMode()) {
  return betterAuth(createGroBiggisAuthOptions(database, env, mode));
}

function stringBindings(env: CloudflareEnv): AuthRuntimeEnv {
  return {
    ...process.env,
    BETTER_AUTH_SECRET: typeof env.BETTER_AUTH_SECRET === "string" ? env.BETTER_AUTH_SECRET : process.env.BETTER_AUTH_SECRET,
    MAGIC_LINK_EMAIL_TRANSPORT:
      typeof env.MAGIC_LINK_EMAIL_TRANSPORT === "string" ? env.MAGIC_LINK_EMAIL_TRANSPORT : process.env.MAGIC_LINK_EMAIL_TRANSPORT,
  };
}

export async function getAuthForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required for Better Auth.");
  return createGroBiggisAuth(env.DB as AuthDatabase, stringBindings(env));
}

export async function getCurrentUserFromAuth(
  authApi: { getSession: (input: { headers: Headers }) => Promise<AuthSession | null> },
  requestHeaders: Headers,
) {
  const session = await authApi.getSession({ headers: requestHeaders });
  return session?.user ?? null;
}

export async function requireUserFromAuth(
  authApi: { getSession: (input: { headers: Headers }) => Promise<AuthSession | null> },
  requestHeaders: Headers,
) {
  const user = await getCurrentUserFromAuth(authApi, requestHeaders);
  if (!user) throw new Error("Authentication required.");
  return user;
}

export function userIdFromVerifiedSession(session: AuthSession | null) {
  if (!session) throw new Error("Authentication required.");
  return session.user.id;
}

export function userIdForRepository(session: AuthSession | null, clientSuppliedUserId?: string) {
  void clientSuppliedUserId;
  return userIdFromVerifiedSession(session);
}

export async function getCurrentUser() {
  const { headers } = await import("next/headers");
  const auth = await getAuthForRequest();
  return getCurrentUserFromAuth(auth.api, await headers());
}

export async function requireUser() {
  const { headers } = await import("next/headers");
  const auth = await getAuthForRequest();
  return requireUserFromAuth(auth.api, await headers());
}
