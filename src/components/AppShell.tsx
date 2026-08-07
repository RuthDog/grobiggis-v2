"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthNav } from "@/components/AuthNav";
import { BRAND } from "@/config/brand";
import { GrowingSessionProvider } from "@/state/growing-session";

const navigation = [
  { href: "/", label: "Start" },
  { href: "/vaxtbibliotek", label: "Växtbibliotek" },
  { href: "/min-plan", label: "Min plan" },
  { href: "/tips", label: "Tips & kunskap" },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <GrowingSessionProvider>
      <div className="min-h-screen bg-[var(--cream)] text-[var(--forest)]">
        <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(248,246,238,0.86)] backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Link className="group flex w-fit items-center gap-3 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href="/">
              <span className="grid size-10 place-items-center rounded-[1.25rem] rounded-bl-md bg-[var(--forest)] text-lg text-white shadow-sm transition group-hover:-rotate-3">
                G
              </span>
              <span className="grid">
                <span className="text-lg font-semibold">{BRAND.shortName}</span>
                <span className="text-xs text-[var(--muted)]">V2 under utveckling</span>
              </span>
            </Link>

            <nav aria-label="Primär navigation" className="flex flex-wrap gap-2">
              {navigation.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] aria-[current=page]:bg-white aria-[current=page]:text-[var(--forest)] aria-[current=page]:shadow-sm"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <AuthNav />
            </nav>
          </div>
        </header>

        {children}
      </div>
    </GrowingSessionProvider>
  );
}
