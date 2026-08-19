export const VAPID_PUBLIC_KEY_NAME = "VAPID_PUBLIC_KEY";
export const VAPID_PRIVATE_KEY_NAME = "VAPID_PRIVATE_KEY";
export const VAPID_SUBJECT_NAME = "VAPID_SUBJECT";

export type PushRuntimeEnv = Record<string, string | undefined>;

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveVapidPublicKey(env: PushRuntimeEnv = process.env) {
  return normalizeOptionalString(env[VAPID_PUBLIC_KEY_NAME]);
}

export function resolveVapidPrivateKey(env: PushRuntimeEnv = process.env) {
  return normalizeOptionalString(env[VAPID_PRIVATE_KEY_NAME]);
}

export function resolveVapidSubject(env: PushRuntimeEnv = process.env) {
  return normalizeOptionalString(env[VAPID_SUBJECT_NAME]);
}

export function productionVapidKeyPairReady(env: PushRuntimeEnv = process.env) {
  return Boolean(resolveVapidPublicKey(env) && resolveVapidPrivateKey(env));
}

export function productionVapidDeliveryReady(env: PushRuntimeEnv = process.env) {
  return Boolean(resolveVapidPublicKey(env) && resolveVapidPrivateKey(env) && resolveVapidSubject(env));
}
