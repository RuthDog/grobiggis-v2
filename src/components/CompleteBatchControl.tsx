"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeGrowingBatchAction } from "@/lib/growing/actions";

export function CompleteBatchControl({ batchId }: Readonly<{ batchId: string }>) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const complete = async () => {
    setSaving(true);
    setError("");
    const result = await completeGrowingBatchAction(batchId);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setConfirming(false);
    router.push("/min-plan");
    router.refresh();
  };

  if (!confirming) {
    return (
      <button
        className="min-h-11 rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--muted)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Avsluta odling
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-[1.25rem] bg-[var(--sage-light)] p-3">
      <p className="text-sm font-semibold">Avsluta bara den här omgången?</p>
      <div className="flex gap-2">
        <button
          className="min-h-10 rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={complete}
          type="button"
        >
          {saving ? "Sparar..." : "Ja, avsluta"}
        </button>
        <button className="min-h-10 rounded-full bg-white px-4 text-sm font-bold" disabled={saving} onClick={() => setConfirming(false)} type="button">
          Avbryt
        </button>
      </div>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
