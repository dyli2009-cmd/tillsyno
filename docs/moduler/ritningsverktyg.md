# Ritningsverktyg

## 1. Version
- **Appversion:** Tillsyno v2.4.584 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** ingen egen. Modulen följer appversionen (ägarens beslut 7 november 2026).

## 2. Arbetsflöde från början till slut
Sidan `drawing-tools.html` ligger under **Verktyg** på startsidan och kräver modulen `drawing`. Den kan ha ett kodlås.

1. **Öppna** en PDF eller flera bilder i formaten JPG, PNG eller WebP. Bilderna blir en PDF (`imagesToPdf`). Ur Tillsynos egna arbets-PDF:er plockas originalritningen ut (`inspectKnownWorkPdf`).
2. **Redigera och rensa:**
   - välj och ta bort sidor,
   - beskär och maskera,
   - ta bort färgade markeringar, text och kommentarer,
   - ångra och gör om.
3. **Optimera** (`buildOutput`):
   - förlustfritt, med dubbla bilder borttagna och oanvända objekt rensade,
   - eller rastrerat till JPEG.
   - Resultatet kontrolleras genom att filen läses om.
   - Filen kan delas efter målstorlek.
4. **Analysera** strukturen: kommentarer, lager och bildgrupper. Ingen OCR görs i det steget.
5. **Textigenkänning (OCR):** PDF:ens egen text läses först, därefter Tesseract för svenska och engelska. Resultatet kan bli ett sökbart textlager.
6. **Dörrkort:**
   - gruppera sidor efter en rubrik som användaren markerar,
   - **digitalisera** dörrkorten: markera en mall, läs korten ett i taget, granska och godkänn.

## 3. Viktiga funktioner
- Status per digitaliserat kort: oläst, behöver granskas, godkänt, eller ändrat efter godkännande. Ändringar sparas automatiskt.
- Bara godkända kort tas med i PDF:en med digitala dörrkort.

## 4. Kodfiler

| Del | Filer |
|---|---|
| Sida och verktyg | `drawing-tools.html`, `drawing-tools.js`, `drawing-tools.css`, `drawing-pdf.js` |
| Textigenkänning | `drawing-ocr-tool.js`, `drawing-ocr-reader.js`, `drawing-ocr-pdf.js`, `drawing-ocr-image-regions.js` |
| Analys | `drawing-analysis.js`, `drawing-analysis-tool.js` |
| Dörrkort | `drawing-card-tool.js`, `drawing-card-groups.js`, `drawing-card-digitizer*.js/css` |

Tre filer har bara namnet gemensamt med modulen:
- `drawing-annotations.js` hör till startsidan och fristående Säkerhetsservice.
- `drawing-annotations-security-v530.js` hör till Kontrollflödet.
- `drawing-transfer.js` är den gamla överföringen till Kontrollflödet, som inte används härifrån längre.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning och behandling:** lokalt, med pdf.js, pdf-lib och Tesseract från `vendor/tesseract/`.
- **Lagring på enheten:**
  - IndexedDB `tillsyno-digital-doorcards-v1` (tabellen `projects`) innehåller de digitaliserade korten per fil.
  - Nyckeln är en kontrollsumma av filnamn, storlek, ändringstid, sidantal och ett urval på 64 kB av filen.
  - **Inga PDF-data, blobbar eller bilder sparas.**
  - Lagringen är inte kopplad till kontot.
- **Export:**
  - `-rensad.pdf`, `-forlustfri.pdf`, delade PDF-filer, `-sokbar.pdf`
  - OCR-resultat som JSON
  - `-digitala-dorrkort.json`, och `-digitala-dorrkort.pdf` med JSON-filen bifogad

## 6. Beroenden till andra moduler
- Inga kodberoenden till Kontrollflödet, Avläsning eller SmartMatch.
- Knapparna *Öppna i Dörrautomatik* och *Öppna i Säkerhetsservice* finns inte längre (VANTANDE_PUNKTER.md punkt 6).

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026): `drawing-*.js` gör inga `fetch`-anrop och har inga externa adresser. Nätverksanrop görs bara för inloggning och behörighet.
- Digitaliserade kort ligger okrypterade i IndexedDB, utan koppling till kontot.
- **Ej verifierat:** nätverkstestet (kvalitetskontroller.md avsnitt 3E).

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules drawing- pdf-fixture
```
- `drawing-ocr-pdf` kräver PyMuPDF.
- **Känt fel:** `drawing-ocr-swedish`. *Dörrcentral* kan läsas som *Dérrcentral* utan att visas för granskning. Felet varierar mellan körningar och gick igenom senast.
