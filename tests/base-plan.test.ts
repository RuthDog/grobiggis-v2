import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CatalogPlant } from "../src/data/plant-types.ts";
import { plants } from "../src/data/plants.ts";
import {
  basePlanActivitiesForPlants,
  basePlanActivityLabels,
  basePlanDefinitionForPlant,
  basePlanDefinitionsForCatalog,
  createBasePlanMonthRange,
  formatBasePlanPeriod,
  groupBasePlanActivitiesByMonth,
  isBasePlanActivityType,
  searchableBasePlanPlants,
} from "../src/domain/base-plan.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("Grundplan uses the catalog's stable plant ids", () => {
  assert.deepEqual(
    plants.map((plant) => plant.id),
    [
      "tomat",
      "korsbarstomat",
      "gurka",
      "chili",
      "paprika",
      "potatis",
      "morot",
      "rodbeta",
      "radisa",
      "sallat",
      "spenat",
      "gronkal",
      "zucchini",
      "pumpa",
      "sockerarta",
      "buskbona",
      "gul-lok",
      "vitlok",
      "jordgubbe",
      "hallon",
      "persilja",
      "basilika",
      "dill",
      "graslok",
      "timjan",
      "solros",
      "ringblomma",
    ],
  );
});

test("every BasePlan plant id exists in the real catalog and there are no duplicates", () => {
  const definitions = basePlanDefinitionsForCatalog(plants);
  const ids = definitions.map((definition) => definition.plantId);

  assert.ok(ids.every((id) => plants.some((plant) => plant.id === id)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(definitions.length, plants.length);
});

test("Grundplan is independent from GrowingBatch, userId and D1", () => {
  const source = read("src/app/min-plan/grundplan/page.tsx");

  assert.doesNotMatch(source, /getCurrentUserGrowingBatches|getCurrentUserGrowingBatch|requireUser|env\.DB|batchId|userId/);
  assert.match(source, /searchableBasePlanPlants/);
  assert.match(source, /basePlanActivitiesForPlants/);
});

test("Min plan keeps its session-backed personal loader", () => {
  const source = read("src/app/min-plan/page.tsx");

  assert.match(source, /getCurrentUserGrowingBatches/);
});

test("Plan mode navigation links Min plan and Grundplan with real routes", () => {
  const source = read("src/components/PlanModeNavigation.tsx");

  assert.match(source, /\/min-plan/);
  assert.match(source, /\/min-plan\/grundplan/);
  assert.match(source, /aria-current/);
});

test("BasePlan calendar keeps all 12 months and responsive grid density", () => {
  const source = read("src/components/BasePlanCalendar.tsx");

  assert.match(source, /includeEmptyMonths: true/);
  assert.match(source, /md:grid-cols-2 lg:grid-cols-4/);
  assert.match(source, /currentMonth/);
});

test("BasePlan activity types and period model are validated", () => {
  assert.equal(isBasePlanActivityType("preSow"), true);
  assert.equal(isBasePlanActivityType("harvest"), true);
  assert.equal(isBasePlanActivityType("care"), false);
  assert.throws(() => createBasePlanMonthRange(0, 2));
  assert.throws(() => createBasePlanMonthRange(5, 4));
  assert.equal(formatBasePlanPeriod(createBasePlanMonthRange(3, 4)), "mars-april");
});

test("BasePlan activities sort chronologically and group by month", () => {
  const visible = basePlanActivitiesForPlants(plants, ["chili", "tomat"]);
  const months = groupBasePlanActivitiesByMonth(visible, { includeEmptyMonths: false });

  assert.ok(visible[0]!.period.fromMonth <= visible[visible.length - 1]!.period.fromMonth);
  assert.equal(months[0]?.name, "Januari");
  assert.ok(months.some((month) => month.name === "Mars"));
});

test("an activity spanning several months is shown in each covered month", () => {
  const tomato = basePlanActivitiesForPlants(plants, ["tomat"]).find((activity) => activity.type === "harvest")!;
  const grouped = groupBasePlanActivitiesByMonth([tomato], { includeEmptyMonths: false });

  assert.deepEqual(grouped.map((month) => month.name), ["Juli", "Augusti", "September"]);
});

test("several plants can share the same month without being merged", () => {
  const visible = basePlanActivitiesForPlants(plants, ["tomat", "korsbarstomat"]).filter((activity) => activity.type === "preSow");
  const march = groupBasePlanActivitiesByMonth(visible, { includeEmptyMonths: false }).find((month) => month.name === "Mars");

  assert.equal(march?.items.length, 2);
  assert.notEqual(march?.items[0]?.plantId, march?.items[1]?.plantId);
});

test("a plant without BasePlan data is handled in a controlled way", () => {
  const unsupportedPlant = {
    ...plants[0]!,
    id: "future-plant",
    timing: { harvest: undefined },
  } as unknown as CatalogPlant;

  assert.equal(basePlanDefinitionForPlant(unsupportedPlant), null);
});

test("search and filter use the existing catalog and do not mix similar names", () => {
  const tomato = searchableBasePlanPlants(plants, "tomat").map((plant) => plant.id);
  const cherryTomato = searchableBasePlanPlants(plants, "körsbär").map((plant) => plant.id);

  assert.ok(tomato.includes("tomat"));
  assert.ok(tomato.includes("korsbarstomat"));
  assert.deepEqual(cherryTomato, ["korsbarstomat"]);
});

test("Swedish text with å ä ö is preserved in Grundplan labels and page copy", () => {
  const page = read("src/app/min-plan/grundplan/page.tsx");

  assert.equal(basePlanActivityLabels.preSow, "Förodling");
  assert.equal(basePlanActivityLabels.directSow, "Direktsådd");
  assert.match(page, /Generell vägledning genom odlingsåret/);
  assert.match(page, /ungefär när olika moment brukar vara aktuella under ett normalt svenskt odlingsår/);
});

test("technical copy is removed from the Grundplan user interface", () => {
  const page = read("src/app/min-plan/grundplan/page.tsx");

  assert.doesNotMatch(page, /batchar|databaspersistens|produktkunskap/);
  assert.match(page, /dina egna odlingar eller din historik/);
});

test("BasePlan month cards mark the current month and keep calm months compact", () => {
  const month = read("src/components/BasePlanMonth.tsx");

  assert.match(month, /Nu/);
  assert.match(month, /En lugn månad/);
});

test("BasePlan activities are rendered as compact rows without large plant visuals", () => {
  const activity = read("src/components/BasePlanActivity.tsx");

  assert.doesNotMatch(activity, /PlantVisual/);
  assert.doesNotMatch(activity, /formatBasePlanPeriod/);
  assert.match(activity, /basePlanActivityLabels/);
});
