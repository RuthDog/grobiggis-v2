# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 1.0 är den första produktmigreringen efter att den nya infrastrukturen verifierats. Den innehåller Grobiggis visuella identitet, ett rent appskal, den befintliga statiska växtkatalogen, ett Växtbibliotek och lokal sökning bland växterna.

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

## Version 1.0

OpenNext-builden och Cloudflare Workers-deploymenten är verifierade. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`https://v2.grobiggis.se`
