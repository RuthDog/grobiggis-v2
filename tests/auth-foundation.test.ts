import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUTH_BASE_URL,
  AUTH_EMAIL_FROM_NAME,
  AUTH_METHOD,
  AUTH_TABLES,
  AUTH_TRUSTED_ORIGINS,
  AuthConfigurationError,
  RECOMMENDED_AUTH_EMAIL_DOMAIN,
  RECOMMENDED_AUTH_EMAIL_FROM,
  RESEND_API_KEY_NAME,
  assertProductionEmailTransport,
  isTrustedCallbackURL,
  isTrustedAuthOrigin,
  productionEmailTransportReady,
  resolveAuthEmailFrom,
  resolveBetterAuthSecret,
  resolveResendApiKey,
  validateLoginEmail,
} from "../src/lib/auth/config.ts";
import {
  AUTH_EMAIL_SUBJECT,
  RESEND_EMAIL_ENDPOINT,
  buildMagicLinkEmailBody,
  clearDevMagicLinkDeliveries,
  sendAuthMagicLinkEmail,
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
const productionEnv = {
  BETTER_AUTH_SECRET: "production-secret",
  RESEND_API_KEY: "test-resend-api-key",
  AUTH_EMAIL_FROM: "GroBiggis <login@auth.grobiggis.se>",
};

function mockFetch(response: Response = new Response(JSON.stringify({ id: "email-id" }), { status: 200 })) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response;
  };

  return { calls, fetcher: fetcher as typeof fetch };
}

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

test("development transport works without Resend configuration", async () => {
  clearDevMagicLinkDeliveries();
  await sendMagicLinkEmail({ email: "odlare@example.com", token: "dev-token", url: "http://localhost:3000/link?token=dev-token" }, {}, "development");

  assert.deepEqual(getDevMagicLinkDeliveries().map((delivery) => delivery.email), ["odlare@example.com"]);
});

test("production email transport never captures dev links", async () => {
  clearDevMagicLinkDeliveries();

  await assert.rejects(
    () => sendMagicLinkEmail({ email: "odlare@example.com", token: "secret-token", url: "https://v2.grobiggis.se/link?token=secret-token" }, {}, "production"),
    /RESEND_API_KEY/,
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
  assert.equal(productionEmailTransportReady(productionEnv), true);
});

test("production transport requires RESEND_API_KEY", async () => {
  const { fetcher } = mockFetch();

  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
        { AUTH_EMAIL_FROM: productionEnv.AUTH_EMAIL_FROM },
        fetcher,
      ),
    /RESEND_API_KEY/,
  );
});

test("production transport requires AUTH_EMAIL_FROM", async () => {
  const { fetcher } = mockFetch();

  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
        { RESEND_API_KEY: productionEnv.RESEND_API_KEY },
        fetcher,
      ),
    /AUTH_EMAIL_FROM/,
  );
});

test("production config resolves explicit Resend settings", () => {
  assert.equal(resolveResendApiKey(productionEnv, "production"), productionEnv.RESEND_API_KEY);
  assert.equal(resolveAuthEmailFrom(productionEnv, "production"), productionEnv.AUTH_EMAIL_FROM);
  assert.throws(() => resolveResendApiKey({}, "production"), AuthConfigurationError);
  assert.throws(() => resolveAuthEmailFrom({}, "production"), AuthConfigurationError);
  assert.equal(RESEND_API_KEY_NAME, "RESEND_API_KEY");
  assert.equal(AUTH_EMAIL_FROM_NAME, "AUTH_EMAIL_FROM");
});

