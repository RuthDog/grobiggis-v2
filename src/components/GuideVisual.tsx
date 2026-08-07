import type { KnowledgeGuide } from "@/data/guide-types";

const categoryVisuals: Record<string, { mark: string; tone: string }> = {
  Bevattning: { mark: "V", tone: "bg-[#d7e9ee]" },
  Nybörjarguider: { mark: "N", tone: "bg-[#e9e1c9]" },
  Skörd: { mark: "S", tone: "bg-[#f0dcc3]" },
  Säsong: { mark: "Å", tone: "bg-[#dce8dc]" },
  Växtguider: { mark: "G", tone: "bg-[#dfeadb]" },
  Växtproblem: { mark: "P", tone: "bg-[#eadbd2]" },
};

export function GuideVisual({ guide, compact = false }: Readonly<{ guide: KnowledgeGuide; compact?: boolean }>) {
  const visual = categoryVisuals[guide.category] ?? { mark: "T", tone: "bg-[var(--sage-light)]" };

  return (
    <div
      aria-hidden="true"
      className={`${compact ? "h-24" : "h-44"} relative overflow-hidden rounded-[1.5rem] ${visual.tone} shadow-[inset_0_0_0_1px_rgba(25,69,56,0.08)]`}
    >
      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/45" />
      <div className="absolute bottom-4 left-4 grid size-14 place-items-center rounded-[1.15rem] bg-[var(--forest)] text-2xl font-semibold text-white">
        {visual.mark}
      </div>
      <div className="absolute bottom-5 right-5 h-16 w-28 rounded-full border border-[rgba(25,69,56,0.18)]" />
    </div>
  );
}
