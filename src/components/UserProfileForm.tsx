"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveUserProfileAction } from "@/lib/user-profile/actions";

export function UserProfileForm({
  firstName,
  locality,
}: Readonly<{ firstName?: string | null; locality?: string | null }>) {
  const [name, setName] = useState(firstName ?? "");
  const [place, setPlace] = useState(locality ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await saveUserProfileAction({ firstName: name, locality: place });
      setMessage(result.ok ? "Profilen är sparad." : result.error);
    });
  };

  return (
    <form className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold" htmlFor="profile-first-name">
          Förnamn
        </label>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
          id="profile-first-name"
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ola"
          value={name}
        />
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="profile-locality">
          Odlingsort
        </label>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
          id="profile-locality"
          maxLength={100}
          onChange={(event) => setPlace(event.target.value)}
          placeholder="Halmstad"
          value={place}
        />
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Din odlingsort används framöver för lokala råd och väder.
        </p>
      </div>

      {message ? <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}

      <button
        className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sparar..." : "Spara profil"}
      </button>
    </form>
  );
}
