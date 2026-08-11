import Link from "next/link";

const planModes = [
  { href: "/min-plan", label: "Min plan" },
  { href: "/min-plan/grundplan", label: "Grundplan" },
] as const;

export function PlanModeNavigation({ current }: Readonly<{ current: "/min-plan" | "/min-plan/grundplan" }>) {
  return (
    <nav aria-label="Planlägesnavigering" className="flex flex-wrap gap-2">
      {planModes.map((mode) => {
        const active = current === mode.href;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
              active
                ? "border-[var(--forest)] bg-[var(--forest)] text-white"
                : "border-[color:var(--line)] bg-white/80 text-[var(--muted)] hover:bg-white hover:text-[var(--forest)]"
            }`}
            href={mode.href}
            key={mode.href}
          >
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
