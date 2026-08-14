import type { NewPushSubscriptionInput } from "../../domain/notification-infrastructure.ts";

export type PushSupportReason = "insecure_context" | "notification_unsupported" | "service_worker_unsupported" | "push_manager_unsupported";
export type PushPermissionState = NotificationPermission | "unsupported";
export type PushDeviceStateKind = "unsupported" | "needs_config" | "permission_denied" | "inactive" | "sync_required" | "active";

export type PushDeviceState =
  | { kind: "unsupported"; permission: "unsupported"; reason: PushSupportReason; showHomeScreenHint: boolean }
  | { kind: "needs_config"; permission: PushPermissionState; showHomeScreenHint: boolean }
  | { kind: "permission_denied"; permission: "denied"; showHomeScreenHint: boolean }
  | { kind: "inactive"; permission: "default" | "granted"; showHomeScreenHint: boolean }
  | { kind: "sync_required"; permission: "granted"; error: string; showHomeScreenHint: boolean }
  | { kind: "active"; permission: "granted"; endpoint: string; showHomeScreenHint: boolean };

export type RegisterPushActionResult =
  | { ok: true }
  | { ok: false; code?: "endpoint_conflict"; error: string };

export type SyncPushActionResult =
  | { ok: true }
  | { ok: false; code?: "endpoint_conflict"; error: string };

export type RevokePushActionResult =
  | { ok: true }
  | { ok: false; error: string };

export interface BrowserPushSubscriptionLike {
  endpoint: string;
  getKey(name: "p256dh" | "auth"): ArrayBuffer | ArrayBufferView<ArrayBufferLike> | null;
  unsubscribe(): Promise<boolean>;
}

export interface BrowserPushManagerLike {
  getSubscription(): Promise<BrowserPushSubscriptionLike | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<BrowserPushSubscriptionLike>;
}

export interface BrowserServiceWorkerRegistrationLike {
  pushManager: BrowserPushManagerLike;
}

export interface BrowserServiceWorkerContainerLike {
  register(scriptURL: string | URL, options?: RegistrationOptions): Promise<BrowserServiceWorkerRegistrationLike>;
  getRegistration(scope?: string): Promise<BrowserServiceWorkerRegistrationLike | undefined>;
  ready: Promise<BrowserServiceWorkerRegistrationLike>;
}

export interface BrowserNotificationLike {
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}

export interface BrowserPushEnvironment {
  isSecureContext: boolean;
  hasPushManager: boolean;
  notification?: BrowserNotificationLike;
  serviceWorker?: BrowserServiceWorkerContainerLike;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

export type ActivatePushOutcome =
  | { ok: true; endpoint: string; replacedExistingSubscription: boolean }
  | { ok: false; code: "unsupported" | "needs_config" | "permission_denied" | "registration_failed"; error: string; showHomeScreenHint?: boolean };

export type DeactivatePushOutcome =
  | { ok: true; kind: "deactivated" | "already_inactive" }
  | { ok: false; kind: "sync_required" | "unsupported" | "revoke_failed"; error: string; endpoint?: string; showHomeScreenHint?: boolean };

const SERVICE_WORKER_PATH = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";

function bytesToBinaryString(bytes: Uint8Array) {
  let output = "";
  for (const byte of bytes) output += String.fromCharCode(byte);
  return output;
}

function binaryStringToBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }
  return bytes;
}

function encodeBase64(binary: string) {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  return Buffer.from(binary, "binary").toString("base64");
}

function decodeBase64(value: string) {
  if (typeof globalThis.atob === "function") return globalThis.atob(value);
  return Buffer.from(value, "base64").toString("binary");
}

