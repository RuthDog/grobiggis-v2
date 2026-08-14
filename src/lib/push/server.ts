import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { productionVapidKeyPairReady, resolveVapidPrivateKey, resolveVapidPublicKey, type PushRuntimeEnv } from "./config";

function stringBindings(env: CloudflareEnv): PushRuntimeEnv {
  return {
    ...process.env,
    VAPID_PUBLIC_KEY: typeof env.VAPID_PUBLIC_KEY === "string" ? env.VAPID_PUBLIC_KEY : process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: typeof env.VAPID_PRIVATE_KEY === "string" ? env.VAPID_PRIVATE_KEY : process.env.VAPID_PRIVATE_KEY,
  };
}

export async function getPushRuntimeConfigForRequest() {
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = stringBindings(env);

  return {
    vapidPublicKey: resolveVapidPublicKey(runtimeEnv),
    vapidConfigured: productionVapidKeyPairReady(runtimeEnv),
    vapidPrivateKeyConfigured: Boolean(resolveVapidPrivateKey(runtimeEnv)),
  };
}
