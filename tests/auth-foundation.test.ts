import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUTH_BASE_URL,
  AUTH_METHOD,
  AUTH_TABLES,
  AUTH_TRUSTED_ORIGINS,
  AuthConfigurationError,
  assertProductionEmailTransport,
  isTrustedCallbackURL,
  isTrustedAuthOrigin,
  productionEmailTransportReady,
  resolveBetterAuthSecret,
  validateLoginEmail,
} from "../src/lib/auth/config.ts";
import {
  clearDevMagicLinkDeliveries,
  getDevMagicLinkDeliveries,
  sendMagicLinkEmail,
} from "../src/lib/auth/email.ts";
import {
  createGroBiggisAuthOptions,
  getCurrentUserFromAuth,
  requireUserFromAuth,
  userIdForRepository,
  userIdFromVerifiedSession,
  type AuthDatabase,
  type AuthSession,
} from "../src/lib/auth/server.ts";

const fakeDatabase = {
  prepare() {
    throw new Error("fake D1 database should not be queried by config tests");
  },
} as unknown as AuthDatabase;

const session: AuthSession = {
  user: { id: "better-auth-user-id", email: "odlare@example.com", name: "Odlare" },
  session: { id: "session-a", userId: "better-auth-user-id" },
};

const read = (path: string) => readFileSync(path, "utf8");

test("auth config uses the DB binding database object", () => {
  const options = createGroBiggisAuthOptions(fakeDatabase, { BETTER_AUTH_SECRET: "test-secret" }, "test");

  assert.equal(options.database, fakeDatabase);
});

test("magic link is the selected auth method", () => {
  assert.equal(AUTH_METHOD, "magic-link");
  const options = createGroBiggisAuthOptions(fakeDatabase, { BETTER_AUTH_SECRET: "test-secret" }, "test");

  assert.ok(options.plugins?.some((plugin) => plugin.id === "magic-link"));
});

test("email and password auth is explicitly disabled", () => {
  const options = createGroBiggisAuthOptions(fakeDatabase, { BETTER_AUTH_SECRET: "test-secret" }, "test");

  assert.deepEqual(options.emailAndPassword, { enabled: false });
});

test("social providers are not configured", () => {
  const options = createGroBiggisAuthOptions(fakeDatabase, { BETTER_AUTH_SECRET: "test-secret" }, "test");

  assert.deepEqual(options.socialProviders, {});
});

test("Better Auth user.id is text-compatible with growing_batches.user_id", () => {
  const schema = read("src/db/schema.ts");

  assert.match(schema, /id: text\("id"\)\.primaryKey\(\)/);
  assert.match(schema, /userId: text\("user_id"\)\.notNull\(\)/);
});

test("getCurrentUserFromAuth returns null without a verified session", async () => {
  const user = await getCurrentUserFromAuth({ getSession: async () => null }, new Headers());

  assert.equal(user, null);
});

test("requireUserFromAuth rejects without a verified session", async () => {
  await assert.rejects(() => requireUserFromAuth({ getSession: async () => null }, new Headers()), /Authentication required/);
});

test("repository user id comes only from verified session", () => {
  assert.equal(userIdForRepository(session, "client-supplied-user"), "better-auth-user-id");
});

test("login email validation accepts normal addresses", () => {
  assert.equal(validateLoginEmail("odlare@example.com"), true);
});

test("login email validation rejects invalid addresses", () => {
  assert.equal(validateLoginEmail("inte en epost"), false);
  assert.equal(validateLoginEmail("odlare@example"), false);
});

test("magic-link callback redirects are limited to trusted origins", () => {
  assert.equal(isTrustedCallbackURL("/min-plan"), true);
  assert.equal(isTrustedCallbackURL("https://v2.grobiggis.se/min-plan"), true);
  assert.equal(isTrustedCallbackURL("https://evil.example/min-plan"), false);
});

test("trusted origins are explicit and finite", () => {
  assert.deepEqual([...AUTH_TRUSTED_ORIGINS], [
    "https://v2.grobiggis.se",
    "https://grobiggis-v2.ola-fischer85.workers.dev",
    "http://localhost:3000",
  ]);
  assert.equal(isTrustedAuthOrigin("https://grobiggis.se"), false);
});

