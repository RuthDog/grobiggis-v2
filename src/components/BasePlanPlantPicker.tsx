import Link from "next/link";

type BasePlanPlantPickerProps = {
  query: string;
  resultCount: number;
  totalCount: number;
};

export function BasePlanPlantPicker({ query, resultCount, totalCount }: Readonly<BasePlanPlantPickerProps>) {
  return (
    <form action="/min-plan/grundplan" className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4 shadow-[0_10px_24px_rgba(28,67,53,0.05)]">
      <label className="text-sm font-semibold" htmlFor="base-plan-search">
        Filtrera växter i Grundplan
      </label>
      <input
        className="mt-3 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-base outline-none transition placeholder:text-[#8f9a94] focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
        defaultValue={query}
        id="base-plan-search"
        name="q"
        placeholder="Till exempel tomat, ört eller rödbeta"
        type="search"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="min-h-11 rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(25,69,56,0.14)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
          type="submit"
        >
          Visa Grundplan
        </button>
        {query ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[var(--forest)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/min-plan/grundplan"
          >
            Rensa filter
          </Link>
        ) : null}
      </div>
      <p aria-live="polite" className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {resultCount} av {totalCount} växter med Grundplan-data visas.
      </p>
    </form>
  );
}
