"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registerPushSubscriptionAction,
  revokePushSubscriptionAction,
  sendNotificationCandidateAction,
  sendTestPushAction,
  syncPushSubscriptionAction,
} from "@/lib/notification-infrastructure/actions";
import type { NotificationCandidatePreview } from "@/lib/notification-infrastructure/candidate-delivery-types";
import {
  activatePushOnCurrentDevice,
  browserPushEnvironmentFromGlobals,
  deactivatePushOnCurrentDevice,
  pushHomeScreenHint,
  pushSupportMessage,
  readSyncedPushDeviceState,
  type PushDeviceState,
} from "@/lib/push/client";

function DeviceStatusMessage({ state }: Readonly<{ state: PushDeviceState }>) {
  if (state.kind === "active") {
    return <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">Pushnotiser är aktiverade på den här enheten.</p>;
  }

  if (state.kind === "permission_denied") {
    return (
      <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--soil)]">
        Notiser är blockerade i webbläsaren. Ändra tillåtelsen i webbläsarens inställningar om du vill aktivera dem.
      </p>
    );
  }

  if (state.kind === "unsupported") {
    return <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--soil)]">{pushSupportMessage(state.reason)}</p>;
  }

  if (state.kind === "needs_config") {
    return <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--soil)]">Pushnotiser kan inte aktiveras just nu.</p>;
  }

  if (state.kind === "sync_required") {
    return <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--soil)]">{state.error}</p>;
  }

  return null;
}

