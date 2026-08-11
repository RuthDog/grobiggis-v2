"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function AuthNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <span className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)]">Konto</span>;
  }

  if (!session) {
    return (
      <Link
        className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        href="/logga-in"
      >
        Logga in
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        href="/profil"
      >
        Profil
      </Link>
      <span className="max-w-44 truncate rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--muted)]">
        {session.user.email}
      </span>
      <button
        className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
        type="button"
      >
        Logga ut
      </button>
    </div>
  );
}
