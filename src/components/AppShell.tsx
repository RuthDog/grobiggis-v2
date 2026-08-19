"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { BRAND } from "@/config/brand";

type ShellLink = {
  href: string;
  icon: IconName;
  label: string;
};

type IconName = "calendar" | "compass" | "grid" | "leaf" | "list" | "sun";

const primaryNavigation: ShellLink[] = [
  { href: "/idag", icon: "sun", label: "Idag" },
  { href: "/min-plan", icon: "list", label: "Min plan" },
  { href: "/mina-odlingar", icon: "leaf", label: "Odlingar" },
  { href: "/vaxtbibliotek", icon: "grid", label: "Växtbibliotek" },
];

const secondaryNavigation: ShellLink[] = [
  { href: "/vader", icon: "sun", label: "Väder" },
  { href: "/inkopslista", icon: "list", label: "Inköpslista" },
  { href: "/tips", icon: "grid", label: "Tips & kunskap" },
];

const mobilePrimaryNavigation: ShellLink[] = [
  { href: "/idag", icon: "sun", label: "Idag" },
  { href: "/min-plan", icon: "list", label: "Min plan" },
  { href: "/mina-odlingar", icon: "leaf", label: "Odlingar" },
];

const mobileExploreNavigation: ShellLink[] = [
  { href: "/vaxtbibliotek", icon: "grid", label: "Växtbibliotek" },
  ...secondaryNavigation,
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ShellIcon({ name }: Readonly<{ name: IconName }>) {
  if (name === "calendar") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M8 3v3M16 3v3M4.5 9.5h15M6.5 5.5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (name === "compass") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="m15.2 8.8-1.6 4.8-4.8 1.6 1.6-4.8 4.8-1.6Z" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" />
      </svg>
    );
  }

  if (name === "leaf") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z" />
        <path d="M5 19 15 9" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M8 6h11M8 12h11M8 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ChevronDownIcon({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg
      aria-hidden="true"
      className={open ? "size-4 rotate-180 transition" : "size-4 transition"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogoMark() {
  return (
    <Link className="group flex w-fit items-center gap-3 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]" href="/">
      <span className="grid size-10 place-items-center rounded-[1.15rem] rounded-bl-md bg-[var(--forest)] text-lg font-semibold text-white shadow-sm transition group-hover:-rotate-3">
        G
      </span>
      <span className="text-lg font-semibold tracking-normal">{BRAND.shortName}</span>
    </Link>
  );
}

function DesktopExploreMenu({ active }: Readonly<{ active: boolean }>) {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-controls="desktop-explore-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] data-[active=true]:bg-white data-[active=true]:text-[var(--forest)] data-[active=true]:shadow-sm"
        data-active={active}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Mer
        <ChevronDownIcon open={open} />
      </button>
      {open ? (
        <div
          aria-label="Mer navigation"
          className="absolute right-0 top-12 z-30 grid min-w-56 gap-1 rounded-[1.35rem] border border-[color:var(--line)] bg-[var(--paper)] p-2 shadow-[0_18px_46px_rgba(28,67,53,0.12)]"
          id="desktop-explore-menu"
          role="menu"
        >
          {secondaryNavigation.map((item) => (
            <Link
              className="rounded-[1rem] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--sage-light)] hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DesktopHeader({ pathname }: Readonly<{ pathname: string }>) {
  const exploreActive = secondaryNavigation.some((item) => isRouteActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 hidden border-b border-[color:var(--line)] bg-[rgba(248,246,238,0.9)] backdrop-blur-xl md:block">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1240px] items-center justify-between gap-6 px-6 lg:px-8">
        <LogoMark />
        <nav aria-label="Primär navigation" className="flex items-center gap-1.5">
          {primaryNavigation.map((item) => {
            const active = isRouteActive(pathname, item.href);

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
          <DesktopExploreMenu active={exploreActive} />
        </nav>
        <AuthNav />
      </div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[rgba(248,246,238,0.92)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex min-h-[68px] w-full items-center justify-between gap-4 px-5">
        <LogoMark />
        <AuthNav compact />
      </div>
    </header>
  );
}

function MobileBottomNav({ pathname }: Readonly<{ pathname: string }>) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const exploreActive = mobileExploreNavigation.some((item) => isRouteActive(pathname, item.href));

  useEffect(() => {
    if (!exploreOpen) return;

    function closeOnOutside(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setExploreOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExploreOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exploreOpen]);

  return (
    <nav
      aria-label="Mobil huvudnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--line)] bg-[rgba(255,254,250,0.94)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-14px_34px_rgba(28,67,53,0.09)] backdrop-blur-xl md:hidden"
      ref={navRef}
    >
      {exploreOpen ? (
        <div
          aria-label="Utforska"
          className="absolute inset-x-3 bottom-[calc(100%+0.75rem)] grid gap-1 rounded-[1.35rem] border border-[color:var(--line)] bg-[var(--paper)] p-2 shadow-[0_18px_46px_rgba(28,67,53,0.16)]"
          role="menu"
          id="mobile-explore-panel"
        >
          {mobileExploreNavigation.map((item) => (
            <Link
              className="flex items-center gap-3 rounded-[1rem] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--sage-light)] hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href={item.href}
              key={item.href}
              onClick={() => setExploreOpen(false)}
              role="menuitem"
            >
              <ShellIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {mobilePrimaryNavigation.map((item) => {
          const active = isRouteActive(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className="grid min-h-14 place-items-center gap-0.5 rounded-[1rem] px-1 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--sage-light)] hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] aria-[current=page]:bg-[var(--sage-light)] aria-[current=page]:text-[var(--forest)]"
              href={item.href}
              key={item.href}
            >
              <ShellIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          aria-controls="mobile-explore-panel"
          aria-expanded={exploreOpen}
          aria-haspopup="menu"
          className="grid min-h-14 place-items-center gap-0.5 rounded-[1rem] px-1 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--sage-light)] hover:text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] data-[active=true]:bg-[var(--sage-light)] data-[active=true]:text-[var(--forest)]"
          data-active={exploreActive}
          aria-label="Öppna Utforska"
          onClick={() => setExploreOpen((current) => !current)}
          type="button"
        >
          <ShellIcon name="compass" />
          <span>Utforska</span>
        </button>
      </div>
    </nav>
  );
}

function AppFooter() {
  return (
    <footer className="mt-10 bg-[var(--forest)] text-white">
      <div className="mx-auto grid w-full max-w-[1240px] gap-3 px-5 py-8 sm:px-8 md:flex md:items-end md:justify-between md:py-10">
        <div>
          <p className="text-lg font-semibold">{BRAND.shortName}</p>
          <p className="mt-2 text-sm text-white/72">Din odling, lite enklare.</p>
        </div>
        <p className="text-sm text-white/60">© 2026 Grobiggis</p>
      </div>
    </footer>
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--forest)]">
      <DesktopHeader pathname={pathname} />
      <MobileHeader />
      <div className="pb-28 md:pb-0">
        {children}
        <AppFooter />
      </div>
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}
