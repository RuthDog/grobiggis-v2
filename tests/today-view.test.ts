import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { GrowingBatch } from "../src/domain/growing-types.ts";
import { buildTodayViewFromBatches, classifyTodayActivities, type TodayActivity } from "../src/domain/today-view.ts";
import { localGreeting, stockholmDateISO } from "../src/domain/greeting.ts";
import { loadTodayViewForUser } from "../src/lib/growing/today.ts";
import type { GrowingBatchRepository } from "../src/repositories/growing-batch-repository.ts";

class MemoryGrowingBatchRepository implements GrowingBatchRepository {
  readonly rows = new Map<string, { userId: string; batch: GrowingBatch }>();

  async create(userId: string, batch: GrowingBatch) {
    return this.createForUser(userId, batch);
  }
  async createForUser(userId: string, batch: GrowingBatch) {
    const snapshot = structuredClone(batch);
    this.rows.set(snapshot.id, { userId, batch: snapshot });
    return structuredClone(snapshot);
  }
  async getByIdForUser(userId: string, batchId: string) {
    const stored = this.rows.get(batchId);
    if (!stored || stored.userId !== userId) return null;
    return structuredClone(stored.batch);
  }
  async listForUser(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId).map((row) => structuredClone(row.batch));
  }
  async save(userId: string, batch: GrowingBatch) {
    return this.saveForUser(userId, batch);
  }
  async saveForUser(userId: string, batch: GrowingBatch) {
    this.rows.set(batch.id, { userId, batch: structuredClone(batch) });
    return structuredClone(batch);
  }
  async complete(userId: string, batchId: string, completedAt: string) {
    return this.completeForUser(userId, batchId, completedAt);
  }
  async completeForUser(userId: string, batchId: string, completedAt: string) {
    const existing = await this.getByIdForUser(userId, batchId);
    if (!existing) return null;
    return this.saveForUser(userId, batchId ? { ...existing, status: "completed", completedAt } : existing);
  }
}

const batch = (patch: Partial<GrowingBatch> = {}): GrowingBatch => ({
  id: "batch-a",
  plantId: "tomat",
  variety: "Sungold",
  startType: "seed",
  startDate: "2026-03-10",
  status: "active",
  actualEvents: [],
  ...patch,
});

const activity = (patch: Partial<TodayActivity> = {}): TodayActivity => ({
  id: "today:a",
  batchId: "batch-a",
  plantId: "tomat",
  plantName: "Tomat",
  batchName: "Tomat · Sungold",
  batchStartLabel: "Startad 1 augusti",
  title: "Skord",
  from: "2026-08-09",
  to: "2026-08-09",
  dateLabel: "9 augusti",
  reason: "Beraknat fran startdatum.",
  href: "/min-plan/batch-a",
  ...patch,
});

test("Idag requires a verified session for personal data", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await assert.rejects(() => loadTodayViewForUser(repository, { id: "" }), /Authentication required/i);
});

test("only the verified user's batches are used", async () => {
  const repository = new MemoryGrowingBatchRepository();
  await repository.createForUser("user-a", batch({ id: "a", startDate: "2026-07-22" }));
  await repository.createForUser("user-b", batch({ id: "b", startDate: "2026-01-01" }));

  const view = await loadTodayViewForUser(repository, { id: "user-a" }, new Date("2026-08-09T10:00:00Z"));
  assert.equal(view.activeBatchCount, 1);
  assert.ok(view.today.every((item) => item.batchId === "a"));
});

test("completed batches produce no pending Idag activities", () => {
  const view = buildTodayViewFromBatches([batch({ status: "completed", completedAt: "2026-08-01", startDate: "2026-07-22" })], new Date("2026-08-09T10:00:00Z"));
  assert.deepEqual(view.sections, { today: [], now: [], next: [] });
});

test("two batches of the same plant remain separate", () => {
  const view = buildTodayViewFromBatches(
    [batch({ id: "batch-a", variety: "A", startDate: "2026-07-22" }), batch({ id: "batch-b", variety: "B", startDate: "2026-07-23" })],
    new Date("2026-08-09T10:00:00Z"),
  );
  const ids = new Set([...view.sections.today, ...view.sections.now, ...view.sections.next].map((item) => item.batchId));
  assert.deepEqual([...ids].sort(), ["batch-a", "batch-b"]);
});

