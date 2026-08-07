# GroBiggis V2

Detta repository innehåller GroBiggis V2.

Version 0.1 utökar den rena tekniska grunden med OpenNext Cloudflare-adaptern och en minimal Wrangler-konfiguration för en framtida Worker. Syftet är att lokalt verifiera både den vanliga Next.js-builden och en Cloudflare Workers-kompatibel OpenNext-build.

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

## Avgränsning för Version 0.1

Version 0.1 innehåller Next.js, OpenNext Cloudflare-adaptern, Wrangler-konfiguration för en framtida Worker och stöd för lokal OpenNext-build.

Ingen deployment har gjorts och ingen Worker eller workers.dev-adress har skapats. Versionen innehåller inte D1, annan databas, auth, produktfunktioner, externa tjänster, miljövariabler eller secrets.
