# Projektering (Tillsyno Projekt)

## 1. Version
- **Appversion:** Tillsyno v2.4.585 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Projektering 1.0 (`versions.json`). Den nya serien började i v2.4.583 och ersatte 2.19.24 (ägarens beslut: alla moduler börjar på 1.0). Den visas på startsidans kort, i sidhuvudet, i sidtiteln och i versionsraden längst ner.
  - **Oförändrat:** skaparen i exporterade PDF:er (*Tillsyno Projektering 2.19*, dold metadata), `Proj2App.version` och `?v=2.19.24` i filernas adresser. Det är interna värden och inga versioner som syns.

## 2. Arbetsflöde från början till slut
Sidan är `smartmatch-projektering.html` och nås från startsidan som **Tillsyno Projekt**. Den startar först när behörigheten är kontrollerad (händelsen `tillsyno-authorized`).

1. **Öppna fil** (`openFile`, högst 80 MB):
   - En PDF med inbäddat projekt öppnas direkt (`Proj2PDF.inspect`).
   - En projektfil (`.tillsyno-projektering.json`) packas upp (`Proj2Store.unpack`).
   - En PDF utan projekt kan *konverteras* eller öppnas *som underlag*, alltså bara som ritning.
   - Det finns också en tom ritning och ett exempelprojekt.
2. **Importera dörrkort och stämplar** (`Proj2Import.scan`):
   - Textbaserade dörrkort läses med avsnitten Daglåsning, Nattlåsning, Dörrstängning, Larm/Passer och Övriga tillbehör, och med kolumnerna *lev av* och *mont av*.
   - En dialog visar antal och problem innan användaren godkänner importen.
3. **Placera projektstämplar.** Verktygen är markera, panorera, placera, radera och text. Stämplar kan flyttas, ändras i storlek, roteras, låsas, kopieras och dupliceras. Ångra och gör om finns, och texten på ritningen är sökbar.
4. **Produkter per dörrkort.** De hämtas från:
   - det medföljande produktregistret och montagetidskatalogen,
   - användarens personliga bibliotek,
   - fria förslag.
   - Automatikmodellerna hämtas från typkoderna.
5. **Material och tider:**
   - Materiallistan byggs från korten (`Proj2Materials`).
   - Tider hämtas från katalogen, annars som en uppskattning per kategori, markerad *kräver granskning*. Varje tid kan ändras per projekt.
6. **Exportera** (avsnitt 5).

## 3. Viktiga funktioner
- **Isolering:** Projektering hålls helt skild från Kontrollflödet (DEVELOPMENT_RULES.md avsnitt 2 och 2A, [PROJECTFLOW_ARCHITECTURE.md](../../PROJECTFLOW_ARCHITECTURE.md)). Den har inga beroenden till `security.js` eller `all-in-one.*`.
- **Tidernas ursprung** visas: angiven, uppskattad, manuell eller saknas.
- **Personligt bibliotek** per konto, med kontroll mot konflikt när flera flikar ändrar samtidigt (`expectedRevision`).
- **Pausad funktion:** dörrautomatik i Projektflödet, se sista avsnittet i PROJECTFLOW_ARCHITECTURE.md.
- **Inaktuellt i reglerna:** DEVELOPMENT_RULES.md avsnitt 2A och PROJECTFLOW_ARCHITECTURE.md nämner `project-workspace.*`, som inte finns. Förslag R2–R3 i kvalitetskontroller.md.

## 4. Kodfiler och motor
`-vX…` nedan betyder `smartmatch-projektering-vX…`.

| Del | Filer |
|---|---|
| Sida och huvudlogik | `smartmatch-projektering.html`, `smartmatch-projektering-v525.js` (133 kB) |
| Ritningsyta | `-v2-19-canvas.js`, `-v2-19-annotations.js`, `-v2-19-window.js`, `-v2-10-layout.js`, `-v2-10-search.js` |
| Produkter | `-v2-19-catalog.js`, `-v519-data.js`, `-v519-library.js`, `-v511-library-ui.js`, `-v2-8-suggest.js`, `smartmatch-automation-models-v512.js` |
| Material, tider, PDF | `-v525-materials.js`, `-v525-pdf.js`, `smartmatch-product-times-v513.js`, `tillsyno-projection-times-v513.js` |
| Import och lagring | `-v2-19-import.js`, `-v519-store.js` |
| Projektuppgifter | `tillsyno-project-info-v513.js`, `tillsyno-project-info-v509.css` |
| Utseende | `-v2-19.css`, `-v512` … `-v520.css`, `-theme-v578.css` |

**Laddas inte av någon sida** (bara via `require()` i Node och listade i `sw.js`): `-v2-19-data.js`, `-v2-19-pdf.js` och `-v511-data.js`. Radera dem inte utan verifiering och godkännande.

**Produktbiblioteket** `produktbibliotek/` (Copiax-listor och `index.html`) publiceras inte enligt `build-release.mjs`. Det kontrollerades senast 7 november 2026.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning och behandling:** lokalt, i webbläsaren, med pdf.js och pdf-lib.
- **Lagring på enheten:**
  - IndexedDB `tillsyno-projektering-v2` (tabellen `projects`, nyckel `current-v7`, med äldre nycklar som reserv) innehåller projektet och originalritningen. Gränserna är 50 MB för ritningen och 80 MB för projektet.
  - IndexedDB `tillsyno-projektering-bibliotek-v1` innehåller det personliga biblioteket, med nyckeln `account:<användar-id>`, eller `device`.
  - localStorage: `tillsyno-projektering-layout-v1`.
- **Export:**

  | Export | Filnamn |
  |---|---|
  | Projekt-PDF | `<namn>-ritning-och-dorrkort.pdf`, `-ritning.pdf` eller `-dorrkort.pdf` (eventuellt med `-bluebeam-text`) |
  | Materiallista | `-materiallista.pdf` och `.csv` |
  | Dörrkort | `<namn>-<kod>.pdf` |
  | Projektfil | `<namn>.tillsyno-projektering.json` |
  | Bibliotek | `tillsyno-bibliotek.json` |

- **Inbäddat i projekt-PDF:en:**
  - `TillsynoProjekteringV2`: projektdata, högst 12 MB.
  - `TillsynoProjekteringOriginalV2`: originalritningen.
  - `TillsynoProjectInfoV1`: projektidentitet och tider. Den nyckeln läses också av SmartMatch.

## 6. Beroenden till andra moduler
- **SmartMatch och Avläsning** laddar flera av projekteringsfilerna: annotations, catalog, v519-data, v525-materials, product-times, projection-times, project-info och automation-models. Ändringar i dem påverkar driftsidan *Avläsning + SmartMatch* och testsidan SmartMatch TEST.
- **Kontrollflödet:** inget kodberoende. Typkoderna i `smartmatch-automation-models-v512.js` motsvarar Kontrollflödets.

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026): projekteringsmodulerna innehåller inga anrop med `fetch` eller `XMLHttpRequest`. Sidan laddar Supabase för inloggning och behörighet via `auth/`. Katalogen innehåller tillverkarnas webbadresser, men bara som data.
- **Ritningar och projektuppgifter** ligger okrypterade i IndexedDB och i exporterade filer.
- **Ej verifierat:** nätverkstestet (kvalitetskontroller.md avsnitt 3E).

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules smartmatch-projektering sensor-package time-overview
```
Ändras en delad fil: kör även `smartmatch-` (se [smartmatch.md](smartmatch.md)).
- Inga kända fel.