test("dev email transport captures magic links only outside production", async () => {
  clearDevMagicLinkDeliveries();
  await sendMagicLinkEmail({ email: "odlare@example.com", token: "secret-token", url: "http://localhost:3000/link?token=secret-token" }, {}, "development");

  assert.equal(getDevMagicLinkDeliveries().length, 1);
});

test("production email transport never captures dev links", async () => {
  clearDevMagicLinkDeliveries();

  await assert.rejects(
    () => sendMagicLinkEmail({ email: "odlare@example.com", token: "secret-token", url: "https://v2.grobiggis.se/link?token=secret-token" }, {}, "production"),
    /production magic-link email transport/i,
  );
  assert.equal(getDevMagicLinkDeliveries().length, 0);
});

test("production configuration requires Better Auth secret", () => {
  assert.throws(() => resolveBetterAuthSecret({}, "production"), AuthConfigurationError);
});

test("development configuration uses a local-only secret fallback", () => {
  assert.equal(typeof resolveBetterAuthSecret({}, "development"), "string");
});

test("production configuration requires real email transport before magic link send", () => {
  assert.equal(productionEmailTransportReady({}), false);
  assert.throws(() => assertProductionEmailTransport({}, "production"), AuthConfigurationError);
});

test("logout and session flow are connected through Better Auth client", () => {
  const authNav = read("src/components/AuthNav.tsx");
  const client = read("src/lib/auth/client.ts");

  assert.match(client, /createAuthClient/);
  assert.match(client, /magicLinkClient/);
  assert.match(authNav, /useSession/);
  assert.match(authNav, /signOut/);
});

test("GrowingSessionProvider is still in-memory", () => {
  const provider = read("src/state/growing-session.tsx");
  const reducer = read("src/state/growing-session-reducer.ts");

  assert.match(provider, /useReducer\(growingSessionReducer, initialGrowingSessionState\)/);
  assert.doesNotMatch(`${provider}\n${reducer}`, /createDb|DrizzleGrowingBatchRepository|authClient|localStorage|sessionStorage|indexedDB/i);
});

test("growing repository is not wired into UI yet", () => {
  const appFiles = [
    read("src/components/AppShell.tsx"),
    read("src/app/min-plan/page.tsx"),
    read("src/app/vaxtbibliotek/PlantLibrary.tsx"),
  ].join("\n");

  assert.doesNotMatch(appFiles, /DrizzleGrowingBatchRepository|createDb|getCurrentUser|requireUser/);
});

test("no Sites session or identity-link implementation exists in V2", () => {
  const source = [
    read("src/lib/auth/server.ts"),
    read("src/lib/auth/config.ts"),
    read("migrations/0001_awesome_enchantress.sql"),
  ].join("\n");

  assert.doesNotMatch(source, /Sites|identity[_-]?link|legacy/i);
});

test("no old auth table names are introduced", () => {
  const migration = read("migrations/0001_awesome_enchantress.sql");

  assert.doesNotMatch(migration, /users|sessions|accounts|verification_tokens|magic_links|site_sessions|identity_links/);
});

test("auth schema includes only Better Auth core tables", () => {
  assert.deepEqual([...AUTH_TABLES], ["user", "session", "account", "verification"]);
});

test("schema generation leaves growing tables in the initial migration", () => {
  const migration = read("migrations/0000_lying_scrambler.sql");

  assert.match(migration, /CREATE TABLE `growing_batches`/);
  assert.match(migration, /CREATE TABLE `growing_events`/);
});

test("auth migration does not modify growing tables", () => {
  const migration = read("migrations/0001_awesome_enchantress.sql");

  assert.doesNotMatch(migration, /growing_batches|growing_events/);
});

test("base URL stays on the V2 custom domain", () => {
  assert.equal(AUTH_BASE_URL, "https://v2.grobiggis.se");
});

test("userIdFromVerifiedSession rejects missing sessions", () => {
  assert.throws(() => userIdFromVerifiedSession(null), /Authentication required/);
});
