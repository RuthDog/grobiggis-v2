# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 1.3 innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, Växtbibliotek, Tips & kunskap och det första interaktiva odlingsflödet.

V2 innehåller fortfarande ingen databas, auth, API-routes eller serverlagrad produktdata. Odlingsomgångar i Version 1.3 ligger endast i webbläsarens minne och försvinner vid omladdning. `v2.grobiggis.se` är testmiljön för den nya versionen.

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

## Version 1.3

OpenNext-builden och Cloudflare Workers-deploymenten är verifierade. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`

Version 1.1 migrerar 8 granskade guider till statiska artikelsidor under `/tips`. Tips & kunskap har lokal sökning, kategorifilter, källredovisning och relaterade guider baserade på befintlig kategori- och växtmetadata.

Version 1.2 etablerar ren domänlogik för växt → odlingsomgång → starttyp/startdatum → planhändelser → status → avslut → historik. Den innehåller planlogik, svensk planpresentation, Today/task visibility, fysisk placement-separation och testad batch-isolering. Versionen har fortfarande ingen användarpersistens, databas eller auth.

Version 1.3 gör domänmotorn användbar i ett första UI-flöde: användaren kan starta en odlingsomgång från Växtbiblioteket, skapa flera omgångar av samma växt, se dem i Min plan, öppna en batchdetalj, visa planen och avsluta en omgång utan att påverka andra. State är sessionsbaserat in-memory och ingen permanent persistens, auth, databas eller API finns ännu.
