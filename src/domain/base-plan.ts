import type { CatalogPlant } from "@/data/plant-types";
import { searchableCatalogPlants } from "./plant-search.ts";
import { swedishMonths } from "./plan-presentation.ts";

export type BasePlanActivityType = "preSow" | "directSow" | "transplant" | "harvest";

export interface BasePlanMonthRange {
  fromMonth: number;
  toMonth: number;
}

export interface BasePlanActivityDefinition {
  type: BasePlanActivityType;
  period: BasePlanMonthRange;
  guidance?: string;
}

export interface BasePlanDefinition {
  plantId: string;
  activities: BasePlanActivityDefinition[];
}

export interface BasePlanActivityView extends BasePlanActivityDefinition {
  id: string;
  plantId: string;
  plantName: string;
  plantCategory: CatalogPlant["category"];
  plantEmoji?: string;
}

export const basePlanActivityLabels: Record<BasePlanActivityType, string> = {
  preSow: "Förodling",
  directSow: "Direktsådd",
  transplant: "Utplantering",
  harvest: "Skörd",
};

const basePlanActivityGuidance: Record<BasePlanActivityType, string> = {
  preSow: "Starta ljust och jämnt för en trygg start på säsongen.",
  directSow: "Så när jorden brukar vara redo och håll fukten jämn under groningen.",
  transplant: "Flytta ut eller plantera när säsongen normalt har stabiliserats.",
  harvest: "Skörda löpande under den period då växten oftast ger som mest.",
};

function validateMonth(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error(`Invalid month in base plan: ${value}`);
  }
  return value;
}

export function createBasePlanMonthRange(fromMonth: number, toMonth: number): BasePlanMonthRange {
  const from = validateMonth(fromMonth);
  const to = validateMonth(toMonth);
  if (from > to) {
    throw new Error(`Base plan month range must be chronological: ${from}-${to}`);
  }
  return { fromMonth: from, toMonth: to };
}

export function isBasePlanActivityType(value: string): value is BasePlanActivityType {
  return value === "preSow" || value === "directSow" || value === "transplant" || value === "harvest";
}

export function formatBasePlanPeriod(period: BasePlanMonthRange) {
  const from = swedishMonths[period.fromMonth - 1].toLowerCase();
  if (period.fromMonth === period.toMonth) return from;
  return `${from}-${swedishMonths[period.toMonth - 1].toLowerCase()}`;
}

export function monthsForBasePlanPeriod(period: BasePlanMonthRange) {
  return Array.from({ length: period.toMonth - period.fromMonth + 1 }, (_, index) => period.fromMonth + index);
}

function activityFromTiming(
  type: BasePlanActivityType,
  range: [number, number] | undefined,
): BasePlanActivityDefinition | undefined {
  if (!range) return undefined;
  return {
    type,
    period: createBasePlanMonthRange(range[0], range[1]),
    guidance: basePlanActivityGuidance[type],
  };
}

export function basePlanDefinitionForPlant(plant: CatalogPlant): BasePlanDefinition | null {
  const activities = [
    activityFromTiming("preSow", plant.timing.preSow),
    activityFromTiming("directSow", plant.timing.directSow),
    activityFromTiming("transplant", plant.timing.transplant),
    activityFromTiming("harvest", plant.timing.harvest),
  ].filter((activity): activity is BasePlanActivityDefinition => Boolean(activity));

  if (!activities.length) return null;
  return { plantId: plant.id, activities };
}

export function basePlanDefinitionsForCatalog(catalog: CatalogPlant[]) {
  return catalog
    .map((plant) => basePlanDefinitionForPlant(plant))
    .filter((definition): definition is BasePlanDefinition => Boolean(definition));
}

export function searchableBasePlanPlants(catalog: CatalogPlant[], query: string) {
  const supportedPlantIds = new Set(basePlanDefinitionsForCatalog(catalog).map((definition) => definition.plantId));
  return searchableCatalogPlants(
    catalog.filter((plant) => supportedPlantIds.has(plant.id)),
    query,
  );
}

export function basePlanActivitiesForPlants(catalog: CatalogPlant[], plantIds?: string[]) {
  const visiblePlantIds = plantIds?.length ? new Set(plantIds) : null;

  return basePlanDefinitionsForCatalog(catalog)
    .flatMap((definition) => {
      if (visiblePlantIds && !visiblePlantIds.has(definition.plantId)) return [];
      const plant = catalog.find((item) => item.id === definition.plantId);
      if (!plant) return [];

      return definition.activities.map((activity) => ({
        ...activity,
        id: `${plant.id}:${activity.type}`,
        plantId: plant.id,
        plantName: plant.name,
        plantCategory: plant.category,
        plantEmoji: plant.emoji,
      }));
    })
    .toSorted(
      (left, right) =>
        left.period.fromMonth - right.period.fromMonth ||
        left.period.toMonth - right.period.toMonth ||
        left.plantName.localeCompare(right.plantName, "sv-SE") ||
        left.type.localeCompare(right.type),
    );
}

export function groupBasePlanActivitiesByMonth(activities: BasePlanActivityView[], options: { includeEmptyMonths?: boolean } = {}) {
  const includeEmptyMonths = options.includeEmptyMonths ?? true;

  return swedishMonths
    .map((name, index) => ({
      index: index + 1,
      name,
      items: activities.filter((activity) => monthsForBasePlanPeriod(activity.period).includes(index + 1)),
    }))
    .filter((group) => includeEmptyMonths || group.items.length > 0);
}
