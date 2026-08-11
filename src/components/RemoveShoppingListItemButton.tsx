"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeShoppingListItemAction } from "@/lib/shopping-list/actions";

export function RemoveShoppingListItemButton({ itemId }: Readonly<{ itemId: string }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <button
        className="min-h-11 rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await removeShoppingListItemAction({ itemId });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        type="button"
      >
        {isPending ? "Tar bort..." : "Ta bort"}
      </button>
      {error ? <p className="text-sm text-[color:#8b3f28]">{error}</p> : null}
    </div>
  );
}
