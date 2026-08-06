# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 0 etablerar en ren lokal teknisk grund med Next.js, TypeScript, App Router, Tailwind CSS, ESLint och npm. Syftet är att verifiera att den nya applikationen kan installeras, lintas och byggas lokalt innan någon vidare produktfunktionalitet läggs till.

## Lokal utveckling

Krav:

- Node.js
- npm

Installera beroenden:

```powershell
npm install
```

Starta utvecklingsservern:

```powershell
npm run dev
```

Kör lint:

```powershell
npm run lint
```

Bygg produktionen lokalt:

```powershell
npm run build
```

## Avgränsning för Version 0

Version 0 innehåller inte OpenNext, Cloudflare, Wrangler, Workers, workers.dev, D1 eller någon annan databas. Den innehåller inte auth, API-routes, produktinriktade server actions, externa tjänster, miljövariabler eller secrets.

Ingen deploymentkonfiguration ingår i detta steg.
