"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";

function AccountIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function AuthNav({ compact = false }: Readonly<{ compact?: boolean }>) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (isPending) {
    return <span className="grid size-10 place-items-center rounded-full bg-white/70 text-sm font-semibold text-[var(--muted)]">P</span>;
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
    <div className="relative" ref={menuRef}>
      <button
        aria-controls={compact ? "mobile-account-menu" : "desktop-account-menu"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Öppna profilmeny"
        className="grid size-10 place-items-center rounded-full border border-[color:var(--line)] bg-white text-sm font-bold text-[var(--forest)] shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <AccountIcon />
      </button>

      {open ? (
        <div
          aria-label="Konto"
          className="absolute right-0 top-12 z-40 grid min-w-64 gap-1 rounded-[1.35rem] border border-[color:var(--line)] bg-[var(--paper)] p-2 shadow-[0_18px_46px_rgba(28,67,53,0.14)]"
          id={compact ? "mobile-account-menu" : "desktop-account-menu"}
          role="menu"
        >
          <Link
            className="rounded-[1rem] px-4 py-3 text-sm font-semibold text-[var(--forest)] transition hover:bg-[var(--sage-light)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/profil"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            Profil
          </Link>
          <p className="max-w-56 truncate px-4 py-2 text-xs font-semibold text-[var(--muted)]">{session.user.email}</p>
          <button
            className="rounded-[1rem] px-4 py-3 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--sage-light)] hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            onClick={async () => {
              setOpen(false);
              await authClient.signOut();
              router.refresh();
            }}
            role="menuitem"
            type="button"
          >
            Logga ut
          </button>
        </div>
      ) : null}
    </div>
  );
}
