# Avläsning

## 1. Version
- **Appversion:** Tillsyno v2.4.586 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Avläsning 1.0 (`versions.json`). Den nya serien började i v2.4.583 och ersatte 9.100.35 (ägarens beslut: alla moduler börjar på 1.0). Sidhuvudet och sidtiteln visar *Avläsning 1.0 · SmartMatch 1.0*, och startsidans kort visar samma versioner.
  - Etiketten `SMARTMATCH_TEST_LABEL` i `smartmatch-read-main-v524.js` och skriptet `smartmatch-visual-release-v1-3` i sidan skriver *Avläsning 1.0*. De skrivs fortfarande för hand och ska stämma med `versions.json`. Testet `module-versions-v582` kontrollerar `SMARTMATCH_TEST_LABEL`.

## 2. Arbetsflöde från början till slut
Avläsning och [SmartMatch](smartmatch.md) körs på **samma sida**: *Avläsning + SmartMatch*, `smartmatch-read-v9-100.html`, som nås från startsidan. Avläsningen är den första delen.

1. **Öppna PDF** med dörrkort och ritning (`blobFromPickedFile`). Bannern på sidan säger: *Förbered nya filer en gång. Öppna sedan den sparade projekt-PDF:en för att arbeta.*
2. **Hitta dörrkorten** (`discoverCards` och `parsePages` i `smartmatch-read-v508.js`). PDF:ens egen text läses först. OCR används för bildytor, och bara när användaren trycker på knappen för det.
3. **Läs dörrkortets ID** enligt den låsta tabellregeln:
   1. tabellens celler identifieras först,
   2. ID läses i översta vänstra cellen (`smartTableCardIdentity`, `smartFirstRowIdentifier`),
   3. en tom eller oklar cell lämnas olöst.
4. **Läs kortets innehåll:**
   - verifierade extra tabellupplägg (`smartmatch-table-layouts-v36-94.js`) och beslagskoder (`smartmatch-beslagskod-v36-133.js`),
   - celler i linjerade tabeller (`smartmatch-read-table-ocr-v9-33.js`),
   - koder efter exempel (`smartmatch-read-codes-v9-101.js`). Förslagen granskas alltid av användaren.
   - stämplar, ur PDF-anteckningarnas utseende (`smartmatch-read-stamps-v9-93.js`).
5. **Arbetsrader:** produkter, montage och ansvar läses ur korten (`smartmatch-read-work-v9-*.js`).
6. **Granska:** kort med problem eller dubbletter visas för granskning (`smartmatch-read-review-v9-97.js`, `getCardIssues`, `chooseDuplicate`).
7. Därefter tar SmartMatch över: korten matchas mot ritningen.

## 3. Viktiga funktioner
- **Låsta regler:**
  - [SMARTMATCH_TABLE_RULE_LOCK.md](../../SMARTMATCH_TABLE_RULE_LOCK.md): tabellen först, ID ur översta vänstra cellen, hela ID:t.
  - [SMARTMATCH_FUNCTION_RULES_LOCK.md](../../SMARTMATCH_FUNCTION_RULES_LOCK.md): DS/DA-symboler visas bara som originalsymboler.
- **Bara verifierade tabellupplägg läses.** Generell tolkning av alla tabellupplägg är inte färdig.
- **OCR:** Tesseract laddas när det behövs från `vendor/tesseract/`, med svenska och engelska. Det körs på enheten.
- **Mallar** för avläsning sparas lokalt (`tillsyno-read-test-templates:v9.100`). Äldre nycklar för v9.85–v9.99 läses också.

