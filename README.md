# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 2.3 innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, Växtbibliotek, Tips & kunskap, Better Auth med magic link, en separat extern Cloudflare D1-databas och D1-persistens för Min plan.

V2 använder Better Auth `user.id` som enda ägarskapsnyckel för sparade odlingsomgångar. Server actions verifierar sessionen server-side innan de läser eller skriver `growing_batches` och `growing_events`. Ingen anonym persistens, localStorage eller gammal användarmigrering används. `v2.grobiggis.se` är testmiljön för den nya versionen.

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

## Version 2.3

Version 2.3 är verifierad lokalt och redo för separat godkänd deployment. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`

Version 1.1 migrerar 8 granskade guider till statiska artikelsidor under `/tips`. Tips & kunskap har lokal sökning, kategorifilter, källredovisning och relaterade guider baserade på befintlig kategori- och växtmetadata.

Version 1.2 etablerar ren domänlogik för växt → odlingsomgång → starttyp/startdatum → planhändelser → status → avslut → historik. Den innehåller planlogik, svensk planpresentation, Today/task visibility, fysisk placement-separation och testad batch-isolering. Versionen har fortfarande ingen användarpersistens, databas eller auth.

Version 1.3 gör domänmotorn användbar i ett första UI-flöde: användaren kan starta en odlingsomgång från Växtbiblioteket, skapa flera omgångar av samma växt, se dem i Min plan, öppna en batchdetalj, visa planen och avsluta en omgång utan att påverka andra. State är sessionsbaserat in-memory och ingen permanent persistens, auth, databas eller API finns ännu.

Version 2.0 etablerar lokal D1/Drizzle-persistens för odlingsomgångar. Datamodellen innehåller `growing_batches` och `growing_events`, där `growing_events` lagrar faktiska historikhändelser (`actualEvents`) kopplade till en batch. Framtida beräknade planhändelser sparas inte, eftersom planmotorn kan rekonstruera dem från batchens fakta och växtkatalogens regler. Repositorylagret är användarscopeat via `userId` och innehåller ingen global lookup via enbart batch-id.

Version 2.1 skapar den separata externa Cloudflare D1-databasen `grobiggis-v2-db` och kopplar den till den befintliga Workern `grobiggis-v2` med bindingen `DB`. Migrationen `0000_lying_scrambler.sql` är applicerad remote och remote-databasen innehåller `growing_batches`, `growing_events` och D1:s migrationsmetadata. Ingen gammal Grobiggis-data har migrerats, ingen auth har skapats och appens UI använder fortfarande enbart in-memory state.

Version 2.2 etablerar ett enda authsystem för V2 med Better Auth `1.6.26`, samma V2-D1 (`grobiggis-v2-db`) och magic-link som enda inloggningsmetod. Auth-tabellerna är `user`, `session`, `account` och `verification`, separata från `growing_batches` och `growing_events`. Lokalt fångas magic links i en dev-only transport. Produktion kräver fortfarande `BETTER_AUTH_SECRET` och en riktig emailtransport innan magic-link kan skickas säkert från `v2.grobiggis.se`. Inga legacy-användare, Sites-sessioner eller gamla identiteter har migrerats.

Version 2.2B färdigställer integrationsgränsen för production magic-link-email. Better Auths `sendMagicLink` anropar Grobiggis emailtransport, som i production använder Resends REST API med `RESEND_API_KEY` och `AUTH_EMAIL_FROM`. Providerfel saneras innan de lämnar transporten, och production loggar aldrig API key, token eller magic-link-URL. Resend-provider, domain verification, DNS, Cloudflare secrets och Worker deployment kräver separata godkännanden.

Version 2.3 gör Min plan persistent för inloggade användare. Skapa, lista, detaljvisa och avsluta odlingsomgångar går via server actions som hämtar verifierad Better Auth-session och använder sessionens `user.id` mot `GrowingBatchRepository`. Klienten skickar bara växt, sort, starttyp och startdatum vid skapande, aldrig `userId`, id eller status. Framtida calculated planhändelser sparas inte i D1; de rekonstrueras från batchens fakta och växtkatalogens regler vid laddning. Faktiska historikhändelser och avslutad status läses från D1. Min plan använder inte localStorage, sessionStorage, IndexedDB, anonym persistens eller gamla Grobiggis-användare.

## Version 2.6 local foundation

Version 2.6 etablerar en lokal, user-scopad datagrund for Mina odlingar utan publikt UI. Den lagger till `growing_spaces` for anvandarens odlingsytor och `plant_placements` for fysisk placering av odlingsomgangar pa ytor. Placering kopplas till `batch_id`, inte bara vaxt, sa tva omgangar av samma vaxt kan placeras separat.

Odlingsomgang och fysisk placering ar fortsatt separata saker: en completed batch behaller sin placement tills anvandaren uttryckligen valjer att frigora plats. Version 2.6 anvander soft removal via `removed_at`, vilket gor att aktiva listor kan filtrera bort frigjorda platser samtidigt som historiken finns kvar. En batch far ha hogst en aktiv placement, medan en odlingsyta kan ha flera aktiva batchplacements.

Migration `0002_*` ar avsedd som lokal grund tills remote migration godkanns separat. Den ska endast skapa `growing_spaces`, `plant_placements`, deras index och FK:er. Ingen navigation, ingen `/mina-odlingar`-route och ingen Worker-deploy ingar i 2.6-grunden.
## Version 2.9 - Inkopslista

- En enkel personlig inkopslista dar varje rad sparar `plantId` mot den statiska katalogen.
- Listan ar user-scoped i D1 och bygger inte pa localStorage, sessionStorage eller anonym persistence.
- Modellen innehaller bara `id`, `userId`, `plantId` och `createdAt`.
- Version 2.9 introducerar ingen forradsmodell och lagger inte till quantity, price, store eller annan inkopsmetadata.
- Migration `0003_*` ska vara lokal tills remote-korning uttryckligen godkants.

## Version 3.0 - Profil och platsgrund

- En minimal personlig profil sparar `firstName` och `locality` for den inloggade Better Auth-anvandaren.
- Profilen ar user-scoped i D1 med exakt en `user_profiles`-rad per `user.id`.
- Tabellen har nullable `latitude` och `longitude` for framtida ort-resolver, men Version 3.0 gor ingen geocoding.
- Version 3.0 bygger inget vader, ingen vaxtzon, ingen notifiering och lagrar ingen exakt adress.
- Migration `0004_*` ska vara lokal tills remote-korning uttryckligen godkants.

## Version 3.1 - Verifierad odlingsplats

- Profilens odlingsort kan verifieras via Open-Meteo Geocoding API pa servern.
- Sokning sker bara nar anvandaren uttryckligen valjer `Sok ort`, inte vid varje tangenttryckning.
- Open-Meteo-anropet anvander `name`, `count=5`, `language=sv`, `countryCode=SE` och `format=json`.
- Providerformatet mappas till en Grobiggis-kandidat innan det nar UI eller profilsparning.
- Anvandaren maste valja en kandidat innan `latitude` och `longitude` sparas.
- Servern validerar vald kandidat, accepterar bara `countryCode=SE` och sparar endast `locality`, `countryCode`, `latitude` och `longitude`.
- Servern gor ingen extra provider-resolve vid save i Version 3.1; vald kandidat ar transient och valideras strikt innan minimal profildata sparas.
- Om `locality` andras utan ny vald kandidat rensas tidigare `latitude` och `longitude`.
- `latitude != null && longitude != null` betyder att orten har en verifierad geografisk punkt.
- Version 3.1 bygger inget vader, ingen SMHI-integration, ingen browser geolocation och ingen ny DB-migration.

## Version 3.2 - Vadergrund och prognosmotor

- Vader hamtas server-side fran Open-Meteo Forecast API med profilens verifierade `latitude` och `longitude` som enda kalla.
- Klienten far inte skicka egna koordinater och `/vader` anvander inga `lat`/`lon` query params.
- Forecast-responsen normaliseras till en providerneutral Grobiggis `WeatherForecast` innan den nar UI.
- Requesten anvander `current`, `daily` och en minimal hourly-serie for att inte blockera nasta frostlager.
- UI visar nuvarande vader och fem kommande dagar for den verifierade odlingsorten.
- Open-Meteo-data cacheas via Next fetch revalidation i 20 minuter. Ingen KV-, D1- eller cron-cache skapas.
- Prognoser sparas inte i D1. Version 3.2 skapar ingen `weather_forecasts`-tabell, ingen forecast history och ingen alertmodell.
- Version 3.2 bygger ingen frostvakt, torkvakt, bevattningsrad, varmevarning, push eller notifieringsmotor.
- Open-Meteos fria/open-access endpoint anvands for V2/prototyp/icke-kommersiell drift. Innan monetarisering eller kommersiell lansering maste prognoslagret byta till licensierad/customer endpoint med API key eller annan kommersiellt tillaten vaderprovider.
- Vaderdomanen och UI ar providerneutrala sa att valet kan bytas i provider/configlagret.
- UI visar diskret attribution till Open-Meteo dar vaderdata visas.
