import Image from "next/image";

type HomeHeroProps = {
  compact?: boolean;
};

export function HomeHero({ compact = false }: Readonly<HomeHeroProps>) {
  return (
    <section className="mx-auto w-full max-w-[96rem] px-0 pt-0 sm:px-5 sm:pt-4 lg:px-6">
      <div
        className={[
          "relative overflow-hidden bg-[var(--sage)] shadow-[0_22px_70px_rgba(28,67,53,0.12)]",
          compact
            ? "min-h-[250px] sm:min-h-[280px] lg:min-h-[320px]"
            : "min-h-[300px] sm:min-h-[360px] lg:min-h-[420px]",
          "sm:rounded-[2rem]",
        ].join(" ")}
      >
        <Image
          alt="Person som arbetar med gronsaker i pallkragar i en tradgard."
          className="object-cover object-[24%_62%]"
          fill
          priority
          sizes="100vw"
          src="/images/grobiggis-hero.jpg"
        />
      </div>
    </section>
  );
}
