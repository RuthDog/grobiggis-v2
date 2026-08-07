import { assertProductionEmailTransport, type AuthRuntimeEnv, runtimeMode } from "./config.ts";

export type MagicLinkDelivery = {
  email: string;
  url: string;
  token: string;
  metadata?: Record<string, unknown>;
};

const devDeliveries: MagicLinkDelivery[] = [];

export function getDevMagicLinkDeliveries() {
  return [...devDeliveries];
}

export function clearDevMagicLinkDeliveries() {
  devDeliveries.length = 0;
}

export async function sendMagicLinkEmail(
  delivery: MagicLinkDelivery,
  env: AuthRuntimeEnv = process.env,
  mode = runtimeMode(),
) {
  assertProductionEmailTransport(env, mode);

  if (mode === "production") {
    throw new Error("Production magic-link email provider is not configured for Grobiggis V2.");
  }

  devDeliveries.push(delivery);
}
