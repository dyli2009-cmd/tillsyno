# Avläsning

Avläsning läser **dörrkort, tabeller, koder och stämplar** ur PDF:en. Resultatet används av [SmartMatch](smartmatch.md), som kopplar dem till ritningen.

**Viktigt:** Avläsning och SmartMatch är **samma sida** i appen: *Avläsning + SmartMatch*, `smartmatch-read-v9-100.html`. Uppdelningen i två moduler gäller funktion, inte filer. Många filer används av båda. Kontrollera alltid vilken sida en fil laddas av (se [gemensamt.md](gemensamt.md)).

## Låsta regler

- [SMARTMATCH_TABLE_RULE_LOCK.md](../../SMARTMATCH_TABLE_RULE_LOCK.md):
  - identifiera tabellens celler först,
  - läs ID i översta vänstra cellen,
  - matcha hela ID:t mot ritningen.
- [SMARTMATCH_FUNCTION_RULES_LOCK.md](../../SMARTMATCH_FUNCTION_RULES_LOCK.md): tabellen *Gällande regler*. Den innehåller bland annat:
  - DS/DA-symboler visas bara som originalsymboler,
  - GS-produkter läses enligt TEST 9.28.

## Sidor

| Sida | Används som | Huvudfil |
|---|---|---|
| `smartmatch-read-v9-100.html` | **I drift**, länkad från startsidan | `smartmatch-read-main-v524.js` (610 kB, sök, läs inte i sin helhet) |
| `smartmatch-read-test.html` | Testversion för administratörer, *Avläsning TEST 9.85* | `smartmatch-read-main-v9-94.js` (586 kB) |

## Filkarta (avläsningsdelen)

- **Kortläsning och arbetsflöde:**
  - `smartmatch-read-v508.js` (driftsidan), `smartmatch-read-v9-100.js` (testsidan)
  - `smartmatch-read-work-v9-*.js`, `smartmatch-read-workflow-v9-94.js`
  - `smartmatch-read-step-v9-88.js`, `smartmatch-read-progress-v9-1.js`
- **Tabeller och OCR:**
  - `smartmatch-read-table-ocr-v9-33.js`, `smartmatch-read-text-v9-6.js`, `smartmatch-read-image-regions-v7.js`
  - `smartmatch-table-layouts-v36-94.js` (verifierade extra tabellupplägg)
  - `smartmatch-beslagskod-v36-133.js` (extra kortprofil)
- **Koder och identiteter:** `smartmatch-read-codes-v9-101.js` (drift), `smartmatch-read-codes-v9-6.js` (test)
- **Stämplar och symboler:**
  - `smartmatch-read-stamps-v9-93.js`, `smartmatch-stamp-shapes-v36-78.js`
  - `smartmatch-read-equipment-symbols-v9-85.js` (testsidan)
  - `smartmatch-read-appearance-v9-86.js`
- **Granskning:** `smartmatch-read-review-v9-97.js`, `smartmatch-read-match-v9-93.js`
- **Projekt, lagring, export och åtkomst:**
  - `smartmatch-read-project-v9-29.js`, `smartmatch-read-project-writer-v9-85.js`
  - `smartmatch-read-test-session-v9-85.js` (lokal PDF-återupptagning i IndexedDB)
  - `smartmatch-read-export-progress-v9-51.js`
  - `smartmatch-read-access-v9-85.js` (läskod via Supabase `tillsyno_verify_read_code`, laddas bara av testsidan)
- **Utseende:** `smartmatch-read-*.css`, `smartmatch-read-test-v9-85.css`, `smartmatch-slr-test-v36-132.css` (200 kB, delas)

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch-read slr-bulk-five
```

## Status

- **Kända fel:** inga i `known-failures.json` som gäller bara Avläsning.
- **Planerat och inte byggt:** generell tolkning av *alla* tabellupplägg. I dag läses bara verifierade profiler (enligt tabellregeln).
- **Historik:** [SMARTMATCH_FORTSATTNING_2026-10-10.md](../../SMARTMATCH_FORTSATTNING_2026-10-10.md) är en logg. Sök i den, läs den inte i sin helhet.
