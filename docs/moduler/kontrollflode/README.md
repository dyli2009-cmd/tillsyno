# Kontrollflöde

**Version:** Tillsyno v2.4.587 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`). Kontrollflödet har tre modulversioner, grupperade som i mappvalet: **Dörrautomatik / Lås 1.4**, **Säkerhetsservice 1.1** och **Brand 1.0** (`versions.json`). De visas i mappvalet. Huvudsidan visar dessutom versionen i sidhuvudet; revisionssidan gör det inte (v2.4.584). Den här filen är översikten över motorerna, beroendena och filkartan. Varje undermodul har en egen funktionsbeskrivning med den gemensamma strukturen i CLAUDE.md avsnitt 6.

**Status: UPPLÅST** sedan v2.4.581 (ägarens beslut 7 november 2026). Kontrollflödet ändras som andra moduler, efter beställning. Låset ska inte återinföras, och ingen upplåsningsfras behövs.

Det här gäller fortfarande ([CONTROLFLOW_LOCK.md](../../../CONTROLFLOW_LOCK.md), som nu är en ändringslogg, och DEVELOPMENT_RULES.md avsnitt 3A):
- Ändra bara det som är beställt.
- Stämplar, sparade arbetsfiler, import av äldre protokoll och exporterad PDF ska fungera som förut.
- Kör Kontrollflödets tester före och efter ändringen.
- Skriv in ändringen i ändringsloggen.
- Redovisa vilka undermoduler och vilken motor som påverkas (avsnittet *Påverkan* nedan).

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
3. Varje sida har en egen motor, och båda körs i `ALL_IN_ONE`-läge:
   - huvudsidan av `security.js`,
   - revisionssidan av `controlflow-revision/security-v335.js`.
4. Kontrollpunkterna finns i objektet `SYSTEMS` överst i motorn: en post per protokolltyp, med `checks` (kontrollpunkter) och `faults` (felval).
5. Kundprotokollet byggs av `reportDoc()` (jsPDF). Det läggs efter ritningssidorna, som byggs med `buildSecurityDrawingPdf` och `exportPdf` (pdf-lib).

## De två motorerna: avsiktlig uppdelning som behålls

**Användarbeslut 7 november 2026:** de två motorerna behålls. De slås inte ihop, och funktioner flyttas inte mellan dem. Undermodulerna har olika funktioner, kontrollpunkter, protokoll och arbetsflöden.

| | `security.js` | `controlflow-revision/security-v335.js` |
|---|---|---|
| Undermoduler | Säkerhetsservice, Brand | Dörrautomatik, Lås |
| Sida | `all-in-one.html`, och fristående `security.html` (utan `ALL_IN_ONE`) | `controlflow-revision/all-in-one.html` |
| Egna funktioner | detektorer: identitetscell, sökning (`detector-scan-*`), numrering | revisionens kundstil, ritad signatur (`revision-signature-v6.js`), revisionsimport (`revision-callout-profile-v4.js`), egen AO-nummerkälla, **sparläge för tunga ritningar, skydd vid snabb zoom och laddningsruta** (v2.4.580–581) |
| Egna stödfiler | `security.css`, `style.css`, `tillsyno-appearance.*`, `offline-work.js`, `drawing-transfer.js` i roten | egna kopior av samma filer i `controlflow-revision/` |
| Delade filer | `controlflow-*` och `security-stamp-selection-v549.*`, `security-detectors-v344.*`, `customer-stamp-editor-v335.js` (se filkartan) | samma |

**Beroenden att känna till:**
- `SYSTEMS` finns i båda motorerna och är i dag **identiskt**. Det är kontrollerat för alla tio protokolltyperna, också för typer som inte används på sidan.
- En ändring i den ena motorn slår **inte** igenom i den andra.
- **Delad lagring på enheten:** båda motorerna körs i `ALL_IN_ONE`-läge och sparar arbetet under samma nyckel, `doorservice-all-in-one:<ritningens kontrollsumma>` i localStorage, och i samma IndexedDB-område (`tillsyno-offline-work`, scope `doorservice-all-in-one`). Öppnas samma ritning på båda sidorna läses och skrivs samma sparade arbete. Effekten är *ej verifierad*.
- Exporten skriver arbetsdata under `SecurityServiceWork` i PDF:en, i båda motorerna.
- Ändras en **delad** fil (`controlflow-*` med flera) påverkas båda sidorna.
- Den gemensamma PDF-designen (lager 1) finns i båda motorerna och har börjat skilja sig åt. Granskningen och förslagen finns i [pdf-design.md](pdf-design.md).

## Filkarta

**Huvudsidan (Säkerhetsservice, Brand):**
- `all-in-one.html`, `all-in-one.js`, `all-in-one.css`
- Motorn: `security.js`, `security.css`, `security-compact.css`
- Säkerhetsservicedelar: `security-*-v5xx.css/js`, `security-checklist-v354.css`, `security-detectors-v344.*`, `security-detector-scan.*`, `detector-scan-core.js`, `detector-scan-vision.js`, `security-manual-numbering.js`, `security-drawing-view.js`, `security-callout-layout-v530.js`, `drawing-annotations-security-v530.js`
- `legacy-door-import.js` (Bluebeam-import, gäller bara Dörrautomatik; filen har ett eget regressionsskydd beskrivet i sitt sidhuvud)
- `offline-work.js`, `session-history.js`, `drawing-transfer.js`, `offline.js`

**Revisionssidan (Dörrautomatik, Lås):** allt i `controlflow-revision/`. Mappen innehåller egna kopior av:
- `security-v335.js`, `security.css`, `style.css`
- `tillsyno-appearance.css` och `tillsyno-appearance-v16.js`
- `legacy-door-import.js`, `drawing-annotations.js`, `offline-work-v2.js`, `drawing-transfer-v2.js`

Den har också egna revisionsfiler: `revision-*`, `service-overview-v12.*`, `customer-preview-v310.*`, `all-in-one-v2.js`, `drawing-load-progress-v581.*` (laddningsrutan, v2.4.581) `revision-header-v584.*` (sidhuvud, verktygsmeny och frågan innan ritningen lämnas, v2.4.584) och `revision-protocol-v587.*` (checklistvyn, v2.4.587). Revisionssidans egen `session-history.js` har ingen textstorlek (A− / A+) sedan v2.4.584. Revisionssidans egen `drawing-annotations.js` har sedan v2.4.585 en *Ta bort*-knapp vid markerat ritobjekt och frågar innan borttagning; huvudsidans `drawing-annotations-security-v530.js` och rotens `drawing-annotations.js` är oförändrade.

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

## Påverkan: vilka delar berörs av en ändring?

Kontrollflödet har ingen spärr, men varje plan och PR ska visa vad som påverkas:

| Ändrad fil | Påverkar |
|---|---|
| `security.js` | Säkerhetsservice och Brand (huvudsidan) och fristående `security.html` |
| `controlflow-revision/security-v335.js` eller annat i `controlflow-revision/` | Dörrautomatik och Lås (revisionssidan) |
| `controlflow-revision/customer-stamp-editor-v335.js` | båda sidorna och `security.html` |
| `controlflow-*` i roten, `security-stamp-selection-v549.*`, `security-detectors-v344.*` | båda motorerna, alla fyra undermodulerna |
| `all-in-one.html`, `all-in-one.js` | protokollväljaren och huvudsidan, och vidareskickningen till revisionssidan |
| `style.css`, `tillsyno-appearance.*`, `offline.js`, `session-history.js`, `drawing-transfer.js` | Kontrollflödet **och** andra moduler, se [gemensamt.md](../gemensamt.md) |

Ett förslag till automatisk påverkanskontroll, utan spärr, finns i [kvalitetskontroller.md](../../kvalitetskontroller.md) avsnitt 3C.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow- security- protocol-selection revision-uncheck detector- customer-preview navigation-theme save-theme theme-consistency
```

