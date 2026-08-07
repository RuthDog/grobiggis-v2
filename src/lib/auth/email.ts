import {
  AuthConfigurationError,
  AUTH_EMAIL_FROM_NAME,
  RESEND_API_KEY_NAME,
  assertProductionEmailTransport,
  isTrustedAuthOrigin,
  resolveAuthEmailFrom,
  resolveResendApiKey,
  type AuthRuntimeEnv,
  runtimeMode,
  validateLoginEmail,
} from "./config.ts";

export type MagicLinkDelivery = {
  email: string;
  url: string;
  token: string;
  metadata?: Record<string, unknown>;
};

export type AuthMagicLinkEmail = {
  to: string;
  url: string;
};

export type EmailFetch = typeof fetch;

export const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
export const AUTH_EMAIL_SUBJECT = "Logga in på Grobiggis";

const devDeliveries: MagicLinkDelivery[] = [];

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export function getDevMagicLinkDeliveries() {
  return [...devDeliveries];
}

export function clearDevMagicLinkDeliveries() {
  devDeliveries.length = 0;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildMagicLinkEmailBody(url: string) {
  const safeUrl = escapeHtml(url);
  return {
    subject: AUTH_EMAIL_SUBJECT,
    text: [
      "Du har begärt att logga in på Grobiggis.",
      "",
      `Öppna den här länken för att fortsätta: ${url}`,
      "",
      "Om du inte begärde den här inloggningen kan du ignorera mejlet.",
    ].join("\n"),
    html: [
      "<div>",
      "<p>Du har begärt att logga in på Grobiggis.</p>",
      `<p><a href="${safeUrl}">Logga in på Grobiggis</a></p>`,
      "<p>Om du inte begärde den här inloggningen kan du ignorera mejlet.</p>",
      "</div>",
    ].join(""),
  };
}

function assertTrustedMagicLinkUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (isTrustedAuthOrigin(parsed.origin)) return;
  } catch {
    // Fall through to the sanitized configuration error below.
  }

  throw new AuthConfigurationError("Magic-link URL origin is not trusted.");
}

function assertRecipientEmail(to: string) {
  if (!validateLoginEmail(to)) throw new AuthConfigurationError("Magic-link recipient email is invalid.");
}

function requireProductionEmailConfig(env: AuthRuntimeEnv) {
  const apiKey = resolveResendApiKey(env, "production");
  const from = resolveAuthEmailFrom(env, "production");

  if (!apiKey) throw new AuthConfigurationError(`${RESEND_API_KEY_NAME} must be configured in production.`);
  if (!from) throw new AuthConfigurationError(`${AUTH_EMAIL_FROM_NAME} must be configured in production.`);

  return { apiKey, from };
}

export async function sendAuthMagicLinkEmail(
  message: AuthMagicLinkEmail,
  env: AuthRuntimeEnv = process.env,
  fetcher: EmailFetch = fetch,
) {
  assertRecipientEmail(message.to);
  assertTrustedMagicLinkUrl(message.url);
  assertProductionEmailTransport(env, "production");
  const { apiKey, from } = requireProductionEmailConfig(env);
  const body = buildMagicLinkEmailBody(message.url);

  let response: Response;
  try {
    response = await fetcher(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: body.subject,
        html: body.html,
        text: body.text,
      }),
    });
  } catch {
    throw new EmailDeliveryError("Email provider request failed.");
  }

  if (!response.ok) {
    throw new EmailDeliveryError(`Email provider rejected magic-link send with status ${response.status}.`);
  }
}

export async function sendMagicLinkEmail(
  delivery: MagicLinkDelivery,
  env: AuthRuntimeEnv = process.env,
  mode = runtimeMode(),
) {
  if (mode === "production") {
    await sendAuthMagicLinkEmail({ to: delivery.email, url: delivery.url }, env);
    return;
  }

  devDeliveries.push(delivery);
}
