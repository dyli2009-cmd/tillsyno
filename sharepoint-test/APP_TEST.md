# SharePoint – whole-app test 0.4

Entry: `../sharepoint-app-test.html?spv=0.4`.

Seven static test copies of the existing home, Kontrollflöde, Säkerhetsservice, SmartMatch, Avläsning, Ritningsverktyg and CE-märkning pages. Original HTML and module JS remain untouched. Copies preserve original scripts/styles and file change handlers. App pages are snapshotted from commit 27921575e515a0c3c07778cc799b0035b24c25f4.

The shared `src/app.mjs` intercepts connected file-input clicks only in these copies. The user chooses local files or SharePoint. Downloaded files become a FileList and dispatch the input's usual change event; the selected module performs its existing import. Multiple files are supported only on inputs marked multiple. Navigation links between the seven modules stay in the test copies.

SharePoint browsing starts at configured GStest, with navigation into its subfolders. PDF, PNG, JPEG, WebP and ZIP are filtered by the destination input's accept attribute. Per-file cap 25 MiB, total selection cap 100 MiB. File contents stay in memory for handoff; each module retains its existing local project/save behavior. This is an isolated code/UI test, not separate browser storage. No write/upload/delete API is added. Users still save/export using the module's existing functionality.

Access remains admin-only, checked online before Microsoft access and again before handoff. Existing Avläsning PIN remains required. Single test tenant and existing read-only Graph scope are unchanged. Authentication callback remains the registered existing callback.

Validation: 22 Node tests passed. Simulated DOM integration passed: locked PIN, file-type filtering, subfolder and parent navigation, FileList/change handoff, local chooser and denied account (no Graph request). Browser binary download was unavailable; real-browser visual verification and real Microsoft handoff into each module remain to be tested by the user. Original source pages were compared to generated copies for unchanged script references and existing file inputs.

Build: `npm ci --ignore-scripts && npm test && npm run build`. Commit generated `app.js` and its legal notice for static Pages. Keep test copies explicit; do not replace production routes.