export function PushNotificationsCard({
  candidateDelivery,
  vapidPublicKey,
}: Readonly<{
  candidateDelivery: NotificationCandidatePreview | null;
  vapidPublicKey: string | null;
}>) {
  const router = useRouter();
  const [deviceState, setDeviceState] = useState<PushDeviceState>({
    kind: "inactive",
    permission: "default",
    showHomeScreenHint: false,
  });
  const [message, setMessage] = useState("");
  const [lastKnownEndpoint, setLastKnownEndpoint] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshDeviceState = useCallback(async () => {
    const next = await readSyncedPushDeviceState(browserPushEnvironmentFromGlobals(), vapidPublicKey, syncPushSubscriptionAction);
    setDeviceState(next);
    if (next.kind === "active") {
      setLastKnownEndpoint(next.endpoint);
      return;
    }
    if (next.kind !== "inactive") return;
    setLastKnownEndpoint(null);
  }, [vapidPublicKey]);

  useEffect(() => {
    let cancelled = false;

    void readSyncedPushDeviceState(browserPushEnvironmentFromGlobals(), vapidPublicKey, syncPushSubscriptionAction).then((next) => {
      if (cancelled) return;

      setDeviceState(next);
      if (next.kind === "active") {
        setLastKnownEndpoint(next.endpoint);
        return;
      }
      if (next.kind !== "inactive") return;
      setLastKnownEndpoint(null);
    });

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const activate = () => {
    setMessage("");

    startTransition(async () => {
      const result = await activatePushOnCurrentDevice({
        environment: browserPushEnvironmentFromGlobals(),
        vapidPublicKey,
        registerSubscription: registerPushSubscriptionAction,
      });

      if (!result.ok) {
        setMessage(result.error);
        await refreshDeviceState();
        return;
      }

      setLastKnownEndpoint(result.endpoint);
      setMessage(result.replacedExistingSubscription ? "Pushnotiser återaktiverades på den här enheten." : "");
      await refreshDeviceState();
    });
  };

  const deactivate = () => {
    setMessage("");

    startTransition(async () => {
      const result = await deactivatePushOnCurrentDevice({
        environment: browserPushEnvironmentFromGlobals(),
        revokeSubscription: async (endpoint) => revokePushSubscriptionAction({ endpoint }),
        lastKnownEndpoint,
      });

      if (!result.ok) {
        if (result.kind === "sync_required" && result.endpoint) {
          setLastKnownEndpoint(result.endpoint);
        }
        setMessage(result.error);
        await refreshDeviceState();
        return;
      }

      setLastKnownEndpoint(null);
      setMessage(result.kind === "already_inactive" ? "Pushnotiser är redan avstängda på den här enheten." : "Pushnotiser är avstängda på den här enheten.");
      await refreshDeviceState();
    });
  };

  const sendTestPush = () => {
    if (deviceState.kind !== "active") return;
    setMessage("");

    startTransition(async () => {
      const result = await sendTestPushAction({ endpoint: deviceState.endpoint });
      setMessage(result.message);
      if (result.status === "subscription_invalid") {
        await refreshDeviceState();
      }
    });
  };

  const sendNotificationCandidate = () => {
    if (deviceState.kind !== "active" || candidateDelivery?.status !== "available") return;
    setMessage("");

    startTransition(async () => {
      const result = await sendNotificationCandidateAction({ endpoint: deviceState.endpoint });
      setMessage(result.message);
      if (result.status === "subscription_invalid") {
        await refreshDeviceState();
      }
      router.refresh();
    });
  };

  const homeScreenHint = pushHomeScreenHint(deviceState.showHomeScreenHint);
  const showActivate = deviceState.kind === "inactive" || deviceState.kind === "sync_required";
  const showDeactivate = deviceState.kind === "active" || deviceState.kind === "sync_required" || Boolean(lastKnownEndpoint);
  const showTestPush = deviceState.kind === "active";
  const showNotificationCandidate = deviceState.kind === "active" && candidateDelivery;

  return (
    <section className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Pushnotiser på den här enheten</p>
        <h2 className="mt-2 text-2xl font-semibold">Aktivera i webbläsaren</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Pushnotiser kräver tillåtelse från din webbläsare. Du kan stänga av dem igen när du vill.
        </p>
      </div>

      <DeviceStatusMessage state={deviceState} />

      {showNotificationCandidate ? (
        <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--forest)]">Testa aktuell Grobiggis-notis</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Skicka den högst prioriterade aktuella odlingsnotisen till den här enheten.
            </p>
          </div>
          {candidateDelivery.status === "available" ? (
            <>
              <p className="text-sm font-semibold text-[var(--forest)]">{candidateDelivery.candidate.title}</p>
              <button
                className="min-h-11 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[var(--forest)] shadow-[0_10px_22px_rgba(28,67,53,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={sendNotificationCandidate}
                type="button"
              >
                {isPending ? "Skickar..." : "Skicka aktuell notis"}
              </button>
            </>
          ) : (
            <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">
              {candidateDelivery.status === "preference_disabled"
                ? "Aktuella notiser är avstängda i dina notisval."
                : candidateDelivery.status === "already_delivered"
                  ? "Den aktuella notisen har redan skickats."
                  : "Ingen aktuell odlingsnotis finns att skicka just nu."}
            </p>
          )}
        </div>
      ) : null}

      {showTestPush ? (
        <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--forest)]">Testa pushnotiser</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Skicka en testnotis till den här enheten för att kontrollera att allt fungerar.
            </p>
          </div>
          <button
            className="min-h-11 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[var(--forest)] shadow-[0_10px_22px_rgba(28,67,53,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={sendTestPush}
            type="button"
          >
            {isPending ? "Skickar..." : "Skicka testnotis"}
          </button>
        </div>
      ) : null}

      {homeScreenHint ? <p className="text-sm leading-6 text-[var(--muted)]">{homeScreenHint}</p> : null}
      {message ? <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        {showActivate ? (
          <button
            className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={activate}
            type="button"
          >
            {isPending ? "Aktiverar..." : "Aktivera pushnotiser"}
          </button>
        ) : null}

        {showDeactivate ? (
          <button
            className="min-h-12 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[var(--forest)] shadow-[0_10px_22px_rgba(28,67,53,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={deactivate}
            type="button"
          >
            {isPending ? "Stänger av..." : "Stäng av pushnotiser på den här enheten"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
