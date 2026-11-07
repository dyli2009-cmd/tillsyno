# Ritningsverktyg

Ritningsverktyget redigerar, rensar och optimerar PDF-ritningar. Det har också textigenkänning (OCR), ritningsanalys och digitalisering av dörrkort.
- **Sida:** `drawing-tools.html`, under **Verktyg** på startsidan.
- Allt körs lokalt. Tesseract finns i `vendor/tesseract/`.

## Filkarta

| Del | Filer |
|---|---|
| Sida och verktyg | `drawing-tools.html`, `drawing-tools.js`, `drawing-tools.css`, `drawing-pdf.js` |
| Textigenkänning | `drawing-ocr-tool.js`, `drawing-ocr-reader.js`, `drawing-ocr-pdf.js`, `drawing-ocr-image-regions.js` |
| Ritningsanalys | `drawing-analysis.js`, `drawing-analysis-tool.js` |
| Dörrkort | `drawing-card-tool.js`, `drawing-card-groups.js`, `drawing-card-digitizer*.js/css` (IndexedDB `tillsyno-digital-doorcards-v1`) |

**Har bara namnet gemensamt:**
- `drawing-annotations.js` hör till startsidan och fristående Säkerhetsservice.
- `drawing-annotations-security-v530.js` hör till Kontrollflödet.
- `drawing-transfer.js` var överföringen till Dörrautomatik och Säkerhetsservice. Den används inte längre från Ritningsverktyg (VANTANDE_PUNKTER.md punkt 6).

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules drawing- pdf-fixture
```

`drawing-ocr-pdf` behöver PyMuPDF (se tests/README.md).

## Status

- **Kända fel:** `drawing-ocr-swedish`. *Dörrcentral* kan läsas som *Dérrcentral* utan att visas för granskning. Felet varierar mellan körningar.
- **Väntar på beslut:** om knapparna *Öppna i Dörrautomatik/Säkerhetsservice* ska tillbaka (VANTANDE_PUNKTER.md punkt 6).
