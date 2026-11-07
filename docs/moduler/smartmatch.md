# SmartMatch

SmartMatch **kopplar** avlästa dörrkort till positioner på ritningen. Det omfattar också dörrautomatik och GS, positionsändringar, arbetslista med tider, och export av protokoll.

**Samma sida som [Avläsning](avlasning.md):** `smartmatch-read-v9-100.html`. Läs [gemensamt.md](gemensamt.md) innan du ändrar en fil som flera sidor laddar.

## Låsta regler

- [SMARTMATCH_FUNCTION_RULES_LOCK.md](../../SMARTMATCH_FUNCTION_RULES_LOCK.md): börja med tabellen *Gällande regler* och avsnittet *Två kopplingar som bygger på varandra*.
- [SMARTMATCH_AUTOMATION_RULE_LOCK.md](../../SMARTMATCH_AUTOMATION_RULE_LOCK.md):
  - en verifierad GS per fysisk automatik,
  - exakt en pil,
  - manuella val bevaras.
- [SMARTMATCH_TABLE_RULE_LOCK.md](../../SMARTMATCH_TABLE_RULE_LOCK.md): matchning av hela ID:t, så att ID 1 inte matchar 11.

Låsfilerna hänvisar till flera `SMARTMATCH_TEST_V36_*.md` som inte längre finns i repot. Regeltexten i låsfilerna gäller.

## Sidor

| Sida | Används som | Huvudfil |
|---|---|---|
| `smartmatch-read-v9-100.html` | **I drift** (Avläsning + SmartMatch) | `smartmatch-read-main-v524.js` |
| `smartmatch-slr-test.html` | Testversion för administratörer, *SmartMatch Version 1.5* | `smartmatch-main-v524.js` (382 kB) |

## Filkarta (matchningsdelen)

- **GS och dörrautomatik:** `smartmatch-slr-test-da-v36-132.js`, `smartmatch-automation-models-v512.js`. Den senare **delas med Projektering** och har samma typkoder som Kontrollflöde.
- **Positioner och ändringar:**
  - `smartmatch-position-changes-v9-100.*`
  - `smartmatch-card-changes-v9-100.js`, `smartmatch-card-view-v9-38.js`
- **Arbetsyta på ritningen:**
  - `smartmatch-drawing-view-v9-100-18.js`, `smartmatch-drawing-selection-v9-100-31.js`
  - `smartmatch-workspace-dock-v9-100-12.*`, `smartmatch-windows-v9-100-13.*`
  - `smartmatch-workspace-polish-*.css`
  - `smartmatch-compact-workspace-*`
- **Arbetslista och tider:**
  - `smartmatch-work-completion-v9-100-17.js`
  - `smartmatch-project-material-v525.js`, `smartmatch-project-material-v523.css`
  - **Från Projektering:** `smartmatch-product-times-v513.js`, `tillsyno-projection-times-v513.js`
- **Textkontroller:** `smartmatch-text-checks-v9-100-24.*`
- **Stämplar:** `smartmatch-stamp-tools-v508.*`
- **PDF och protokoll:**
  - `smartmatch-pdf-v36-71.js` (320 kB)
  - `smartmatch-pdf-visuals-v9-100-34.js`
  - `smartmatch-protocol-export-v36-96.js`, `smartmatch-protocol-viewer-v9-100-33.js`, `smartmatch-protocol-templates.js`
  - `smartmatch-save-v9-100-34.css`, `smartmatch-selfcheck-v9-100-33.css`
- **Lokal lagring:**
  - `smartmatch-session-v36-77.js` (bara Version 1.5). PDF:en ligger i IndexedDB på enheten. Källfilen i Dropbox eller Filer ändras aldrig.
  - På driftsidan sköts lagringen i `smartmatch-read-main-v524.js` och `smartmatch-read-test-session-v9-85.js`.
- **Projekteringsfiler som SmartMatch laddar:** `smartmatch-projektering-v2-19-annotations.js`, `smartmatch-projektering-v2-19-catalog.js`, `smartmatch-projektering-v519-data.js` och `smartmatch-projektering-v525-materials.js`, samt `tillsyno-project-info-v513.js` och `tillsyno-project-info-v509.css`. **Ändringar i dem påverkar SmartMatch.**

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch- slr-
```

Ändras en projekteringsfil som SmartMatch laddar: kör också `smartmatch-projektering sensor-package time-overview`.

## Status

- **Kända fel:** `smartmatch-position-changes-ui-v9-100`. En ångrad ändring visas inte som *Återställd*. Väntar på beslut, se VANTANDE_PUNKTER.md punkt 6.
- **Väntar på beslut:**
  - förloppsstapel för *Uppdatera och fortsätt*,
  - raden *Återställd*.
- **Brasklapp:** `smartmatch-slr-test.html` (Version 1.5) länkar till `project-workspace-smartmatch-test.html`, som inte finns.
- **Planerat och inte beställt:** gemensamt arbete och molnlagring, se [SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md](../../SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md).
