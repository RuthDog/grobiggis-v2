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

## Version 3.3 - Frostvakt

- Frostvakt ar ett harlett beslutsstod ovanpa verifierad profilplats, providerneutral `WeatherForecast.hourly` och anvandarens aktiva `GrowingBatch`.
- Bedomningen sparas inte i D1, skapar inga `growing_events`, inga weather snapshots, ingen alert history och ingen notifierings-/pushmotor.
- Nattfonstret ar Europe/Stockholm och definieras som kommande eller pagaende natt 18:00-09:00. Fore 09:00 analyseras pagaende natt fran foregaende kvall; fran 09:00 analyseras kommande natt.
- SMHI anvands for frostprincipen: frost nar temperaturen gar under 0 C, samtidigt som mark och vegetation kan bli kallare an 2m-lufttemperatur.
- RHS anvands for forsiktig markfrostrisk och varmealskande koksvaxter: markfrost kan forekomma nar nattluften ligger runt 1-4 C, och exempelvis tomat, paprika, basilika och cucurbits mar battre nar natter ar over 10 C.
- CSU Extension anvands som extra stod for tomat: tomat ar frostkanslig och paverkas negativt av kalla temperaturer.
- Frostnivaerna ar: `frost` vid prognostiserad 2m-temperatur under 0 C, `near_frost` vid 0-4 C, `cold_night` vid under 10 C for varmealskande profiler och `none` nar ingen tydlig risk syns i prognosen.
- Cold profiles finns i `src/data/plant-cold-profiles.ts` och ar kopplade via stabilt `plantId`, inte via switch/case i frostmotorn.
- Version 3.3 klassificerar endast valgrundade forsta vaxter: `tomat`, `korsbarstomat`, `chili`, `paprika`, `gurka`, `zucchini`, `pumpa`, `buskbona` och `basilika`.
- Frostvakten antar inte att `greenhouse`, `pot` eller annan placering ar frostfri. UI uttrycker darfor "om plantan star ute eller oskyddat" och mikroklimat/placering kan ge annan faktisk temperatur.
- Om verifierad plats saknas eller vaderprovider fallerar visas ingen falsk "ingen frostrisk"; unknown weather behandlas som unavailable.

## Version 3.4 - Bevattningskoll

- Bevattningskoll ar vaderbaserat beslutsstod for att se om aktiva odlingar bor kontrolleras for uttorkning eller bevattningsbehov.
- Grobiggis mater inte faktisk jordfuktighet och vet inte jordtyp, krukstorlek, skugga, nar anvandaren senast vattnade eller hur mycket vatten som gavs.
- WeatherForecast utokas providerneutralt med daglig `referenceEvapotranspiration` och `isPast`; Open-Meteos ra falt `et0_fao_evapotranspiration` stannar i adaptern.
- Open-Meteo-requesten behaller befintliga vaderfalt och lagger endast till daglig ET0 samt `past_days=3` for ett kort senaste-dagarna-fonster.
- FAO-56/FAO AQUASTAT anvands for tolkningen: ET0 ar referensevapotranspiration for en standardiserad valvattnad yta. Verkligt grodbehov kraver bland annat Kc, utvecklingsstadium, nederbord, markvatten och odlingsforhallanden.
- Bevattningskoll gor darfor inte `ET0 - precipitation` till ett faktiskt bevattningsbehov och visar inga liter- eller doseringsrad.
- Reglerna kombinerar lite nederbord de senaste dagarna, lag prognostiserad nederbord nara framat, forhojd ET0-signal, hog dagstemperatur, PlantWaterProfile och forsiktig placement-kontext.
- `pot` kan ge extra uppmarksamhet eftersom krukor och containers enligt RHS oftare riskerar att torka ut. `greenhouse`, `raised_bed` och `open_ground` far ingen automatisk torrhetsfaktor i 3.4.
- PlantWaterProfile finns for forsta kallbelagda gruppen: `tomat`, `korsbarstomat`, `gurka`, `zucchini`, `pumpa`, `chili`, `paprika`, `basilika`, `sallat` och `buskbona`.
- RHS, Utah State University Extension, Iowa State University Extension och University of Minnesota Extension anvands for vattenprofilernas forsiktiga klassning.
- Om regn ar pa vag sager UI att det har varit torrt men att anvandaren ska kontrollera jorden innan vattning.
- Version 3.4 skapar ingen watering history, inga watering events, ingen water alert-tabell, ingen soil-moisture-modell, ingen varmevakt och ingen push/notifieringsmotor.

