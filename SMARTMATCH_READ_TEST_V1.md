# SmartMatch – Avläsning TEST 1

Separat testsida: `smartmatch-read-test.html`. SmartMatch 1.3 och dess befintliga läs- och matchningsregler är kvar i sina tidigare filer. Testet använder en egen huvudfil och en egen databas för lokala arbetsversioner.

## Testflöde

1. Öppna en PDF med ritning och dörrkort, eller använd knappen för flera PDF-filer. Filerna öppnas tillsammans lokalt.
2. Välj en exempelsida och ange vilka sidnummer som är dörrkort, exempelvis `2, 4-8`.
3. Markera kodområdet och hela tabellen. Zooma med plus/minus; Flytta vyn låter fingret flytta den zoomade sidan. Markeringarna kan också anges med procentvärden.
4. Provläs de valda dörrkortssidorna. Kontrollera beteckningen, textträffen mot ritningen och tabellens innehåll. Vid flera möjliga beteckningar får användaren ange vilken som gäller.
5. Granska arbetsraderna och starta SmartMatch. Valda sidor identifieras från det valda kodområdet. Övriga sidor använder tidigare läsprofiler.
6. Öppna en stämpel och markera dess arbetsrader som Klar. Arbetsstatusen gäller den enskilda positionen, även när flera dörrar har samma beteckning.

Sparade läsmallar innehåller namn och relativa markeringar. De innehåller inte text från exempelkortet. Varje nytt kort provläses från sitt eget innehåll. Läsområden kan öppnas igen från verktygsfältet eller Verktyg-menyn.

## Avgränsning och lagring

Hela det markerade tabellområdet bildläses lokalt för att också få med bildrader i PDF:er som blandar bilder och native text. OCR-texten visas för granskning och kan behöva rättas. Modellen och Tesseract-filerna återanvänds från den redan publicerade lokala installationen; bilder skickas inte till en OCR-tjänst.

Klar-markeringar för de nya arbetsraderna använder en egen datastruktur. De ändrar inte de befintliga kontrollrutorna eller deras PDF-status. Testets arbetsstatus visas i appen och sparas i projektets metadata och lokala arbetsversion, utan att skrivas ut som nya kundkontroller.

Original-PDF:erna skrivs inte över vid provläsning eller när flera filer öppnas tillsammans. Läsmallar och den lokala arbetsversionen hör till den aktuella webbläsaren och enheten. Använd Spara PDF för att flytta projektets arbetsdata som fil.

Denna första testsida omfattar inte en egen fullständig offlineinstallation. Öppna den med internet när du hämtar dess nya filer. Fysiska iOS-enheter provas av användaren efter publicering.

## Kontroller

`tests/smartmatch-read-test-v1.cjs` kör det verkliga gränssnittet med PDF-filer, markeringar, OCR, matchning, mallar och två oberoende dörrpositioner med samma beteckning. Ange Chromium med `CHROMIUM_PATH`, Playwright via `CODEX_PRIMARY_RUNTIME_NODE_MODULES` och valfria startargument i `SMARTMATCH_BROWSER_ARGS`. En extern PDF kan anges med `SMARTMATCH_REAL_CARD`. Testunderlaget läggs inte i repot.

De tidigare testerna `smartmatch-beslagskod-v36-133.cjs` och `smartmatch-table-layouts-v36-95.cjs` verifierar även de tidigare 15 korten och läsreglerna.

Verifierat 2026-10-16:

- Hela testflödet passerade i 1366×900, 390×844 och 1024×1366. De två touchvyerna använder Chromium-touchhändelser vid markering.
- Dörrkort GS 47, Beslagskod GS47 och enbart GS47 gav samma avsedda beteckning. Två ritningspositioner med samma kod fick oberoende arbetsstatus.
- En verklig PDF med bildrubrik WC och skannad beslagstabell provlästes i datorvyn; sidfoten GS-001 låg utanför läsområdet.
- Sparad arbetsstatus överlevde omladdning. Flera PDF-filer kunde öppnas tillsammans. Mallar innehöll endast namn och markeringar.
- Arbetsstatus ändrade inte de befintliga kontrollrutorna eller deras exporterade progressdata. Inga externa OCR-anrop eller JavaScript-fel uppstod.
- Tidigare läsprofiler och de 15 tidigare testkorten passerade. Resurser, unika HTML-ID:n, JavaScript-syntax och whitespace kontrollerades.
