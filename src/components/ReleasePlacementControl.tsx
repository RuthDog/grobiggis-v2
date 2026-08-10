"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { releasePlantPlacementAction } from "@/lib/growing/actions";

export function ReleasePlacementControl({
  batchName,
  placementId,
}: Readonly<{
  batchName: string;
  placementId: string;
}>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <button
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/90 px-3 text-xs font-bold text-[var(--forest)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-wait disabled:opacity-60"
        disabled={isPending}
        onClick={() => {
          const approved = window.confirm(`Frigöra platsen för ${batchName}? Odlingshistoriken finns kvar i Min plan.`);
          if (!approved) return;
          setError("");
          startTransition(async () => {
            const result = await releasePlantPlacementAction(placementId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        type="button"
      >
        {isPending ? "Frigör..." : "Frigör plats"}
      </button>
      {error ? (
        <p className="max-w-52 text-xs font-semibold leading-5 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
