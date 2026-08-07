import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideCard } from "@/components/GuideCard";
import { GuideVisual } from "@/components/GuideVisual";
import { findGuideBySlug, guides, readingMinutes, relatedGuidesFor } from "@/data/guides";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const guide = findGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide saknas | GroBiggis V2",
    };
  }

  return {
    title: `${guide.title} | GroBiggis V2`,
    description: guide.intro,
  };
}

export default async function GuideArticlePage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const guide = findGuideBySlug(slug);

  if (!guide) notFound();

  const quick = guide.sections.flatMap((section) => section.steps ?? section.paragraphs).slice(0, 4);
  const related = relatedGuidesFor(guide);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white/80 px-4 text-sm font-bold text-[var(--forest)] shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        href="/tips"
      >
        Till Tips & kunskap
      </Link>

      <article className="mt-6 grid gap-6">
        <header className="grid gap-6 rounded-[2rem] border border-[color:var(--line)] bg-[var(--paper)] p-5 shadow-[0_22px_70px_rgba(28,67,53,0.1)] sm:p-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <GuideVisual guide={guide} />
          <div>
            <p className="text-sm font-bold uppercase text-[var(--moss)]">
              {guide.category} · {readingMinutes(guide)} min läsning
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{guide.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{guide.intro}</p>
          </div>
        </header>

        <section className="rounded-[1.5rem] bg-[var(--sage-light)] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Det viktigaste på 30 sekunder</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {quick.map((point) => (
              <li className="flex gap-3" key={point}>
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--moss)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Innehåll" className="flex flex-wrap gap-2 rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-4">
          {guide.sections.map((section) => (
            <a
              className="rounded-full bg-[var(--sage-light)] px-3 py-2 text-sm font-semibold text-[var(--forest)] transition hover:bg-[var(--sage)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
              href={`#${section.id}`}
              key={section.id}
            >
              {section.heading}
            </a>
          ))}
        </nav>

        <div className="grid gap-5">
          {guide.sections.map((section) => (
            <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/80 p-5 sm:p-7" id={section.id} key={section.id}>
              <h2 className="text-2xl font-semibold">{section.heading}</h2>
              <div className="mt-4 grid gap-4 text-base leading-8 text-[var(--muted)]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.steps ? (
                <ol className="mt-5 grid gap-3 text-base leading-7 text-[var(--forest)]">
                  {section.steps.map((step, index) => (
                    <li className="grid grid-cols-[auto_1fr] gap-3" key={step}>
                      <span aria-hidden="true" className="mt-1 grid size-6 place-items-center rounded-full bg-[var(--forest)] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          ))}
        </div>

        {guide.caution ? (
          <aside className="rounded-[1.5rem] border border-[#e6c6a6] bg-[#fff7ed] p-5 text-[var(--forest)]">
            <h2 className="text-lg font-semibold">Försiktighetsnotering</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{guide.caution}</p>
          </aside>
        ) : null}

        <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/80 p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Källor</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Källtyp och åtkomstdatum visas öppet. GroBiggis sammanfattar innehållet med egna ord.
          </p>
          <ul className="mt-5 grid gap-4">
            {guide.sources.map((source) => (
              <li className="grid gap-1 border-t border-[color:var(--line)] pt-4 text-sm leading-6" key={source.url}>
                <a
                  className="font-bold text-[var(--forest)] underline decoration-[var(--sage)] decoration-2 underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title}
                </a>
                <span className="text-[var(--muted)]">
                  {source.publisher} · {source.kind} · hämtad {source.accessedAt}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </article>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Relaterade guider</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <GuideCard guide={item} key={item.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
