# SmartMatch TEST v36.98 – ID250/ED250 ska kopplas till ID100/ED100

Datum: 2026-10-11. Endast **Verktyg → Koppla dörrautomatik** i SmartMatch TEST.

## Rättning
Den befintliga automatiska GS-matchningen i v36.97 hade redan ett kompatibilitetsundantag mellan Dorma ED100 (maskintyp 24) och ED250 (maskintyp 37), men modellen `ID250` eller `ID 250` igenkändes inte konsekvent i dörrkortsavläsningen.

`cardModelCode()` accepterar nu `ID250`, `ID 250`, `Dorma ID 250`, `ED250` och `ED 250` som maskintyp 37. Motsvarande redan befintliga `ID100` / `ED100` ger typ 24.

Vid **automatisk GS-koppling** gäller en kompatibilitetsregel *åt båda håll* mellan maskintyperna 24 och 37. Den ger rätt GS-pil även när dörrkortet säger ID100 och ritningsmärkningen har typ 37, eller när kortet säger ID250 och märkningen typ 24. **Detta ändrar inte originalets maskintyp, protokoll eller fysisk märkning.**

Tidigare skydd kvarstår: samma fullständiga objekt och sista nummer om dörrkortet innehåller ett fullständigt automatik-ID; andra maskintyper blockeras fortfarande; välj närmaste verifierade GS på ritningssidan; flera tvetydiga GS kräver manuellt val. Högst en pil per fysisk automatik. Manuella kopplingar, checklistor och SLR bevaras.

## Filer
- `smartmatch-da-v36-98-module.js` – begränsad utökning av ED250-alias i `cardModelCode`.
- `project-workspace-smartmatch-v36-98.{html,js,css}` – separat versionssnapshot utan ändrad grundsökning eller projektformat.
- `project-workspace-smartmatch-test.html` – fast testadress växlas till v36.98.
- `tests/smartmatch-ed100-ed250-v36-98.cjs` – Node-regression för båda riktningar, olika stavningar, fullständiga ID, fel nummer och en pil vid historiska dubletter.

## Verifiering
Den faktiska JavaScript-modulen kompilerades och kördes med en mockad GS-/dörrkortsmiljö i verktyget. **19 kontroller passerade**, inklusive ED250 → ID100, ED100 → ID250, ED100 → ED250, kompatibla fullständiga ID, fel maskintyp och fel antal. En kompletterande Node-regressionsfil är incheckad men har inte körts på GitHub eller mot kund-PDF här. För verklig verifiering ska användaren öppna sitt projekt i TEST v36.98 och jämföra pilen på ritningen mot motsvarande dörrkort. Kontrollflöde, iOS/TestFlight och v36.97 lämnas oförändrade.
