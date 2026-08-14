"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { NotificationPreferenceSettings } from "@/domain/notification-infrastructure";
import { saveNotificationPreferencesAction } from "@/lib/notification-infrastructure/actions";

const preferenceSaveIntent = "save-notification-preferences";

function isExplicitPreferenceSave(event: FormEvent<HTMLFormElement>) {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  return submitter instanceof HTMLButtonElement && submitter.name === "notification-preferences-intent" && submitter.value === preferenceSaveIntent;
}

const labels: Record<keyof NotificationPreferenceSettings, string> = {
  frost: "Frostvarningar",
  watering: "Bevattningspåminnelser",
  heat: "Värmesignaler",
};

export function NotificationPreferencesForm({ preferences }: Readonly<{ preferences: NotificationPreferenceSettings }>) {
  const [settings, setSettings] = useState(preferences);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isExplicitPreferenceSave(event)) return;

    setMessage("");

    startTransition(async () => {
      const result = await saveNotificationPreferencesAction(settings);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setSettings(result.preferences);
      setMessage("Notisvalen är sparade.");
    });
  };

  return (
    <form className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6" onSubmit={submit}>
      <div>
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Notiser</p>
        <h2 className="mt-2 text-2xl font-semibold">Förbered dina val</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Välj vilka typer av odlingsnotiser du vill kunna få när pushnotiser aktiveras. Pushnotiser aktiveras i ett senare steg.
        </p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="sr-only">Notistyper</legend>
        {(Object.keys(labels) as (keyof NotificationPreferenceSettings)[]).map((signalType) => (
          <label
            className="grid min-h-14 cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm transition hover:border-[var(--moss)]"
            key={signalType}
          >
            <input
              checked={settings[signalType]}
              className="h-5 w-5 accent-[var(--forest)]"
              onChange={(event) => setSettings((current) => ({ ...current, [signalType]: event.target.checked }))}
              type="checkbox"
            />
            <span className="font-semibold text-[var(--forest)]">{labels[signalType]}</span>
          </label>
        ))}
      </fieldset>

      {message ? <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}

      <button
        className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        name="notification-preferences-intent"
        type="submit"
        value={preferenceSaveIntent}
      >
        {isPending ? "Sparar..." : "Spara notisval"}
      </button>
    </form>
  );
}
