# Local OCR assets

The additional `beslagskod-first-cell-v1` card profile and the separate
user-selected reading test load these files.
Images are recognized in the browser; they are not sent to an OCR service.

- `tesseract.min.js` and `worker.min.js`: Tesseract.js 5.1.1, Apache-2.0. https://github.com/naptha/tesseract.js
- `tesseract-core-lstm.wasm.js`: tesseract.js-core 5.1.1, Apache-2.0. The file includes its WebAssembly payload. https://github.com/naptha/tesseract.js-core
- `lang/eng.traineddata.gz`: `@tesseract.js-data/eng` 1.0.0, `4.0.0_best_int` model. Apache-2.0. https://github.com/naptha/tessdata

Files are copied unchanged from the corresponding pinned npm packages. The
local paths permit offline use once the Tillsyno offline cache is prepared.

## Swedish model added in v2.4.369

- `lang/swe.traineddata.gz`: losslessly gzip-compressed Swedish LSTM model from
  `tesseract-ocr/tessdata_fast`, tag `4.1.0`, commit
  `65727574dfcd264acbb0c3e07860e4e9e9b22185` (Apache-2.0).
- Source: https://github.com/tesseract-ocr/tessdata_fast/blob/65727574dfcd264acbb0c3e07860e4e9e9b22185/swe.traineddata
- Uncompressed SHA-256: `f7304988d41f833efebcc2d529df54b1903ecebbc3da1faabd19a0fddd4fe586`.
- The model container was validated with `combine_tessdata -d`; compression uses
  gzip with a fixed zero timestamp. Decompression restores the original bytes.

PDF preparation and the new TEST 9.2 readers use Swedish and English together.
Older reading-test snapshots retain their original language selection.
