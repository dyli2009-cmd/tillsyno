# SharePoint-test 0.5 – status 2026-10-20

## Implementerat

Sparande av färdiga app-exporter som nya kopior till `GStest` och dess undermappar. Användaren väljer SharePoint eller den här enheten. Befintliga filer skrivs inte över. Den separata läsdiagnosen förblir read-only; den nya skrivfunktionen finns bara i de sju explicita testkopiorna.

Skrivklienten använder separat delegerad skrivbehörighet, upload session med `fail` vid namnkonflikt, delar om 5 MiB och en gräns på 25 MiB. Filen skickas utan omkodning. Serverns filmetadata och målmapppens föräldrar kontrolleras innan SharePoint-kvittens visas. Ingen automatisk retry vid osäkert resultat efter sista filblocket.

## Verifiering

- 59 direkta Node-testfall passerade: befintlig läsklient 22, exportadapter 13, ny skrivklient 24.
- 10 separata webbläsartestfall passerade med lokalt simulerade Microsoft-svar och verklig byggd appkod. De omfattar destination, oförändrade bytes, väntan på upload och metadata-kvittens, lokala sparvägar, felaktigt konto/nekad admin, namnkonflikt, nätfel, felaktig slutmetadata, avbrott, storleksgräns och mobil layout. Stoppa under aktiv överföring behåller exportfilen för ett uttryckligt lokalt sparande.
- Avläsning TEST 9.74:s riktiga testsida har öppnat en genererad projekt-PDF, ändrat en bock, exporterat med sin ordinarie PDF-kod och skickat resultatet genom SharePoint-adaptern. PDFLib har återläst de uppladdade bytesen och verifierat bocken samt dörrpositionens koppling. Appen fortsatte visa osparat arbete fram till serverkvittensen och visade rätt kopienamn efteråt.
- Syntax, byggning och `git diff --check` passerar. HTML-kopiornas gamla modulreferenser är bevarade; endast SharePoint-resurser, testlänkar och testversionen ändras. Produktionssidor, ordinarie modul-JavaScript, authfiler och service worker är oförändrade.

Kör kodtester: `npm test` i denna katalog. Browserfallen är valbara och körs separat, exempelvis:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

Bygg: `npm run build`. Genererade `app.js` och licensfil ska följa med publiceringen.

## Verklig Microsoft-verifiering återstår

Ingen faktisk Microsoft-inloggning, skrivbehörighet eller filuppladdning med användarens tenant har utförts i denna utvecklingsmiljö. Browserfallen använder uttryckligen lokal testdata, lokal autentiseringsstubb och lokala Graph-svar. De är inte bevis för live-Microsoft-åtkomst eller fysisk Safari.

`save.liveUploadVerified` är därför `false`. Nästa verkliga kontroll är: öppna en test-PDF, ändra en bock, **Spara PDF → Spara i SharePoint**, godkänn eventuell skrivbehörighet i testorganisationen, kontrollera den nya kopian i GStest och öppna den igen i testappen. Bekräfta bock och koppling även på annan enhet.

Den slutliga serverkontrollen i koden avser fil-ID, namn, storlek, bibliotek och föräldramapp. Den hämtar inte hela serverfilen för hashjämförelse. Kundfiler, autentiseringstoken och tillfälliga upload-URL:er finns inte i repot.

## Referenser

- https://learn.microsoft.com/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
- https://learn.microsoft.com/onedrive/developer/rest-api/concepts/permissions_reference?view=odsp-graph-online