## Version 3.5 - Värmekoll

- Värmekoll är odlingsstöd för prognostiserad värme som är relevant för användarens aktiva odlingar, inte en allmän värmevarning för människor.
- WeatherForecast behöver ingen ny providerdata i 3.5. Daglig `temperatureMax` räcker för ett handlingsbart fönster: i dag och i morgon i Europe/Stockholm.
- PlantHeatProfile finns för första källbelagda gruppen: `sallat`, `tomat`, `korsbarstomat`, `chili`, `paprika`, `gurka`, `zucchini`, `pumpa` och `buskbona`.
- Basilika får ingen heat profile i 3.5 eftersom källstödet främst säger att basilika gillar värme och sol, inte en tydlig högtemperaturtröskel för odlingssignal.
- Trösklarna är försiktiga kategorier: sallat börjar vid cirka 27 °C, tomat/körsbärstomat vid 30 °C, gurka/zucchini/pumpa/chili/paprika vid 32 °C och buskböna vid 35 °C.
- Högre uppmärksamhet används först vid ännu varmare prognos: 30 °C för sallat, 32 °C för tomat/körsbärstomat, 35 °C för gurka/zucchini/pumpa/chili/paprika och 37 °C för buskböna.
- University of Minnesota Extension används för värmepåverkan på tomat, paprika, bönor, gurka och cucurbits; Utah State University Extension används för sallat och bladgrönt; RHS används för att dokumentera basilika som värmeälskande snarare än alertklassad.
- Växthusets faktiska temperatur mäts inte och räknas inte om från uteprognosen. UI kan bara ge försiktig ventilation-copy när en värmesignal redan finns.
- Kruka kan ge försiktig placeringscopy, men Bevattningskoll ansvarar fortsatt för jordfuktighet, nederbörd och ET0.
- Version 3.5 skapar ingen heat history, inga heat events, ingen heat alert-tabell, ingen notifieringsmotor och ingen push.

## Version 3.6 - Gemensamt signalsystem

- Frostvakt, Bevattningskoll och Värmekoll förblir separata expertmotorer med egna assessment-modeller.
- `GrobiggisSignal` är ett gemensamt produktkontrakt ovanpå assessmenterna för ytor som Idag, framtida Översikt och framtida notifieringslager.
- Signaler är härledda vid request och sparas inte i D1. Version 3.6 skapar ingen signal-tabell, ingen notification-tabell och ingen signalhistorik.
- `/idag` använder gemensamma signaler via `SignalCard`; `/vader` behåller Frostvakt, Bevattningskoll och Värmekoll som detaljkort.
- Varje väderassessment kan ge högst en sammanfattad signal. `none` och `unavailable` ger ingen vanlig odlingssignal.
- Signal-id är deterministiskt per typ och bedömningsfönster, exempelvis `weather:frost:<start>:<end>`, så framtida lager kan känna igen samma logiska signal utan att Version 3.6 behöver persistence.
- `SignalLevel` är produktprioritet: `important`, `attention` och `info`. Det är inte samma sak som assessmenternas interna nivåer.
- Alla vädersignaler länkar data-only till `/vader`; signalobjekt innehåller inga callbacks, sessioner, providerfält eller leveransstatus.
- Signal är inte notification delivery. Framtida push kräver separata val för preferenser, kanal, permission/subscription, schemaläggning, deduplicerad skickstatus och läs/avfärda-hantering.

## Version 3.7 - Signalpolicy och notification foundation