Kör dem före och efter varje ändring i Kontrollflödet. Filtret `controlflow-` omfattar även testerna för tunga ritningar, `controlflow-heavy-drawing-v580`, `controlflow-heavy-zoom-v581` och `controlflow-drawing-load-progress-v581`.

## Status

- **Fungerar enligt tester:** se testkörningen i [kvalitetskontroller.md](../../kvalitetskontroller.md).
- **Senast ändrat (v2.4.580–v2.4.581, Dörrautomatik):** sparläge för tunga ritningar, krasch vid snabb zoom på telefon och laddningsruta. Se [dorrautomatik.md](dorrautomatik.md).
- **Kända fel** (finns i `tests/known-failures.json`): `security-detectors-v344`, `security-uncheck-v531`, `security-drawing-rotation`. Alla tre gäller huvudsidan. `controlflow-customer-floating-v310` är inte längre ett känt fel.
- **Väntar på beslut** (VANTANDE_PUNKTER.md punkt 6):
  - sparläge även i Säkerhetsservice (`security.js`),
  - kontrasten i grå hjälptext,
  - förbättringarna P1–P7 av PDF-designen, i båda motorerna: [pdf-design.md](pdf-design.md).

## Regler

- Upplåst sedan v2.4.581. Det som fortfarande gäller står överst i det här dokumentet, i CONTROLFLOW_LOCK.md och i DEVELOPMENT_RULES.md avsnitt 3 och 3A.
- Kontrollflöde och Projektering hålls isär: DEVELOPMENT_RULES.md avsnitt 2 och 2A.
- Ändringshistorik för gränssnittet finns i UI_RULES.md (avsnitten v2.4.501–v2.4.552, samt v2.4.580–581 för tunga ritningar). Ändringsloggen finns i CONTROLFLOW_LOCK.md.
