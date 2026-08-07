# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 2.0 innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, Växtbibliotek, Tips & kunskap, det första interaktiva odlingsflödet och en lokal D1/Drizzle-grund för kommande serverpersistens.

V2 har fortfarande ingen auth, inga API-routes och inget UI-flöde som skriver till databasen. Odlingsomgångar i appen ligger fortsatt i webbläsarens minne och försvinner vid omladdning. Version 2.0 lägger endast grunden för lokal D1-persistens, med migrationsfiler och ett användarscopeat repositorylager. `v2.grobiggis.se` är testmiljön för den nya versionen.

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

Kör tester:

```powershell
npm run test
```

Bygg produktionen lokalt:

```powershell
npm run build
```

Bygg OpenNext-versionen lokalt:

```powershell
npm run build:cf
```

Generera Drizzle-migrationer för lokal D1:

```powershell
npm run db:generate
```

Applicera migrationer mot Wranglers lokala D1:

```powershell
npm run db:migrate:local
```

`wrangler.d1-local.jsonc` används enbart för lokal D1-utveckling. Ingen extern D1-databas skapas av dessa scripts och inga remote-migrationer ska köras för Version 2.0.

## Version 2.0

OpenNext-builden och Cloudflare Workers-deploymenten är verifierade. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`

Version 1.1 migrerar 8 granskade guider till statiska artikelsidor under `/tips`. Tips & kunskap har lokal sökning, kategorifilter, källredovisning och relaterade guider baserade på befintlig kategori- och växtmetadata.

Version 1.2 etablerar ren domänlogik för växt → odlingsomgång → starttyp/startdatum → planhändelser → status → avslut → historik. Den innehåller planlogik, svensk planpresentation, Today/task visibility, fysisk placement-separation och testad batch-isolering. Versionen har fortfarande ingen användarpersistens, databas eller auth.

Version 1.3 gör domänmotorn användbar i ett första UI-flöde: användaren kan starta en odlingsomgång från Växtbiblioteket, skapa flera omgångar av samma växt, se dem i Min plan, öppna en batchdetalj, visa planen och avsluta en omgång utan att påverka andra. State är sessionsbaserat in-memory och ingen permanent persistens, auth, databas eller API finns ännu.

Version 2.0 etablerar lokal D1/Drizzle-persistens för odlingsomgångar. Datamodellen innehåller `growing_batches` och `growing_events`, där `growing_events` lagrar faktiska historikhändelser (`actualEvents`) kopplade till en batch. Framtida beräknade planhändelser sparas inte, eftersom planmotorn kan rekonstruera dem från batchens fakta och växtkatalogens regler. Repositorylagret är användarscopeat via `userId` och innehåller ingen global lookup via enbart batch-id.
