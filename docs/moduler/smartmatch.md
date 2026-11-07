# SmartMatch

## 1. Version
- **Appversion:** Tillsyno v2.4.582 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** SmartMatch 1.0 för driftsidan. Det är en egen serie (`versions.json`), som visas i sidhuvudet efter Avläsningens version och på startsidans kort.
- **SmartMatch TEST 1.5** (`smartmatch-slr-test.html`, bara för administratörer) behålls separat och oförändrad.
- Länken till testsidan heter *SmartMatch TEST 1.5* (rättad från *"SmartMatch 1.3"* i v2.4.582).

## 2. Arbetsflöde från början till slut
SmartMatch körs på samma sida som [Avläsning](avlasning.md), `smartmatch-read-v9-100.html`, och tar vid när dörrkorten är lästa.

1. **Matcha kort mot ritningen.** Kortets hela ID söks på ritningen (`smartmatch-read-match-v9-93.js`, `findDrawing`, `searchDrawing`). Mellanslag kan normaliseras, men ID 1 får inte matcha 11.
2. **Manuell koppling** när ingen säker träff finns (`beginManualLink`, `confirmManualLink`, `searchManualStamps`). Manuellt bekräftade kopplingar bevaras.
3. **Koppla dörrautomatik till GS** (*Verktyg → Koppla dörrautomatik*, `smartmatch-slr-test-da-v36-132.js`):
   - Placerad märkning → hela objektnumret söks → en egen knapp per fysisk automatik.
   - Bara GS vars eget dörrkort anger kompatibel automatik godtas.
   - En pil går till närmaste rätta GS på samma sida. Varje fysisk automatik får **exakt en pil**.
   - Finns ingen klar träff kopplar användaren manuellt.
4. **Positionsändringar** sparas per position (`smartmatch-position-changes-v9-100.js`). Markeringar ritas över originalkortet (`smartmatch-card-changes-v9-100.js`).
5. **Arbetslista och tider:**
   - avbockning per rad, och monteringssidor inne/ute (`smartmatch-work-completion-v9-100-17.js`),
   - tidsrapport (`calculateDoorTime`, `calculateTimeReport`),
   - materiallista (`smartmatch-project-material-v525.js`).
6. **Protokoll:** automatikprotokoll och checklistor öppnas per objekt (`openAutomationProtocol`). Visning sker i `smartmatch-protocol-viewer-v9-100-33.js` och sparande i `smartmatch-protocol-export-v36-96.js`.
7. **Spara eller dela** projekt-PDF:en (`prepareSmartExport`, `saveSmartExportLocal`, `saveSmartExportAs`, `emailSmartExport`, `shareSmartExport`).

## 3. Viktiga funktioner
- **Låsta regler:**
  - [SMARTMATCH_FUNCTION_RULES_LOCK.md](../../SMARTMATCH_FUNCTION_RULES_LOCK.md): tabellen *Gällande regler*.
  - [SMARTMATCH_AUTOMATION_RULE_LOCK.md](../../SMARTMATCH_AUTOMATION_RULE_LOCK.md): en verifierad GS per fysisk automatik, och manuella val bevaras.
  - [SMARTMATCH_TABLE_RULE_LOCK.md](../../SMARTMATCH_TABLE_RULE_LOCK.md).
- **Textkontroller på ritningen** görs lokalt (`smartmatch-text-checks-v9-100-24.js`).
- **Ritningsyta:**
  - `smartmatch-drawing-view-v9-100-18.js`, `smartmatch-drawing-selection-v9-100-31.js`
  - `smartmatch-workspace-dock-v9-100-12.*`, `smartmatch-windows-v9-100-13.*`
  - `smartmatch-stamp-tools-v508.*`

## 4. Kodfiler och motor
- **Sida:** `smartmatch-read-v9-100.html`.
- **Huvudfil:** `smartmatch-read-main-v524.js` (610 kB), som delas med Avläsning.
- **SmartMatchs egna filer:**
  - `smartmatch-read-match-v9-93.js`, `smartmatch-slr-test-da-v36-132.js`
  - `smartmatch-position-changes-v9-100.*`, `smartmatch-card-changes-v9-100.js`, `smartmatch-card-view-v9-38.js`
  - `smartmatch-work-completion-v9-100-17.js`, `smartmatch-project-material-v525.js`, `smartmatch-project-material-v523.css`
  - `smartmatch-text-checks-v9-100-24.*`
  - `smartmatch-drawing-*`, `smartmatch-workspace-*`, `smartmatch-windows-*`, `smartmatch-compact-workspace-*`, `smartmatch-stamp-tools-v508.*`
  - `smartmatch-pdf-visuals-v9-100-34.js`, `smartmatch-protocol-viewer-v9-100-33.js`, `smartmatch-protocol-export-v36-96.js`, `smartmatch-protocol-templates.js`
  - `smartmatch-save-v9-100-34.css`, `smartmatch-selfcheck-v9-100-33.css`
  - `smartmatch-slr-test-module-read-v9-85.js` (SLR-dokument)
