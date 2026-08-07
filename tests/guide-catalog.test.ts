import test from "node:test";
import assert from "node:assert/strict";
import { findGuideBySlug, guideCategories, guides, relatedGuidesFor } from "../src/data/guides.ts";
import { guideSearchHasResults, searchableGuides } from "../src/domain/guide-search.ts";

test("the V2 guide catalog contains the reviewed knowledge guides", () => {
  assert.equal(guides.length, 8);
  assert.ok(guides.every((guide) => guide.sections.length >= 3));
  assert.ok(guides.every((guide) => guide.sources.length > 0));
});

test("each guide has a unique slug and can be found by slug", () => {
  assert.equal(new Set(guides.map((guide) => guide.slug)).size, guides.length);
  assert.equal(findGuideBySlug("lyckas-med-tomater")?.title, "Så lyckas du med tomater");
  assert.equal(findGuideBySlug("saknas"), undefined);
});

test("guide search handles Swedish text, case and accents", () => {
  assert.equal(searchableGuides(guides, "TOMATER").some((guide) => guide.slug === "lyckas-med-tomater"), true);
  assert.equal(searchableGuides(guides, "skorda").some((guide) => guide.slug === "skorda-for-smak"), true);
  assert.equal(searchableGuides(guides, "VÄXTPROBLEM").some((guide) => guide.slug === "vanliga-orsaker-gula-blad"), true);
});

test("category filters come from real guide categories and combine with search", () => {
  assert.deepEqual([...guideCategories], ["Alla", "Växtguider", "Säsong", "Bevattning", "Nybörjarguider", "Växtproblem", "Skörd"]);
  assert.ok(searchableGuides(guides, "", "Säsong").every((guide) => guide.category === "Säsong"));
  assert.deepEqual(
    searchableGuides(guides, "frost", "Säsong").map((guide) => guide.slug),
    ["dags-att-plantera-ut", "skydda-mot-nattfrost"],
  );
});

test("empty guide searches can be detected for the UI empty state", () => {
  assert.equal(guideSearchHasResults(guides, "finns-inte-i-guidematerialet"), false);
  assert.deepEqual(searchableGuides(guides, "finns-inte-i-guidematerialet"), []);
});

test("sources are present and traceable for every migrated guide", () => {
  for (const guide of guides) {
    assert.ok(guide.sources.every((source) => source.url.startsWith("https://")));
    assert.ok(guide.sources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt)));
  }
});

test("related guides use existing category or plant metadata", () => {
  const tomato = findGuideBySlug("lyckas-med-tomater")!;
  assert.ok(relatedGuidesFor(tomato).some((guide) => guide.slug === "skorda-for-smak"));
  const transplant = findGuideBySlug("dags-att-plantera-ut")!;
  assert.ok(relatedGuidesFor(transplant).every((guide) => guide.category === "Säsong"));
});