function encodeBase64Url(bytes: Uint8Array) {
  if (!bytes.length) return "";
  const base64 = encodeBase64(bytesToBinaryString(bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | ArrayBufferView<ArrayBufferLike> | null) {
  if (!buffer) throw new Error("Push subscription key is missing.");
  if (buffer instanceof ArrayBuffer) return encodeBase64Url(new Uint8Array(buffer));
  return encodeBase64Url(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

function hasAppleMobileHomeScreenConstraint(input: Pick<BrowserPushEnvironment, "userAgent" | "platform" | "maxTouchPoints">) {
  const userAgent = input.userAgent ?? "";
  const platform = input.platform ?? "";
  const maxTouchPoints = input.maxTouchPoints ?? 0;
  if (/iPhone|iPad|iPod/u.test(userAgent)) return true;
  return /Mac/u.test(platform) && maxTouchPoints > 1;
}

export function detectPushSupport(environment: BrowserPushEnvironment) {
  const showHomeScreenHint = hasAppleMobileHomeScreenConstraint(environment);

  if (!environment.isSecureContext) {
    return { supported: false as const, reason: "insecure_context" as const, showHomeScreenHint };
  }
  if (!environment.notification) {
    return { supported: false as const, reason: "notification_unsupported" as const, showHomeScreenHint };
  }
  if (!environment.serviceWorker) {
    return { supported: false as const, reason: "service_worker_unsupported" as const, showHomeScreenHint };
  }
  if (!environment.hasPushManager) {
    return { supported: false as const, reason: "push_manager_unsupported" as const, showHomeScreenHint };
  }

  return { supported: true as const, showHomeScreenHint };
}

export function notificationPermission(environment: BrowserPushEnvironment): PushPermissionState {
  return environment.notification?.permission ?? "unsupported";
}

export function urlBase64ToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return binaryStringToBytes(decodeBase64(`${normalized}${padding}`));
}

export function extractPushSubscriptionPayload(subscription: BrowserPushSubscriptionLike): NewPushSubscriptionInput {
  return {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64Url(subscription.getKey("p256dh")),
    auth: arrayBufferToBase64Url(subscription.getKey("auth")),
  };
}

async function existingRegistration(environment: BrowserPushEnvironment) {
  return environment.serviceWorker?.getRegistration(SERVICE_WORKER_SCOPE);
}

async function activeSubscription(environment: BrowserPushEnvironment) {
  const registration = await existingRegistration(environment);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

async function ensureRegistration(environment: BrowserPushEnvironment) {
  if (!environment.serviceWorker) throw new Error("Service workers are not supported.");
  await environment.serviceWorker.register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE });
  return environment.serviceWorker.ready;
}

async function subscribeWithPublicKey(environment: BrowserPushEnvironment, vapidPublicKey: string) {
  const registration = await ensureRegistration(environment);
  const current = await registration.pushManager.getSubscription();
  if (current) return { subscription: current, reused: true };

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  return { subscription, reused: false };
}

export async function readPushDeviceState(environment: BrowserPushEnvironment, vapidPublicKey: string | null): Promise<PushDeviceState> {
  const support = detectPushSupport(environment);
  if (!support.supported) {
    return { kind: "unsupported", permission: "unsupported", reason: support.reason, showHomeScreenHint: support.showHomeScreenHint };
  }

  const permission = environment.notification!.permission;
  if (permission === "denied") {
    return { kind: "permission_denied", permission, showHomeScreenHint: support.showHomeScreenHint };
  }

  const availablePermission: "default" | "granted" = permission === "granted" ? "granted" : "default";

  if (permission === "granted") {
    const subscription = await activeSubscription(environment);
    if (subscription) return { kind: "active", permission, endpoint: subscription.endpoint, showHomeScreenHint: support.showHomeScreenHint };
  }

  if (!vapidPublicKey) {
    return { kind: "needs_config", permission: availablePermission, showHomeScreenHint: support.showHomeScreenHint };
  }

  return { kind: "inactive", permission: availablePermission, showHomeScreenHint: support.showHomeScreenHint };
}

export async function readSyncedPushDeviceState(
  environment: BrowserPushEnvironment,
  vapidPublicKey: string | null,
  syncSubscription: (input: NewPushSubscriptionInput) => Promise<SyncPushActionResult>,
): Promise<PushDeviceState> {
  const support = detectPushSupport(environment);
  if (!support.supported) {
    return { kind: "unsupported", permission: "unsupported", reason: support.reason, showHomeScreenHint: support.showHomeScreenHint };
  }

  const permission = environment.notification!.permission;
  if (permission === "denied") {
    return { kind: "permission_denied", permission, showHomeScreenHint: support.showHomeScreenHint };
  }

  if (permission === "granted") {
    const subscription = await activeSubscription(environment);
    if (subscription) {
      const syncResult = await syncSubscription(extractPushSubscriptionPayload(subscription));
      if (syncResult.ok) {
        return { kind: "active", permission, endpoint: subscription.endpoint, showHomeScreenHint: support.showHomeScreenHint };
      }

      return {
        kind: "sync_required",
        permission,
        error: syncResult.error,
        showHomeScreenHint: support.showHomeScreenHint,
      };
    }
  }

  if (!vapidPublicKey) {
    return { kind: "needs_config", permission: permission === "granted" ? "granted" : "default", showHomeScreenHint: support.showHomeScreenHint };
  }

  return { kind: "inactive", permission: permission === "granted" ? "granted" : "default", showHomeScreenHint: support.showHomeScreenHint };
}

export async function activatePushOnCurrentDevice(options: {
  environment: BrowserPushEnvironment;
  vapidPublicKey: string | null;
  registerSubscription: (input: NewPushSubscriptionInput) => Promise<RegisterPushActionResult>;
}): Promise<ActivatePushOutcome> {
  const { environment, vapidPublicKey, registerSubscription } = options;
  const support = detectPushSupport(environment);

  if (!support.supported) {
    return { ok: false, code: "unsupported", error: "Pushnotiser stöds inte i den här webbläsaren eller i det här läget.", showHomeScreenHint: support.showHomeScreenHint };
  }

  if (!vapidPublicKey) {
    return { ok: false, code: "needs_config", error: "Pushnotiser kan inte aktiveras just nu." };
  }

  const permissionBefore = environment.notification!.permission;
  if (permissionBefore === "denied") {
    return { ok: false, code: "permission_denied", error: "Notiser är blockerade i webbläsaren. Ändra tillåtelsen i webbläsarens inställningar om du vill aktivera dem." };
  }

  let permissionAfter: NotificationPermission = permissionBefore;
  if (permissionAfter === "default") {
    permissionAfter = await environment.notification!.requestPermission();
  }

  if (permissionAfter !== "granted") {
    return { ok: false, code: "permission_denied", error: "Notiser är blockerade i webbläsaren. Ändra tillåtelsen i webbläsarens inställningar om du vill aktivera dem." };
  }

  try {
    const firstAttempt = await subscribeWithPublicKey(environment, vapidPublicKey);
    const firstPayload = extractPushSubscriptionPayload(firstAttempt.subscription);
    const firstResult = await registerSubscription(firstPayload);

    if (firstResult.ok) {
      return { ok: true, endpoint: firstPayload.endpoint, replacedExistingSubscription: false };
    }

    if (firstResult.code !== "endpoint_conflict") {
      return { ok: false, code: "registration_failed", error: firstResult.error };
    }

    await firstAttempt.subscription.unsubscribe();

    const retryAttempt = await subscribeWithPublicKey(environment, vapidPublicKey);
    const retryPayload = extractPushSubscriptionPayload(retryAttempt.subscription);
    const retryResult = await registerSubscription(retryPayload);

    if (!retryResult.ok) {
      return { ok: false, code: "registration_failed", error: retryResult.error };
    }

    return { ok: true, endpoint: retryPayload.endpoint, replacedExistingSubscription: true };
  } catch (error) {
    return {
      ok: false,
      code: "registration_failed",
      error: error instanceof Error ? error.message : "Pushnotiser kunde inte aktiveras just nu.",
    };
  }
}

export async function deactivatePushOnCurrentDevice(options: {
  environment: BrowserPushEnvironment;
  revokeSubscription: (endpoint: string) => Promise<RevokePushActionResult>;
  lastKnownEndpoint?: string | null;
}): Promise<DeactivatePushOutcome> {
  const { environment, revokeSubscription, lastKnownEndpoint = null } = options;
  const support = detectPushSupport(environment);

  if (!support.supported) {
    return { ok: false, kind: "unsupported", error: "Pushnotiser stöds inte i den här webbläsaren eller i det här läget.", showHomeScreenHint: support.showHomeScreenHint };
  }

  const subscription = await activeSubscription(environment);
  if (!subscription) {
    if (!lastKnownEndpoint) return { ok: true, kind: "already_inactive" };

    const syncResult = await revokeSubscription(lastKnownEndpoint);
    if (syncResult.ok) return { ok: true, kind: "deactivated" };
    return { ok: false, kind: "sync_required", endpoint: lastKnownEndpoint, error: syncResult.error };
  }

  const endpoint = subscription.endpoint;
  const browserResult = await subscription.unsubscribe();
  if (!browserResult) {
    return { ok: false, kind: "revoke_failed", endpoint, error: "Pushnotiser kunde inte stängas av i webbläsaren." };
  }

  const serverResult = await revokeSubscription(endpoint);
  if (serverResult.ok) return { ok: true, kind: "deactivated" };
  return { ok: false, kind: "sync_required", endpoint, error: serverResult.error };
}

export function browserPushEnvironmentFromGlobals(): BrowserPushEnvironment {
  const maybeWindow = window as Window & typeof globalThis;
  return {
    isSecureContext: maybeWindow.isSecureContext,
    hasPushManager: "PushManager" in maybeWindow,
    notification: "Notification" in maybeWindow ? maybeWindow.Notification : undefined,
    serviceWorker: "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

export function pushSupportMessage(reason: PushSupportReason) {
  if (reason === "insecure_context") return "Pushnotiser kräver en säker anslutning.";
  return "Pushnotiser stöds inte i den här webbläsaren eller i det här läget.";
}

export function pushHomeScreenHint(showHomeScreenHint: boolean) {
  return showHomeScreenHint ? "På iPhone och iPad kan Grobiggis behöva läggas till på hemskärmen för att använda pushnotiser." : null;
}

export function serviceWorkerDetails() {
  return { path: SERVICE_WORKER_PATH, scope: SERVICE_WORKER_SCOPE };
}
