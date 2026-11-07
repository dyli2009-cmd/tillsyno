# Kontrollflöde

**Status: LÅST** ([CONTROLFLOW_LOCK.md](../../../CONTROLFLOW_LOCK.md)). Alla filer nedan omfattas av låset, också de delade. Ändringar kräver att användaren skriver *"Lås upp Kontrollflödet"*.

Kontrollflödet är en arbetsyta för ritning, stämplar, kontrollpunkter, översikt, kundmall och PDF. Den har fyra undermoduler med olika innehåll men samma arbetssätt och samma PDF-design:

| Undermodul | Protokolltyper (`SYSTEMS`-nyckel) | Körs i | Dokument |
|---|---|---|---|
| Dörrautomatik | `automation` (18 punkter), `automation_selfcheck` (6) | Revisionssidan | [dorrautomatik.md](dorrautomatik.md) |
| Lås | `lock_revision` (11) | Revisionssidan | [las.md](las.md) |
| Säkerhetsservice | `detector` (1), `alarm` (10), `lock` (13), `access` (7) | Huvudsidan | [sakerhetsservice.md](sakerhetsservice.md) |
| Brand | `fire_panel` (5), `fire_detector` (5), `fire_door` (5) | Huvudsidan | [brand.md](brand.md) |

Gemensam PDF-design: [pdf-design.md](pdf-design.md).

## Så hänger det ihop (verifierat i koden 7 november 2026)

1. Startsidan `app.html` → **Kontrollflöde** öppnar `all-in-one.html`. Där väljs protokoll i en mappvy: *Dörrautomatik / Lås*, *Säkerhetsservice* och *Brandsäkerhet*.
2. `all-in-one.js` (`applyPicker`): om något av `automation`, `automation_selfcheck` eller `lock_revision` väljs, skickas användaren till **`controlflow-revision/all-in-one.html`** (revisionssidan). Övriga protokoll stannar på **`all-in-one.html`** (huvudsidan).
3. Båda sidorna drivs av samma sorts motor, i `ALL_IN_ONE`-läge:
   - huvudsidan av `security.js`,
   - revisionssidan av en **egen kopia**, `controlflow-revision/security-v335.js`.
4. Kontrollpunkterna finns i objektet `SYSTEMS` överst i motorn: en post per protokolltyp, med `checks` (kontrollpunkter) och `faults` (felval). **Innehållet hålls isär genom nyckeln, inte genom separata filer.**
5. Kundprotokollet byggs av `reportDoc()` (jsPDF). Det läggs efter ritningssidorna, som byggs med `buildSecurityDrawingPdf` och `exportPdf` (pdf-lib).

**Viktigt om kopiorna:**
- `SYSTEMS` är i dag **identiskt** i de två motorerna. Det är kontrollerat för alla tio protokolltyperna.
- `reportDoc()` har däremot **börjat skilja sig åt**, till exempel ORDER/ORDERNUMMER och olika teckenstorlekar. Se [pdf-design.md](pdf-design.md).
- En ändring i den ena kopian slår **inte** igenom i den andra.

## Filkarta

**Huvudsidan (Säkerhetsservice, Brand):**
- `all-in-one.html`, `all-in-one.js`, `all-in-one.css`
- Motorn: `security.js`, `security.css`, `security-compact.css`
- Säkerhetsservicedelar: `security-*-v5xx.css/js`, `security-checklist-v354.css`, `security-detectors-v344.*`, `security-detector-scan.*`, `detector-scan-core.js`, `detector-scan-vision.js`, `security-manual-numbering.js`, `security-drawing-view.js`, `security-callout-layout-v530.js`, `drawing-annotations-security-v530.js`
- `legacy-door-import.js` (Bluebeam-import, gäller bara Dörrautomatik och är låst)
- `offline-work.js`, `session-history.js`, `drawing-transfer.js`, `offline.js`

**Revisionssidan (Dörrautomatik, Lås):** allt i `controlflow-revision/`. Mappen innehåller egna kopior av:
- `security-v335.js`, `security.css`, `style.css`
- `tillsyno-appearance.css` och `tillsyno-appearance-v16.js`
- `legacy-door-import.js`, `drawing-annotations.js`, `offline-work-v2.js`, `drawing-transfer-v2.js`

Den har också egna revisionsfiler: `revision-*`, `service-overview-v12.*`, `customer-preview-v310.*` och `all-in-one-v2.js`.

**Delas av båda sidorna:**
- `controlflow-ui.css`, `controlflow-ui-scale.js`, `controlflow-responsive-v547.css`
- `controlflow-navigation-v548.*`, `controlflow-project-v548.*`, `controlflow-zoom-menu-v548.*`
- `controlflow-protocol-v549.*`, `controlflow-stamp-style-v549.*` (stämpelgeometri, också i PDF)
- `controlflow-layout-v550.css`, `controlflow-overview-v550.css`
- `controlflow-stamp-controls-v551.*`, `controlflow-dialogs-v552.*`
- `security-stamp-selection-v549.*`, `security-detectors-v344.*`
- `controlflow-revision/customer-stamp-editor-v335.js`, som också laddas av `security.html`

**Delas med andra moduler:** se [gemensamt.md](../gemensamt.md). `style.css` och `drawing-transfer.js` används även av `app.html`.

**Äldre fristående sida:** `security.html` (fristående Säkerhetsservice) använder också `security.js`, men inte i `ALL_IN_ONE`-läge. Den länkas från ett dolt panelinnehåll i `app.html` och används av testerna `security-workflow`, `drawing-tools` och `theme-consistency-v319`. Om användare fortfarande når den är **inte verifierat**.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow- security- protocol-selection revision-uncheck detector- customer-preview navigation-theme save-theme theme-consistency
```

Ändras motorn, `controlflow-*` eller en delad fil, ska alla dessa tester köras.

## Status

- **Fungerar enligt tester:** se testkörningen i [kvalitetskontroller.md](../../kvalitetskontroller.md).
- **Kända fel** (låsta, finns i `tests/known-failures.json`):
  - `controlflow-customer-floating-v310`: × i kundmallen på iPad-bredd.
  - `security-detectors-v344`, `security-uncheck-v531`, `security-drawing-rotation`.
- **Planerat, kräver upplåsning:**
  - tunga ritningar: [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md),
  - kontrasten i grå hjälptext,
  - gemensam PDF-designmodul: [pdf-design.md](pdf-design.md).

## Regler

- Låsregeln, och bara den beställda ändringen efter upplåsning: CONTROLFLOW_LOCK.md, DEVELOPMENT_RULES.md avsnitt 3 och 3A.
- Kontrollflöde och Projektering hålls isär: DEVELOPMENT_RULES.md avsnitt 2 och 2A.
- Ändringshistorik för gränssnittet finns i UI_RULES.md, avsnitten om v2.4.501–v2.4.552.
