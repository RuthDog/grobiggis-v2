import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("App Shell logo owns the home route and Start is not duplicated in primary navigation", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /function LogoMark/);
  assert.match(shell, /href="\/"/);
  assert.doesNotMatch(shell, /label: "Start"/);
  assert.doesNotMatch(shell, /href: "\/"/);
});

test("desktop navigation keeps primary routes compact and groups secondary routes under Mer", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /const primaryNavigation/);
  assert.match(shell, /href: "\/idag"[\s\S]*label: "Idag"/);
  assert.match(shell, /href: "\/min-plan"[\s\S]*label: "Min plan"/);
  assert.match(shell, /href: "\/mina-odlingar"[\s\S]*label: "Odlingar"/);
  assert.match(shell, /href: "\/vaxtbibliotek"[\s\S]*label: "Växtbibliotek"/);
  assert.match(shell, /const secondaryNavigation/);
  assert.match(shell, /href: "\/vader"[\s\S]*label: "Väder"/);
  assert.match(shell, /href: "\/inkopslista"[\s\S]*label: "Inköpslista"/);
  assert.match(shell, /href: "\/tips"[\s\S]*label: "Tips & kunskap"/);
  assert.match(shell, /DesktopExploreMenu/);
  assert.match(shell, /Mer/);
});

test("mobile header stays compact and mobile bottom navigation carries the main destinations", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /function MobileHeader/);
  assert.match(shell, /min-h-\[68px\]/);
  assert.match(shell, /md:hidden/);
  assert.match(shell, /function MobileBottomNav/);
  assert.match(shell, /fixed inset-x-0 bottom-0/);
  assert.match(shell, /env\(safe-area-inset-bottom\)/);
  assert.match(shell, /const mobilePrimaryNavigation/);
  assert.match(shell, /Idag/);
  assert.match(shell, /Min plan/);
  assert.match(shell, /Odlingar/);
  assert.match(shell, /Utforska/);
});

test("Utforska contains the secondary mobile destinations without dead routes", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /const mobileExploreNavigation/);
  assert.match(shell, /href: "\/vaxtbibliotek"[\s\S]*label: "Växtbibliotek"/);
  assert.match(shell, /href: "\/vader"[\s\S]*label: "Väder"/);
  assert.match(shell, /href: "\/inkopslista"[\s\S]*label: "Inköpslista"/);
  assert.match(shell, /href: "\/tips"[\s\S]*label: "Tips & kunskap"/);
  assert.doesNotMatch(shell, /href="\/om"|href="\/integritet"|href="\/kontakt"/);
});

test("account navigation is a menu and does not expose email permanently in main navigation", () => {
  const authNav = read("src/components/AuthNav.tsx");

  assert.match(authNav, /useSession/);
  assert.match(authNav, /signOut/);
  assert.match(authNav, /href="\/profil"/);
  assert.match(authNav, /Profil/);
  assert.match(authNav, /href="\/logga-in"/);
  assert.match(authNav, /aria-expanded=\{open\}/);
  assert.match(authNav, /aria-haspopup="menu"/);
  assert.match(authNav, /Escape/);
  assert.match(authNav, /pointerdown/);
  assert.match(authNav, /truncate/);
  assert.doesNotMatch(authNav, /flex flex-wrap items-center gap-2/);
});

test("footer is real page content and only uses existing routes", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /function AppFooter/);
  assert.match(shell, /Din odling, lite enklare\./);
  assert.match(shell, /2026 Grobiggis/);
  assert.doesNotMatch(shell, /Om Grobiggis|Integritet|Kontakt/);
});

test("active route helpers cover child routes and secondary explore routes", () => {
  const shell = read("src/components/AppShell.tsx");

  assert.match(shell, /function isRouteActive\(pathname: string, href: string\)/);
  assert.match(shell, /pathname\.startsWith\(`\$\{href\}\/`\)/);
  assert.match(shell, /const exploreActive = secondaryNavigation\.some/);
  assert.match(shell, /const exploreActive = mobileExploreNavigation\.some/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
});

test("Version 4.0A shell does not touch auth, push, candidates, schema or background delivery", () => {
  const shell = read("src/components/AppShell.tsx");
  const authNav = read("src/components/AuthNav.tsx");
  const schema = read("src/db/schema.ts");
  const notificationService = read("src/lib/notification-infrastructure/service.ts");

  assert.doesNotMatch(`${shell}\n${authNav}`, /PushManager|NotificationCandidate|notification_delivery_log|VAPID|db\.|INSERT|UPDATE|DELETE/i);
  assert.doesNotMatch(`${shell}\n${authNav}`, /Cron|Queue|scheduler|background evaluator|scheduled/i);
  assert.match(schema, /notification_delivery_log/);
  assert.match(notificationService, /sendNotificationCandidateForUser/);
});