## 4. Kodfiler och motor
- **Sida:** `smartmatch-read-v9-100.html`.
- **Huvudfil:** `smartmatch-read-main-v524.js`, 610 kB, delas med SmartMatch. Sök i den, läs den inte i sin helhet.
- **Avläsningens egna filer:**
  - `smartmatch-read-v508.js`, `smartmatch-read-work-v9-*.js`, `smartmatch-read-workflow-v9-94.js`, `smartmatch-read-step-v9-88.js`, `smartmatch-read-progress-v9-1.js`
  - `smartmatch-read-table-ocr-v9-33.js`, `smartmatch-read-text-v9-6.js`, `smartmatch-read-image-regions-v7.js`, `smartmatch-table-layouts-v36-94.js`, `smartmatch-beslagskod-v36-133.js`
  - `smartmatch-read-codes-v9-101.js`, `smartmatch-read-stamps-v9-93.js`, `smartmatch-stamp-shapes-v36-78.js`, `smartmatch-read-appearance-v9-86.js`
  - `smartmatch-read-review-v9-97.js`, `smartmatch-read-match-v9-93.js`
  - `smartmatch-read-project-v9-29.js`, `smartmatch-read-project-writer-v9-85.js`, `smartmatch-read-test-session-v9-85.js`, `smartmatch-read-export-progress-v9-51.js`
  - `smartmatch-read-*.css`, `smartmatch-read-test-v9-85.css`
- **Delas med SmartMatch:** `smartmatch-slr-test-v36-132.css` (200 kB), `smartmatch-pdf-v36-71.js` och `smartmatch-protocol-*`. Se [gemensamt.md](gemensamt.md).
- **Testsidan** `smartmatch-read-test.html` (*Avläsning TEST 9.85*) syns bara för administratörer. Den har egna filer: `smartmatch-read-main-v9-94.js`, `smartmatch-read-v9-100.js`, `smartmatch-read-codes-v9-6.js` och `smartmatch-read-access-v9-85.js`.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning:** användaren väljer en PDF på enheten. Den läses lokalt med pdf.js, och vid behov med Tesseract.
- **Lagring på enheten:**
  - IndexedDB `smartmatch-read-test-v9-shared-local-pdf-resume` innehåller PDF-filen och arbetsversioner (*Sparade arbetsversioner*). Äldre databaser för v9.1–v9.42 söks också igenom.
  - sessionStorage innehåller aktiv PDF och aktiv vy.
  - localStorage innehåller mallar, källor och projektinformation (`TillsynoProjectInfoV1`).
- **Export:** projekt-PDF:en med inbäddade projektdata. Detaljerna står i [smartmatch.md](smartmatch.md) avsnitt 5, eftersom exporten görs i SmartMatch-delen.

## 6. Beroenden till andra moduler
- **SmartMatch:** samma sida och samma huvudfil. Ändringar i delade filer påverkar båda.
- **Projektering:** sidan laddar projekteringsfiler för katalog, produkttider och projektinformation, se [projektering.md](projektering.md).
- **Ritningsverktyg:** har en egen digitalisering av dörrkort och delar ingen kod.

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026):
  - Sidan gör bara nätverksanrop för inloggning och behörighet: Supabase `tillsyno_access` och modulkodlåset (`data-code-module="read"`).
  - Övriga `fetch`-anrop läser den valda lokala filen och gör en versionskontroll mot den egna sidan (`smartmatch-read-test-session-v9-85.js`).
  - Ingen uppladdning av PDF har hittats.
- **Läskoden** (`tillsyno_verify_read_code`) används bara på testsidan, inte här.
- **Kunduppgifter och ritningar** ligger okrypterade i IndexedDB, localStorage och den exporterade PDF:en.
- **Ej verifierat:** att ingen data lämnar enheten när appen körs (nätverkstestet, kvalitetskontroller.md avsnitt 3E).

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch-read slr-bulk-five
```
- Inga kända fel som gäller bara Avläsning.
- `smartmatch-read-school-v7` och `-v9` hoppas över, eftersom de kräver en riktig ritning.
- **Inaktuell text:** bannern säger *"Separat test"*, trots att sidan är driftsidan (VANTANDE_PUNKTER.md avsnitt 8).
