"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { validateLoginEmail } from "@/lib/auth/config";

type FormState = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!validateLoginEmail(trimmed)) {
      setState("error");
      setMessage("Skriv en giltig e-postadress.");
      return;
    }

    setState("sending");
    setMessage("");

    const { error } = await authClient.signIn.magicLink({
      email: trimmed,
      callbackURL: "/min-plan",
      errorCallbackURL: "/logga-in",
    });

    if (error) {
      setState("error");
      setMessage("Inloggningslänken kunde inte skickas just nu.");
      return;
    }

    setState("sent");
    setMessage("Om e-postleverans är konfigurerad kommer en inloggningslänk skickas till adressen.");
  };

  return (
    <form className="mt-8 grid max-w-xl gap-4" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold text-[var(--forest)]">
        E-post
        <input
          autoComplete="email"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-base text-[var(--forest)] outline-none transition focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="du@example.com"
          type="email"
          value={email}
        />
      </label>
      <button
        className="w-fit rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={state === "sending"}
        type="submit"
      >
        {state === "sending" ? "Skickar..." : "Skicka inloggningslänk"}
      </button>
      {message ? (
        <p className={state === "error" ? "text-sm font-semibold text-red-700" : "text-sm font-semibold text-[var(--moss)]"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
