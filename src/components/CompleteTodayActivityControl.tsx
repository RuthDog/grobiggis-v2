"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completePlanActivityAction } from "@/lib/growing/actions";

type CompleteTodayActivityControlProps = Readonly<{
  batchId: string;
  planEventId: string;
  eventType: string;
}>;

export function CompleteTodayActivityControl({ batchId, planEventId, eventType }: CompleteTodayActivityControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.16)] transition hover:bg-[var(--moss)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await completePlanActivityAction({ batchId, planEventId, eventType });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        type="button"
      >
        {isPending ? "Markerar..." : "Markera klar"}
      </button>
      {error ? (
        <p className="max-w-40 text-xs font-semibold leading-5 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
