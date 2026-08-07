# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 0.2 innehåller en verifierad OpenNext-build och den första verifierade deploymenten till Cloudflare Workers. `workers.dev` används som den första testmiljön.

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

Bygg OpenNext-versionen lokalt:

```powershell
npm run build:cf
```

## Version 0.2

OpenNext-builden och Cloudflare Workers-deploymenten är verifierade. Testmiljön finns på:

`https://grobiggis-v2.ola-fischer85.workers.dev`

`v2.grobiggis.se` är ännu inte kopplad. Versionen innehåller inte D1, annan databas, auth eller produktfunktioner.