- Version 3.7 slutar vid `GrobiggisSignal[]` -> `NotificationPolicy` -> `NotificationCandidate[]`.
- `NotificationPolicy` är ett rent, härlett policylager som tar redan byggda signaler och avgör om de kan bli notifieringskandidater utan att läsa eller skriva databas.
- `NotificationCandidate` är data-only: `id`, `signalId`, `type`, `urgency`, `title`, `body`, `href`, `deduplicationKey`, `validFrom` och `validTo`.
- Policyn är konservativ i 3.7: `info` undertrycks, Frostvakt `important` blir `high`, nära Frostvakt `attention` kan bli `normal`, och Bevattningskoll/Värmekoll blir kandidater endast vid `important`.
- Tidsrelevans bedöms från signalernas `validFrom` och `validTo` med Europe/Stockholm-semantik. Frost `attention` måste ligga nära nog i tid för att bli kandidat.
- Dedupliceringsnyckeln bygger på signalens deterministiska id och kandidatens policytillstånd. Om samma signal eskalerar från `attention` till `important` får den därför en ny deduplication key utan sent-history i 3.7.
- Berörda växtetiketter dedupliceras endast i kandidaternas korta presentationstext. Underliggande `GrobiggisSignal.affectedBatches` är fortsatt fullständig och behåller alla `batchId`.
- `/idag` använder fortsatt `GrobiggisSignal[]` direkt och börjar inte konsumera `NotificationCandidate[]` i 3.7.
- `src/lib/notifications/server.ts` är en tunn serverintegration för framtida användning: verifierad användare och aktiva odlingar -> `getSignalsForUser` -> `buildNotificationCandidates`.
- Version 3.7 bygger ingen Web Push, service worker, VAPID, notification permission, subscription persistence, user preferences, sent/dedup history, quiet hours, frequency caps, scheduler, queue, cron, delivery worker eller notifieringskanal.
- Version 3.7 skapar ingen ny D1-tabell, ingen migration, ingen Cloudflare-resurs och ingen push-/notifieringsmotor. Framtida faktisk notification delivery kräver separat design för preferenser, kanal, behörighet/subscription, historik, deduplicering och frekvensregler.

## Version 3.8 - Notifieringsinfrastruktur

- Version 3.8 bygger bara persistent notifieringsinfrastruktur efter `NotificationCandidate[]`: user-scopade preferenser, framtida push-prenumerationer och deduplicerad leveranshistorik.
- Version 3.8 skickar ingen push, registrerar ingen service worker, frågar inte browsern om notification permission, använder inga VAPID-nycklar och skapar ingen scheduler, queue, cron eller delivery worker.
- Preferenser lagras normaliserat i `notification_preferences` med en rad per `user_id + signal_type`. Signaltyperna i 3.8 är `frost`, `watering` och `heat`.
- Ingen preference-rad betyder disabled. Migrationen skapar inga enabled-rader och ingen användare optas in automatiskt.
- Preference-UI:t på `/profil` säger uttryckligen att användaren förbereder vilka typer av odlingsnotiser den vill kunna få när pushnotiser aktiveras senare. Ett preference-val är inte samma sak som browser permission.
- Framtida browser-prenumerationer kan lagras i `push_subscriptions` med flera rader per användare. `endpoint` är globalt unik, men `user_id` är inte unikt eftersom en användare kan ha flera enheter eller browserprofiler.
- Push subscription-data (`endpoint`, `p256dh`, `auth`) behandlas som känslig delivery-data. Den visas inte i UI, loggas inte i normal appkod och returneras inte från vanliga page loaders.
- Revoke-modellen är soft revoke via `revoked_at`, så framtida cleanup kan skilja aktiva och återkallade subscriptions utan att delivery history behöver behålla subscription-raden för alltid.
- Deduplication lagras i `notification_delivery_log` med unik spärr på `user_id + deduplication_key`. Semantiken är "den här notification state har behandlats för användaren", inte en fullständig per-device attempt-logg.
- Multi-device-semantiken i 3.8 är därför user-level dedup. En framtida delivery-motor kan skicka samma candidate till flera aktiva subscriptions innan den skriver user-level delivered-state, eller lägga till separat attempt-logg om per-device retries behövs.
- Deduplication key behåller 3.7:s escalation-semantik: om samma signal får nytt policytillstånd, till exempel från `attention:normal` till `important:high`, blir det en separat state.
- Repository- och service-lagren tar user authority från serverns verifierade session. Klienten skickar aldrig `userId` som authority.
- Vanliga requests till `/`, `/idag`, `/vader` och `/profil` skapar inga subscription-rader, inga delivery-rader och gör inga notification attempts.
- Migration `0005_*` ska vara lokal tills remote-körning uttryckligen godkänts.
