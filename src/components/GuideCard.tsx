import Link from "next/link";
import { GuideVisual } from "@/components/GuideVisual";
import type { KnowledgeGuide } from "@/data/guide-types";
import { readingMinutes } from "@/data/guides";

export function GuideCard({ guide }: Readonly<{ guide: KnowledgeGuide }>) {
  return (
    <Link
      className="group grid gap-5 rounded-[1.75rem] border border-[color:var(--line)] bg-[rgba(255,254,250,0.9)] p-4 shadow-[0_18px_46px_rgba(28,67,53,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(28,67,53,0.12)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
      href={`/tips/${guide.slug}`}
    >
      <GuideVisual guide={guide} compact />
      <span className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[var(--moss)]">
        <span>{guide.category}</span>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes(guide)} min läsning</span>
      </span>
      <div>
        <h2 className="text-xl font-semibold leading-tight group-hover:text-[var(--moss)]">{guide.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{guide.intro}</p>
      </div>
      <span className="mt-auto text-sm font-bold text-[var(--forest)]">Läs guiden</span>
    </Link>
  );
}
