import { plants } from "@/data/plants";
import type { CatalogPlant } from "@/data/plant-types";
import { catalogPlantForVisual } from "@/domain/plant-search";

const sizeClass = {
  small: "size-11 text-2xl",
  medium: "size-14 text-3xl",
  large: "size-16 text-4xl",
};

export function PlantVisual({
  plant,
  plantId,
  size = "medium",
}: Readonly<{ plant?: CatalogPlant; plantId?: string; size?: keyof typeof sizeClass }>) {
  const visualPlant = plant ?? catalogPlantForVisual(plants, plantId);

  if (visualPlant?.emoji) {
    return (
      <span
        aria-label={visualPlant.name}
        className={`${sizeClass[size]} grid shrink-0 place-items-center rounded-[1.35rem] bg-white shadow-[inset_0_0_0_1px_rgba(25,69,56,0.08)]`}
        role="img"
      >
        {visualPlant.emoji}
      </span>
    );
  }

  return (
    <span
      aria-label={visualPlant?.name ?? "Okänd växt"}
      className={`${sizeClass[size]} grid shrink-0 place-items-center rounded-[1.35rem] bg-[var(--sage)] text-base font-bold text-[var(--forest)] shadow-[inset_0_0_0_1px_rgba(25,69,56,0.08)]`}
      role="img"
    >
      {visualPlant?.name.slice(0, 1) ?? "•"}
    </span>
  );
}
