import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("/mina-odlingar is a session-backed personal route", () => {
  const source = read("src/app/mina-odlingar/page.tsx");

  assert.match(source, /getCurrentUserGrowingSpaces/);
  assert.match(source, /getCurrentUserGrowingBatches/);
  assert.match(source, /\/logga-in/);
  assert.match(source, /Du behöver logga in/);
});

test("unauthenticated Mina odlingar state does not render personal space data", () => {
  const source = read("src/app/mina-odlingar/page.tsx");

  assert.match(source, /if \(!spaces \|\| !batches\)/);
  assert.match(source, /if \(!spaces \|\| !batches\) \{[\s\S]*href="\/logga-in"[\s\S]*\n  \}/);
});

test("Mina odlingar is reachable from primary navigation", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /href: "\/mina-odlingar"/);
  assert.match(shell, /Mina odlingar/);
  assert.match(shell, /flex flex-wrap gap-1\.5 sm:gap-2/);
});

test("create space UI sends only name and type to the server action", () => {
  const source = read("src/components/CreateGrowingSpaceDialog.tsx");

  assert.match(source, /createGrowingSpaceAction\(\{ name, type \}\)/);
  assert.doesNotMatch(source, /userId/);
  assert.match(source, /Pallkragen vid altanen/);
  assert.match(source, /maxLength=\{80\}/);
});

test("place batch UI sends only identifiers and excludes already placed batches in the page model", () => {
  const page = read("src/app/mina-odlingar/page.tsx");
  const dialog = read("src/components/PlaceBatchDialog.tsx");

  assert.match(page, /batch\.status === "active" && !placedBatchIds\.has\(batch\.id\)/);
  assert.match(dialog, /placeBatchInSpaceAction\(\{ spaceId, batchId \}\)/);
  assert.doesNotMatch(dialog, /userId/);
  assert.match(dialog, /Du har inga odlingsomgångar som kan placeras/);
});

test("placed batch card keeps completed placement visible and separate from release", () => {
  const source = read("src/components/PlacedBatchCard.tsx");

  assert.match(source, /batch\.status === "completed"/);
  assert.match(source, /Avslutad odling som fortfarande står kvar/);
  assert.match(source, /ReleasePlacementControl/);
  assert.match(source, /\/min-plan\/\$\{item\.batch\.id\}/);
});

test("release placement UI confirms and calls release action without touching batch status", () => {
  const source = read("src/components/ReleasePlacementControl.tsx");

  assert.match(source, /window\.confirm/);
  assert.match(source, /releasePlantPlacementAction\(placementId\)/);
  assert.doesNotMatch(source, /completeGrowingBatchAction|createGrowingBatchAction|status/);
});

test("space actions revalidate Mina odlingar and keep server actions thin", () => {
  const actions = read("src/lib/growing/actions.ts");
  const server = read("src/lib/growing/server.ts");

  assert.match(actions, /createGrowingSpaceAction/);
  assert.match(actions, /placeBatchInSpaceAction/);
  assert.match(actions, /releasePlantPlacementAction/);
  assert.match(actions, /revalidatePath\("\/mina-odlingar"\)/);
  assert.match(server, /requireUser\(\)/);
  assert.match(server, /createGrowingSpaceForUser/);
  assert.match(server, /placeBatchInSpaceForUser/);
  assert.match(server, /releasePlantPlacementForUser/);
});
