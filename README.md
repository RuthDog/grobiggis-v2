# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 2.2 innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, Växtbibliotek, Tips & kunskap, det första interaktiva odlingsflödet, en lokal D1/Drizzle-grund, en separat extern Cloudflare D1-databas och ett Better Auth-fundament för e-post/magic link. Version 2.2B förbereder production-email via Resend utan att aktivera externa credentials, DNS eller deployment.

V2 har fortfarande inget UI-flöde som skriver odlingsdata till databasen. Odlingsomgångar i appen ligger fortsatt i webbläsarens minne och försvinner vid omladdning. Version 2.2 lägger autharkitektur ovanpå Version 2.1: ett Better Auth `user.id`, en sessionstyp och magic-link som vald authmetod. Produktions-email och production secret är ännu inte aktiverade. `v2.grobiggis.se` är testmiljön för den nya versionen.

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

Applicera migrationer mot den externa D1-databasen:

```powershell
npm run db:migrate:remote
```

`wrangler.d1-local.jsonc` används enbart för lokal D1-utveckling. Lokal och remote D1 är separata. Remote-migrationer ska alltid köras med ett kommando där `--remote` är explicit.

### Auth email

Production magic-link-email är förberett för Resend via REST-anrop till Resends HTTPS API. Inget Resend-konto, ingen API-nyckel, ingen avsändardomän och ingen DNS är skapad i detta repository.

Kommande production-konfiguration kräver:

- `BETTER_AUTH_SECRET` som Cloudflare secret.
- `RESEND_API_KEY` som Cloudflare secret.
- `AUTH_EMAIL_FROM` som icke-hemlig avsändarkonfiguration, till exempel efter beslut och domänverifiering.

Secrets får aldrig committas. Lokal utveckling använder fortsatt en dev-only transport som fångar magic links i minnet. Production failar stängt om `BETTER_AUTH_SECRET`, `RESEND_API_KEY` eller `AUTH_EMAIL_FROM` saknas.

Rekommenderad Resend sending domain är en separat subdomän för konto-/authmail, till exempel `auth.grobiggis.se`, med framtida avsändare `GroBiggis <login@auth.grobiggis.se>`. Nästa externa steg är att skapa/verifiera domänen i Resend och lägga de DNS-poster Resend genererar, innan secrets och Worker-deploy hanteras separat.

## Version 2.2

Version 2.2 är verifierad lokalt och redo för separat granskad remote-migration. Version 2.1 är fortsatt deployad på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`

Version 1.1 migrerar 8 granskade guider till statiska artikelsidor under `/tips`. Tips & kunskap har lokal sökning, kategorifilter, källredovisning och relaterade guider baserade på befintlig kategori- och växtmetadata.

Version 1.2 etablerar ren domänlogik för växt → odlingsomgång → starttyp/startdatum → planhändelser → status → avslut → historik. Den innehåller planlogik, svensk planpresentation, Today/task visibility, fysisk placement-separation och testad batch-isolering. Versionen har fortfarande ingen användarpersistens, databas eller auth.

Version 1.3 gör domänmotorn användbar i ett första UI-flöde: användaren kan starta en odlingsomgång från Växtbiblioteket, skapa flera omgångar av samma växt, se dem i Min plan, öppna en batchdetalj, visa planen och avsluta en omgång utan att påverka andra. State är sessionsbaserat in-memory och ingen permanent persistens, auth, databas eller API finns ännu.

Version 2.0 etablerar lokal D1/Drizzle-persistens för odlingsomgångar. Datamodellen innehåller `growing_batches` och `growing_events`, där `growing_events` lagrar faktiska historikhändelser (`actualEvents`) kopplade till en batch. Framtida beräknade planhändelser sparas inte, eftersom planmotorn kan rekonstruera dem från batchens fakta och växtkatalogens regler. Repositorylagret är användarscopeat via `userId` och innehåller ingen global lookup via enbart batch-id.

Version 2.1 skapar den separata externa Cloudflare D1-databasen `grobiggis-v2-db` och kopplar den till den befintliga Workern `grobiggis-v2` med bindingen `DB`. Migrationen `0000_lying_scrambler.sql` är applicerad remote och remote-databasen innehåller `growing_batches`, `growing_events` och D1:s migrationsmetadata. Ingen gammal Grobiggis-data har migrerats, ingen auth har skapats och appens UI använder fortfarande enbart in-memory state.

Version 2.2 etablerar ett enda authsystem för V2 med Better Auth `1.6.26`, samma V2-D1 (`grobiggis-v2-db`) och magic-link som enda inloggningsmetod. Auth-tabellerna är `user`, `session`, `account` och `verification`, separata från `growing_batches` och `growing_events`. Lokalt fångas magic links i en dev-only transport. Produktion kräver fortfarande `BETTER_AUTH_SECRET` och en riktig emailtransport innan magic-link kan skickas säkert från `v2.grobiggis.se`. Inga legacy-användare, Sites-sessioner eller gamla identiteter har migrerats.

Version 2.2B färdigställer integrationsgränsen för production magic-link-email. Better Auths `sendMagicLink` anropar Grobiggis emailtransport, som i production använder Resends REST API med `RESEND_API_KEY` och `AUTH_EMAIL_FROM`. Providerfel saneras innan de lämnar transporten, och production loggar aldrig API key, token eller magic-link-URL. Resend-provider, domain verification, DNS, Cloudflare secrets och Worker deployment kräver separata godkännanden.
