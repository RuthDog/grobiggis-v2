"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addShoppingListItemAction } from "@/lib/shopping-list/actions";

export function AddToShoppingListButton({
  isAuthenticated,
  listed,
  plantId,
}: Readonly<{ isAuthenticated: boolean; listed: boolean; plantId: string }>) {
  const router = useRouter();
  const [isListed, setIsListed] = useState(listed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        href="/logga-in"
      >
        Logga in för inköpslista
      </Link>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        aria-pressed={isListed}
        className={
          isListed
            ? "min-h-11 w-full rounded-full border border-[color:var(--line)] bg-[var(--sage-light)] px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            : "min-h-11 w-full rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        }
        disabled={isPending || isListed}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await addShoppingListItemAction({ plantId });
            if (!result.ok) {
              setError(result.error);
              if (/logga in/i.test(result.error)) router.push("/logga-in");
              return;
            }
            setIsListed(true);
            router.refresh();
          })
        }
        type="button"
      >
        {isListed ? "På inköpslistan" : isPending ? "Lägger till..." : "Lägg på inköpslistan"}
      </button>
      {error ? <p className="text-sm text-[color:#8b3f28]">{error}</p> : null}
    </div>
  );
}
