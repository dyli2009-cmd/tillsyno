# SmartMatch TEST v36.102 – GS-kontrollen måste synas, inte bara versionsnumret

**Datum:** 2026-10-11. Användaren ser `v36.101` men ingen synlig effekt av beslutet att en fysisk dörrautomatik ska ha högst en **korrekt** GS-källa för framtida SLR. Detta behandlas som ett faktiskt UX-/verifieringsfel, inte ett cachefel.

## Ändring (i separat TEST; ordinarie Kontrollflöde/iOS orörda)

1. När teknikern öppnar en dörrautomatik visar dialogen direkt GS-status. Den läser samma ritningssidas fysiska DA-symboler och GS-kandidaternas dörrkort även när dialogen öppnas för Egenkontroll/SLR-val, inte bara när `Koppla / ändra GS` öppnas.
2. Om sparad GS skiljer sig från närmaste verifierade GS visas **Avvikelse: sparad GS4 · föreslagen GS2** i stället för det tidigare intetsägande ”Kopplad”. Tidigare manuellt val skrivs **inte** över av automatisk kontroll.
3. I `Koppla / ändra GS` visas sparad och föreslagen GS tillsammans. Knappen **Välj föreslagen GS** väljer endast förslaget i formuläret; användaren måste fortfarande trycka **Spara GS-koppling**. Inga revisioner eller SLR-statusar raderas.
4. `SLR-dokumentmapp` kontrollerar dörrkorten **vid öppning**, visar verifierad `GS → dörrkortssida` **överst**, och markerar saknad/tvetydig källa. Om sparad manuellt bekräftad GS avviker från den aktuella kontrollerade fysiska matchningen används den **inte** som verifierad automatisk SLR-källa förrän avvikelsen rättats.
5. Den låsta regeln från v36.101 är kvar: en fysisk automatik får högst en GS-koppling; flera olika automatiker kan dela samma GS om de faktiskt tillhör samma dörr. Dubbla historiska kontrollposter bevaras. PDF-textens DA-symbol är en geometrisk ledtråd, inte ensam identitetskälla.

## Versionsfiler
- `smartmatch-da-v36-102-module.js`
- `project-workspace-smartmatch-v36-102.{html,js,css}`
- `project-workspace-smartmatch-test.html` är en fullständig kopia av v36.102 HTML och hänvisar till versionerade v36.102-resurser.
- `tests/smartmatch-snidaren-gs2-v36-102.cjs` innehåller regressionsfall och synlig fel-GS-varning.

## Verifiering

- JavaScript-syntax kontrollerad.
- Kodens faktiska matching-/kopplingsfunktioner körda i isolerad JS-miljö med Snidaren sida 3:s uppmätta geografiska koordinater: **11/11 kontroller passerade**. Kontrollerade bl.a. `...-1 → GS4`, `...-2 → GS2`, fysisk DA-symbol, gammal bekräftad GS4 som ger avvikelse, SLR-spärr för fel GS, SLR-källa GS2/dörrkort s. 12, bevarad SLR-historik och en pil per fysisk automatik.
- Fasta HTML-filen återläst från GitHub och jämförd mot versionerad v36.102: exakt innehållsmatchning.
- Ännu **inte** verifierad på användarens iPhone/iPad i Safari eller genom ett komplett verkligt PDF.js-GUI-test på just enheten. GitHub Pages-CDN gick inte att nå från kontrollverktyget; källkoden är publicerad på GitHub och bör laddas av den fasta testadressen efter publiceringsfördröjning.
- SLR skapar ännu inte färdiga dokumentmallar eller kopierar alla dörrkortsuppgifter; endast verifierad GS/kort-sida som framtida källa.

**Ny regelstatus:** v36.102 visualiserar och granskar den **redan låsta v36.101-regeln**. Ingen oombedd ändring av dess betydelse.