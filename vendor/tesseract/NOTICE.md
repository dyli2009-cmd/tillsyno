# Local OCR assets

The additional `beslagskod-first-cell-v1` card profile and the separate
user-selected reading test load these files.
Images are recognized in the browser; they are not sent to an OCR service.

- `tesseract.min.js` and `worker.min.js`: Tesseract.js 5.1.1, Apache-2.0. https://github.com/naptha/tesseract.js
- `tesseract-core-lstm.wasm.js`: tesseract.js-core 5.1.1, Apache-2.0. The file includes its WebAssembly payload. https://github.com/naptha/tesseract.js-core
- `lang/eng.traineddata.gz`: `@tesseract.js-data/eng` 1.0.0, `4.0.0_best_int` model. Apache-2.0. https://github.com/naptha/tessdata

Files are copied unchanged from the corresponding pinned npm packages. The
local paths permit offline use once the Tillsyno offline cache is prepared.
