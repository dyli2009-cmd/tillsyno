# SharePoint-lästest 0.1 – kod och verifieringsstatus

2026-10-20. Endast grenen `test/sharepoint-projektflode-20261020`. Ingen ändring i fungerande Avläsning, Kontrollflöde, iOS eller main.

## Nytt i denna omgång
- `index.html`, `pilot.css`, `src/main.mjs`: fristående administratörstest med Microsoft-inloggning, lista över PDF:er direkt i GStest och hämtning/öppning av PDF i webbläsaren.
- `auth-callback.html`, `src/callback.mjs`: separat MSAL 5 redirect bridge på redan registrerad returadress. Ingen Tillsyno-guard på callbacksidan; den ska inte få COOP-header.
- `src/read-only.mjs`: endast GET-anrop. Ingen funktion för skrivning eller radering. Hämtar PDF via Graphs kortlivade downloadUrl utan Bearer-header till nedladdningsservern. Den tidigare preliminära `graph-client.js` används INTE.
- Befintlig Tillsyno-inloggning återanvänds och varje handling kontrollerar administratörsroll online. Microsoft-kontots tenant kontrolleras mot konfigureringen. Inga lösenord eller klienthemligheter.
- 25 MB gräns, kontrollerad nedladdningsdomän, gräns även på faktiskt mottagna bytes, PDF-signaturkontroll, tydliga fel vid 401/403/404/429. Token och temporära nedladdningsadresser loggas inte.

## Verifierat lokalt
Node 22: 12 av 12 enhetstester passerade med simulerade Graph-svar. JavaScript-syntax kontrollerad. Detta är INTE ett riktigt Microsoft-inloggnings- eller SharePoint-test.

## Återstår innan en fungerande länk kan lämnas
1. Installera paket och bygg med `cd sharepoint-test && npm install --ignore-scripts --no-audit --no-fund && npm test && npm run build`. MSAL 5.21.0 och esbuild 0.25.10 är versionslåsta i package.json. Spara och granska genererad package-lock före produktionsbruk.
2. Kontrollera byggresultat och befintlig service workers hantering av autentiserad trafik. De här källfilerna registrerar ingen ny service worker.
3. Publicera ENDAST den separata testkatalogen tillsammans med de byggda `pilot.js`/`callback.js` och licensfiler. Enbart HTML utan byggfiler fungerar inte. Ingen fungerande testlänk är verifierad ännu.
4. Verifiera att callbacksidan svarar 200 på exakt registrerad adress och inte omdirigeras av inloggningsskydd eller cache.
5. Verifiera riktig inloggning med användaren, rätt tenant, rätt bibliotek, GStest och en test-PDF. Felaktigt tenant-ID eller uteblivet medgivande måste upptäckas i realtestet.
6. Först efter lyckat lästest: integrera i separat Avläsnings-testkopia (Förbered ritning / Öppna PDF). Inga Avläsningsknappar är ändrade av denna omgång.

## Skillnad mellan olika aktiveringar
`auth-config.json` behåller `pilot.enabled: false`: integrationen i Avläsning är fortsatt avstängd. Den fristående diagnossidan kan efter uttrycklig publicering köras manuellt av administratören och tillåter enbart Sites.Read.All. Den ska inte beskrivas som en färdig appintegration eller som verifierad anslutning.

## Referenser
- https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge
- https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization
- https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0