- **Delas med Avläsning:** `smartmatch-pdf-v36-71.js` (320 kB) och `smartmatch-slr-test-v36-132.css`.
- **Från Projektering:** se avsnitt 6.
- **Testsidan** `smartmatch-slr-test.html` (TEST 1.5) har egna filer: `smartmatch-main-v524.js`, `smartmatch-session-v36-77.js` och `smartmatch-slr-test-module-v36-132.js`.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning och behandling:** lokalt, i webbläsaren.
- **Lagring på enheten:**
  - IndexedDB `smartmatch-read-test-v9-shared-local-pdf-resume` innehåller PDF:en och arbetsversioner.
  - localStorage innehåller bland annat `tillsyno.product-library.v1`, `smartmatch-worktime-defaults-v1` och `TillsynoProjectInfoV1`.
- **Projektdata i PDF:en:** katalognycklarna `TillsynoSmartMatchV36Data` och `TillsynoSmartMatchV30Data` (JSON, schema 6). Dessutom `SmartMatch52ReturnButtons`, `SmartMatch21OriginalPages`, `SmartMatch25LabeledCards` och `SmartMatch106NoteStreams`.
- **Fortsätta ett projekt:** öppna den sparade projekt-PDF:en igen, eller välj bland *Sparade arbetsversioner* på enheten.
- **Export:**

  | Fil | Namn |
  |---|---|
  | Projekt-PDF | originalnamnet eller `Tillsyno-projekt.pdf`, och `<namn>-kopia.pdf` |
  | Protokoll | `Revisionsprotokoll-<projekt>-<n>st.pdf`, `Checklista-revision-<id>.pdf` |
  | Material och kort | `GS-material-<namn>.pdf`, `Dorrkort-<id>.pdf` |
  | Sökrapport | `<namn>-sokrapport-v35.json` |
  | SLR | `SLR-<dörr>.pdf` och ZIP (namnet på ZIP-filen är *ej bekräftat*) |

  Filerna sparas via webbläsarens dialog för att spara fil, som nedladdning, eller delas via e-post eller delningsfunktionen.

## 6. Beroenden till andra moduler
- **Avläsning:** samma sida och samma huvudfil.
- **Projektering:** SmartMatch laddar följande projekteringsfiler. **Ändringar i dem påverkar SmartMatch**, och testerna för båda ska köras.
  - `smartmatch-projektering-v2-19-annotations.js`: textrutor
  - `-v2-19-catalog.js`: modell- och montagetider
  - `-v519-data.js`: produktregister
  - `-v525-materials.js`: förslag på arbete
  - `smartmatch-product-times-v513.js`, `tillsyno-projection-times-v513.js`, `tillsyno-project-info-v513.js`, `tillsyno-project-info-v509.css`
  - `smartmatch-automation-models-v512.js`: typkoder, desamma som i Kontrollflödet
- **CE-märkning** kan läsa en SLR-källa via `SmartMatchDALink.getSLRSource`, om funktionen finns.

## 7. Säkerhet och lagring
Samma förhållanden som för [Avläsning](avlasning.md) avsnitt 7:
- bara nätverksanrop för inloggning och behörighet,
- ingen uppladdning av PDF har hittats,
- data ligger okrypterad på enheten och i den exporterade PDF:en.

Ej verifierat: nätverkstestet (kvalitetskontroller.md avsnitt 3E).

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch- slr-
```
Ändras en projekteringsfil som SmartMatch laddar: kör också `smartmatch-projektering sensor-package time-overview`.
- **Känt fel:** `smartmatch-position-changes-ui-v9-100`. En ångrad ändring visas inte som *Återställd*. Väntar på beslut (VANTANDE_PUNKTER.md punkt 6).
- **Väntar på beslut:** förloppsstapel för *Uppdatera och fortsätt*.
- **Planerat och inte beställt:** gemensamt arbete och molnlagring, se [SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md](../../SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md).
- `smartmatch-slr-test.html` länkar till `project-workspace-smartmatch-test.html`, som saknas.