test("Resend request uses the HTTPS endpoint and configured Authorization header", async () => {
  const { calls, fetcher } = mockFetch();

  await sendAuthMagicLinkEmail(
    { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
    productionEnv,
    fetcher,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, RESEND_EMAIL_ENDPOINT);
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Bearer ${productionEnv.RESEND_API_KEY}`);
});

test("Resend request body uses configured sender, recipient and Grobiggis copy", async () => {
  const { calls, fetcher } = mockFetch();

  await sendAuthMagicLinkEmail(
    { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
    productionEnv,
    fetcher,
  );

  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.from, productionEnv.AUTH_EMAIL_FROM);
  assert.deepEqual(body.to, ["odlare@example.com"]);
  assert.equal(body.subject, AUTH_EMAIL_SUBJECT);
  assert.match(body.text, /Grobiggis/);
  assert.match(body.html, /Logga in på Grobiggis/);
});

test("provider 4xx and 5xx errors are sanitized", async () => {
  const url = "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token";

  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "odlare@example.com", url },
        productionEnv,
        mockFetch(new Response("provider mentions test-resend-api-key and secret-token", { status: 500 })).fetcher,
      ),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /status 500/);
      assert.doesNotMatch(error.message, /test-resend-api-key|secret-token|magic-link\/verify/);
      return true;
    },
  );

  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "odlare@example.com", url },
        productionEnv,
        mockFetch(new Response("bad request", { status: 400 })).fetcher,
      ),
    /status 400/,
  );
});

test("production email send does not log API keys or magic-link URLs", async () => {
  const logs: string[] = [];
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...values: unknown[]) => logs.push(values.join(" "));
  console.info = (...values: unknown[]) => logs.push(values.join(" "));
  console.warn = (...values: unknown[]) => logs.push(values.join(" "));
  console.error = (...values: unknown[]) => logs.push(values.join(" "));

  try {
    await sendAuthMagicLinkEmail(
      { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
      productionEnv,
      mockFetch().fetcher,
    );
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
  }

  assert.equal(logs.join("\n"), "");
});

test("provider response is not stored in auth tables by the transport", async () => {
  const { fetcher } = mockFetch(new Response(JSON.stringify({ id: "provider-email-id" }), { status: 200 }));

  await sendAuthMagicLinkEmail(
    { to: "odlare@example.com", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
    productionEnv,
    fetcher,
  );

  const schema = read("src/db/schema.ts");
  assert.doesNotMatch(schema, /provider-email-id|resendEmailId|email_delivery/i);
});

test("magic-link recipient and URL are validated before provider calls", async () => {
  const invalidEmail = mockFetch();
  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "inte en epost", url: "https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token" },
        productionEnv,
        invalidEmail.fetcher,
      ),
    /recipient email is invalid/,
  );
  assert.equal(invalidEmail.calls.length, 0);

  const untrustedUrl = mockFetch();
  await assert.rejects(
    () =>
      sendAuthMagicLinkEmail(
        { to: "odlare@example.com", url: "https://evil.example/api/auth/magic-link/verify?token=secret-token" },
        productionEnv,
        untrustedUrl.fetcher,
      ),
    /origin is not trusted/,
  );
  assert.equal(untrustedUrl.calls.length, 0);
});

test("email template remains small and Grobiggis-specific", () => {
  const body = buildMagicLinkEmailBody("https://v2.grobiggis.se/api/auth/magic-link/verify?token=secret-token");

  assert.equal(body.subject, "Logga in på Grobiggis");
  assert.match(body.text, /ignorera mejlet/);
  assert.match(body.html, /Logga in på Grobiggis/);
  assert.doesNotMatch(`${body.text}\n${body.html}`, /profil|newsletter|community/i);
});

test("recommended sender domain stays explicit but uncommitted", () => {
  assert.equal(RECOMMENDED_AUTH_EMAIL_DOMAIN, "auth.grobiggis.se");
  assert.equal(RECOMMENDED_AUTH_EMAIL_FROM, "GroBiggis <login@auth.grobiggis.se>");
});

test("logout and session flow are connected through Better Auth client", () => {
  const authNav = read("src/components/AuthNav.tsx");
  const client = read("src/lib/auth/client.ts");

  assert.match(client, /createAuthClient/);
  assert.match(client, /magicLinkClient/);
  assert.match(authNav, /useSession/);
  assert.match(authNav, /signOut/);
});

test("GrowingSessionProvider is no longer the UI source of truth", () => {
  const appShell = read("src/components/AppShell.tsx");
  const minPlan = read("src/app/min-plan/page.tsx");
  const detail = read("src/app/min-plan/[batchId]/page.tsx");
  const startDialog = read("src/app/vaxtbibliotek/StartGrowingDialog.tsx");
  const reducer = read("src/state/growing-session-reducer.ts");

  assert.doesNotMatch(`${appShell}\n${minPlan}\n${detail}\n${startDialog}`, /GrowingSessionProvider|useGrowingSession/);
  assert.doesNotMatch(reducer, /localStorage|sessionStorage|indexedDB/i);
});

test("growing UI is wired through server persistence actions", () => {
  const appFiles = [
    read("src/components/AppShell.tsx"),
    read("src/app/min-plan/page.tsx"),
    read("src/app/min-plan/[batchId]/page.tsx"),
    read("src/app/vaxtbibliotek/StartGrowingDialog.tsx"),
    read("src/components/CompleteBatchControl.tsx"),
    read("src/lib/growing/server.ts"),
    read("src/lib/growing/actions.ts"),
    read("src/lib/growing/service.ts"),
    read("src/lib/growing/validation.ts"),
    read("src/app/vaxtbibliotek/PlantLibrary.tsx"),
  ].join("\n");

  assert.match(appFiles, /DrizzleGrowingBatchRepository/);
  assert.match(appFiles, /requireUser|getCurrentUser/);
  assert.match(appFiles, /createGrowingBatchAction/);
  assert.match(appFiles, /completeGrowingBatchAction/);
  assert.doesNotMatch(appFiles, /clientSuppliedUserId|userId:\s*["']/);
});

test("no Sites session or identity-link implementation exists in V2", () => {
  const source = [
    read("src/lib/auth/server.ts"),
    read("src/lib/auth/config.ts"),
    read("src/lib/auth/email.ts"),
    read("migrations/0001_awesome_enchantress.sql"),
  ].join("\n");

  assert.doesNotMatch(source, /Sites|identity[_-]?link|legacy|odlingsguiden|old_resend/i);
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
