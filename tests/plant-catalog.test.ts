import test from "node:test";
import assert from "node:assert/strict";
import { plants } from "../src/data/plants.ts";
import { catalogPlantForVisual, searchableCatalogPlants } from "../src/domain/plant-search.ts";

test("the V2 catalog contains the existing 27 plants", () => {
  assert.equal(plants.length, 27);
  assert.ok(["tomat", "basilika", "rodbeta"].every((id) => plants.some((plant) => plant.id === id)));
});

test("local search handles Swedish names and categories", () => {
  assert.equal(searchableCatalogPlants(plants, "TOMAT").some((plant) => plant.id === "tomat"), true);
  assert.equal(searchableCatalogPlants(plants, "RÖDBETA").some((plant) => plant.id === "rodbeta"), true);
  assert.equal(searchableCatalogPlants(plants, "rodbeta").some((plant) => plant.id === "rodbeta"), true);
  assert.ok(searchableCatalogPlants(plants, "örter").every((plant) => plant.category === "Örter"));
});

test("empty search returns the whole catalog sorted by Swedish name", () => {
  const results = searchableCatalogPlants(plants, "");
  assert.equal(results.length, plants.length);
  assert.deepEqual(
    results.map((plant) => plant.name),
    [...results.map((plant) => plant.name)].sort((left, right) => left.localeCompare(right, "sv-SE")),
  );
});

test("known plants resolve to colored catalog visuals and unknown ids use fallback", () => {
  assert.equal(catalogPlantForVisual(plants, "tomat")?.emoji, "🍅");
  assert.equal(catalogPlantForVisual(plants, "future-plant"), undefined);
});
