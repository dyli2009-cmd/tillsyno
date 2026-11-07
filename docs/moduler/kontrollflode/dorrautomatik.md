# Kontrollflöde – Dörrautomatik

**Upplåst** sedan v2.4.581. Läs först [README.md](README.md), som förklarar motorerna, vad som fortfarande gäller och filkartan.

## Innehåll

| Protokoll | `SYSTEMS`-nyckel | Prefix | Punkter |
|---|---|---|---|
| Checklista revision dörrautomatik | `automation` | DA | 18 (1.1 Samtal med nyttjaren … 1.18 Mindre justering) |
| Egenkontroll dörrautomatik | `automation_selfcheck` | DA-E | 6 |

Kontrollpunkter och felval finns i `SYSTEMS.automation` och `SYSTEMS.automation_selfcheck`. Dörrautomatik körs i revisionsmotorn `controlflow-revision/security-v335.js`. Posterna finns också i `security.js`, men används inte där.

## Var koden finns

- **Sida och motor:** `controlflow-revision/all-in-one.html` med `controlflow-revision/security-v335.js`. Hit skickar `all-in-one.js` användaren när ett DA-protokoll väljs.
- **Dörrautomatik-specifikt i motorn:** sök på `isDoorAutomationItem` och `normalizeAutomationIdentity` (serienummer och numrering, *"Dörrautomatik N"* i PDF).
- **Bluebeam-import:** `legacy-door-import.js` och kopian `controlflow-revision/legacy-door-import.js`. Filen har ett eget regressionsskydd beskrivet i sitt sidhuvud och får inte återanvändas för andra protokolltyper.
- **Revisionsspecifikt:**
  - `controlflow-revision/revision-callout-profile-v4.js`
  - `revision-signature-v6.js`
  - `revision-inline-v310.js`
  - `service-overview-v12.*`
  - `customer-preview-v310.*`
- **Tunga ritningar och laddning (v2.4.580–581):**
  - logiken finns i `controlflow-revision/security-v335.js`,
  - laddningsrutan i `controlflow-revision/drawing-load-progress-v581.js` och `.css`.
- **Äldre dörrkod på startsidan:** `app.js`, `v2.js` och `reports.js` på `app.html` har en egen kopia av de 18 kontrollpunkterna (`CHECKS` i `app.js`). Om den koden fortfarande används är **inte verifierat**. Ändra den inte som en följd av ändringar här.

## Senaste ändringar (finns i koden och är testade i Chromium)

Detaljer finns i [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md), i ändringsloggen CONTROLFLOW_LOCK.md och i UI_RULES.md avsnitten v2.4.580 och v2.4.581.

**v2.4.580, sparläge för tunga ritningar.** En ritning räknas som tung om något av följande gäller:
- filen är minst 30 MB,
- en bild i PDF:en är större än 16,7 miljoner pixlar,
- en sida är A1 eller större och filen har minst 2 MB innehåll per sida,
- en sida tar mer än 1,5 sekunder att rita.

I sparläget:
- Sidan ritas en gång med högst 3 miljoner pixlar, och zoom förstorar den bilden.
- Minnet frigörs efter varje ritning och vid sidbyte.
- Sidraden visar *Sida X / N · Sparläge*.
- Kundmall ritas med högst 4 miljoner pixlar.
- Kan en sida inte ritas visas ett tydligt fel.

**v2.4.581, snabb zoom på telefon och laddningsruta:**
- En zoom avbryter inte längre en pågående ritning av samma sida.
- Den tillfälliga ritytan frigörs alltid.
- Safaris egen sidzoom är avstängd på ritningsytan.
- Sparläget börjar tidigare på telefon: vid 15 MB, en bild över 8,4 MP, A2 med minst 1 MB per sida, eller en sida som tar mer än 0,8 s att rita.
- **Laddningsruta:** visar filnamn, stapel och procent, och vilket steg som pågår:
  1. *Kontrollerar arbetsfil och tidigare protokoll*
  2. *Öppnar ritningen*
  3. *Ritar sidan*, eller *Ritar sidan i sparläge*
  4. *Klart*

  Stapeln når 100 % först när sidan visas.

**Oförändrat enligt ändringsloggen:** den exporterade arbets-PDF:en och Kundmallens ritning är byte för byte desamma som i v2.4.579. Stämplar, protokoll och import är oförändrade.

**Inte verifierat:** fysisk iPhone och iPad (VANTANDE_PUNKTER.md punkt 5).

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow-heavy controlflow-drawing-load-progress security-automation-checklist revision-uncheck controlflow-production controlflow-pdf-roundtrip protocol-selection security-protocol-scope
```

Testerna för tunga ritningar är `controlflow-heavy-drawing-v580`, `controlflow-heavy-zoom-v581` och `controlflow-drawing-load-progress-v581`.

## Status

- **Kända fel:** inga egna utöver Kontrollflödets gemensamma, se README.md.
- **Kvar, som egna beslut** (CONTROLFLOW_HEAVY_PDF_PLAN.md):
  - läsa sidornas text en gång i `legacy-door-import.js`,
  - prova en nyare pdf.js, vilket påverkar hela appen,
  - mycket tunga ritningar (ca 1,1 GB första gången) på äldre iPad.
- **Ingen skillnad** mellan motorernas `SYSTEMS.automation*` (kontrollerat 7 november 2026, v2.4.581).

## Får inte påverka

Lås (`lock_revision`) körs på samma sida och i samma motor. En ändring i `security-v335.js` påverkar därför också Lås. Säkerhetsservice och Brand körs i `security.js` och påverkas bara via delade filer (README.md, *Påverkan*). Ändra aldrig deras kontrollpunkter i samband med en ändring i Dörrautomatik.
