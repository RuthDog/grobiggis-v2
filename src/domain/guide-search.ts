import type { KnowledgeGuide } from "@/data/guide-types";
import { normalizeSearchText } from "./text-search.ts";

export function searchableGuides(guides: KnowledgeGuide[], query: string, category = "Alla") {
  const needle = normalizeSearchText(query);

  return guides
    .filter((guide) => category === "Alla" || guide.category === category)
    .filter((guide) => {
      if (!needle) return true;

      return normalizeSearchText(
        [
          guide.title,
          guide.category,
          guide.intro,
          guide.audience,
          ...guide.relatedPlants,
          ...guide.relatedEvents,
        ].join(" "),
      ).includes(needle);
    })
    .toSorted((left, right) => left.title.localeCompare(right.title, "sv-SE"));
}

export function guideSearchHasResults(guides: KnowledgeGuide[], query: string, category = "Alla") {
  return searchableGuides(guides, query, category).length > 0;
}
