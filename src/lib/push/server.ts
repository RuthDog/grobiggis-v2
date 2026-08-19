import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  productionVapidDeliveryReady,
  productionVapidKeyPairReady,
  resolveVapidPrivateKey,
  resolveVapidPublicKey,
  resolveVapidSubject,
  type PushRuntimeEnv,
} from "./config";

function stringBindings(env: CloudflareEnv): PushRuntimeEnv {
  return {
    ...process.env,
    VAPID_PUBLIC_KEY: typeof env.VAPID_PUBLIC_KEY === "string" ? env.VAPID_PUBLIC_KEY : process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: typeof env.VAPID_PRIVATE_KEY === "string" ? env.VAPID_PRIVATE_KEY : process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: typeof env.VAPID_SUBJECT === "string" ? env.VAPID_SUBJECT : process.env.VAPID_SUBJECT,
  };
}

export async function getPushRuntimeConfigForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = stringBindings(env);

  return {
    vapidPublicKey: resolveVapidPublicKey(runtimeEnv),
    vapidConfigured: productionVapidKeyPairReady(runtimeEnv),
    vapidPrivateKeyConfigured: Boolean(resolveVapidPrivateKey(runtimeEnv)),
    vapidDeliveryConfigured: productionVapidDeliveryReady(runtimeEnv),
  };
}

export async function getPushVapidKeysForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = stringBindings(env);
  const publicKey = resolveVapidPublicKey(runtimeEnv);
  const privateKey = resolveVapidPrivateKey(runtimeEnv);
  const subject = resolveVapidSubject(runtimeEnv);

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID delivery configuration is incomplete.");
  }

  return { publicKey, privateKey, subject };
}