test("activity links to the correct batch detail", () => {
  const view = buildTodayViewFromBatches([batch({ id: "batch-a", startDate: "2026-07-22" })], new Date("2026-08-09T10:00:00Z"));
  assert.equal(view.sections.today[0]?.href, "/min-plan/batch-a");
});

test("an exact same-day activity lands in Idag", () => {
  const sections = classifyTodayActivities([activity()], "2026-08-09");
  assert.deepEqual(sections.today.map((item) => item.id), ["today:a"]);
});

test("a date range that includes today lands in Idag", () => {
  const sections = classifyTodayActivities([activity({ from: "2026-08-07", to: "2026-08-10" })], "2026-08-09");
  assert.deepEqual(sections.today.map((item) => item.id), ["today:a"]);
});

test("a future activity lands in Harnast", () => {
  const sections = classifyTodayActivities([activity({ from: "2026-08-12", to: "2026-08-15" })], "2026-08-09");
  assert.deepEqual(sections.next.map((item) => item.id), ["today:a"]);
});

test("Harnast is sorted chronologically", () => {
  const sections = classifyTodayActivities(
    [activity({ id: "c", from: "2026-08-14", to: "2026-08-14" }), activity({ id: "a", from: "2026-08-10", to: "2026-08-10" }), activity({ id: "b", from: "2026-08-11", to: "2026-08-11" })],
    "2026-08-09",
  );
  assert.deepEqual(sections.next.map((item) => item.id), ["a", "b", "c"]);
});

test("Harnast is limited to the intended number of items", () => {
  const sections = classifyTodayActivities(
    [
      activity({ id: "a", from: "2026-08-10", to: "2026-08-10" }),
      activity({ id: "b", from: "2026-08-11", to: "2026-08-11" }),
      activity({ id: "c", from: "2026-08-12", to: "2026-08-12" }),
      activity({ id: "d", from: "2026-08-13", to: "2026-08-13" }),
    ],
    "2026-08-09",
    3,
  );
  assert.deepEqual(sections.next.map((item) => item.id), ["a", "b", "c"]);
});

test("active batches with no current work still show a calm path forward", () => {
  const view = buildTodayViewFromBatches([batch({ startDate: "2026-08-09" })], new Date("2026-08-09T10:00:00Z"));
  assert.equal(view.activeBatchCount, 1);
  assert.equal(view.sections.today.length, 0);
  assert.ok(view.sections.next.length > 0);
});

test("date-only logic uses Europe/Stockholm around midnight", () => {
  assert.equal(stockholmDateISO(new Date("2026-08-08T22:30:00Z")), "2026-08-09");
  assert.equal(stockholmDateISO(new Date("2026-01-15T23:30:00Z")), "2026-01-16");
});

test("Europe/Stockholm greeting follows the intended day-part boundaries", () => {
  assert.equal(localGreeting(new Date("2026-08-09T03:00:00Z")).heading, "God morgon");
  assert.equal(localGreeting(new Date("2026-08-09T09:30:00Z")).heading, "God formiddag");
  assert.equal(localGreeting(new Date("2026-08-09T14:00:00Z")).heading, "God eftermiddag");
  assert.equal(localGreeting(new Date("2026-08-09T18:00:00Z")).heading, "God kvall");
});

test("the Idag page keeps the read-only empty states and login path", () => {
  const source = readFileSync("src/app/idag/page.tsx", "utf8");
  assert.match(source, /\/logga-in/);
  assert.match(source, /Du har inga aktiva odlingar just nu/);
  assert.match(source, /Det finns inget som behover goras just idag/);
});

test("the Idag view is linked from navigation and the logged-in home CTA", () => {
  const shell = readFileSync("src/components/AppShell.tsx", "utf8");
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert.match(shell, /href: "\/idag"/);
  assert.match(home, /\/idag/);
});
