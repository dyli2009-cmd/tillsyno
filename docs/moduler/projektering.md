# Projektering (Tillsyno Projekt)

Projektering planerar ett projekt på ritningen. Det omfattar projektstämplar, dörrkort, produkter, material och tider.
- **Sida:** `smartmatch-projektering.html` (eget versionsnummer *Projektering 2.19.x*), länkad från startsidan som **Tillsyno Projekt**.
- **Produktbibliotek:** `produktbibliotek/index.html` med Copiax-listorna i `produktbibliotek/*.json` och `*.csv`. Mappen publiceras inte (byggskriptet tar inte med den).

## Regler

- Projektering hålls **helt isär från Kontrollflödet**: DEVELOPMENT_RULES.md avsnitt 2 och 2A, och [PROJECTFLOW_ARCHITECTURE.md](../../PROJECTFLOW_ARCHITECTURE.md).
  - Inga beroenden till `security.js` eller `all-in-one.*`.
- **Inaktuellt i reglerna:** båda dokumenten nämner `project-workspace.html`, `.css` och `.js`. De filerna finns inte längre. Projekteringen ligger i `smartmatch-projektering*`. Principerna gäller fortfarande.

## Filkarta

`-vX…` nedan betyder `smartmatch-projektering-vX…`.

| Del | Filer |
|---|---|
| Sida och huvudlogik | `smartmatch-projektering.html`, `smartmatch-projektering-v525.js` (133 kB) |
| Ritningsyta | `smartmatch-projektering-v2-19-canvas.js`, `-v2-19-annotations.js`, `-v2-19-window.js`, `-v2-10-layout.js` |
| Produkter och katalog | `-v2-19-catalog.js`, `-v519-data.js`, `-v519-library.js`, `-v511-library-ui.js`, `-v2-8-suggest.js`, `-v2-10-search.js` |
| Material, tider, PDF | `-v525-materials.js`, `-v525-pdf.js`, `smartmatch-product-times-v513.js`, `tillsyno-projection-times-v513.js` |
| Import av PDF | `-v2-19-import.js` |
| Lagring | `-v519-store.js` (IndexedDB `tillsyno-projektering-v2`, bibliotek `tillsyno-projektering-bibliotek-v1`) |
| Projektuppgifter | `tillsyno-project-info-v513.js`, `tillsyno-project-info-v509.css` |
| Typkoder | `smartmatch-automation-models-v512.js` |
| Utseende | `smartmatch-projektering-v2-19.css` (98 kB), `-v512` … `-v520.css`, `smartmatch-projektering-theme-v578.css` |

**Delas med SmartMatch**, och ändringar här påverkar då `smartmatch-read-v9-100.html` och `smartmatch-slr-test.html`:
- `-v2-19-annotations.js`, `-v2-19-catalog.js`, `-v519-data.js`, `-v525-materials.js`
- `smartmatch-product-times-v513.js`, `tillsyno-projection-times-v513.js`
- `tillsyno-project-info-v513.js`, `tillsyno-project-info-v509.css`
- `smartmatch-automation-models-v512.js`

**Laddas inte av någon sida** (bara via `require()` i Node och listade i `sw.js`):
- `smartmatch-projektering-v2-19-data.js`, `-v2-19-pdf.js`, `-v511-data.js`

De är kandidater i inventeringen av gamla versionsfiler. **Radera inte** utan verifiering och godkännande.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch-projektering sensor-package time-overview
```

Ändras en delad fil: kör även `smartmatch-` (se [smartmatch.md](smartmatch.md)).

## Status

- **Kända fel:** inga i `known-failures.json`.
- **Pausad funktion:** dörrautomatik i Projektflödet, se PROJECTFLOW_ARCHITECTURE.md (sista avsnittet).
