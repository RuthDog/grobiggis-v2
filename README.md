# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 1.1 innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, ett Växtbibliotek, lokal växtsökning och produktområdet Tips & kunskap.

V2 innehåller fortfarande ingen databas, auth, API-routes eller serverlagrad produktdata. `v2.grobiggis.se` är testmiljön för den nya versionen.

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

## Version 1.1

OpenNext-builden och Cloudflare Workers-deploymenten är verifierade. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`

Version 1.1 migrerar 8 granskade guider till statiska artikelsidor under `/tips`. Tips & kunskap har lokal sökning, kategorifilter, källredovisning och relaterade guider baserade på befintlig kategori- och växtmetadata.
