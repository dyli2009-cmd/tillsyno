# SharePoint – whole-app test 0.5

Entry: `../sharepoint-app-test.html?spv=0.5`.

## Problem and resulting behavior

Test 0.4 opened files from SharePoint, but each module still saved only through its local export transport. Test 0.5 adds a destination choice to the existing export buttons: **Spara i SharePoint** or **Den här enheten**. SharePoint saves a **new copy** under the configured `GStest` folder or a selected subfolder. Existing files are never replaced or deleted. A name conflict stays in the save dialog with the export intact so the user can choose another name or save locally.

The module creates its ordinary PDF/ZIP/image or JSON/CSV/text export and its embedded project information. The test adapter forwards those exact bytes; it does not change reading, door-card matching, checklists, project metadata or the file format. Prepared project PDFs can be opened again through the same SharePoint file picker.

## Isolation

Only the seven `sharepoint-*-test.html` copies and `sharepoint-test/` assets change. Production HTML, module JavaScript, existing Tillsyno authentication and Avläsning PIN rules are unchanged. The copies retain their original 0.4 module snapshots (commit `27921575e515a0c3c07778cc799b0035b24c25f4`), including Avläsning 9.74. They do not silently switch to the current production Avläsning version. This is a separate code/UI test, not separate local browser storage.

The earlier standalone `sharepoint-test/index.html` diagnostic remains read-only. `pilot.readOnly`, `pilot.enabled` and `graphScopes` retain that diagnostic's settings. The new `save` settings apply only to the whole-app adapter.

## Save flow

1. Use the module's normal Save/Export button. The completed file opens the test's save dialog.
2. Select the test Microsoft account and a folder. A timestamped copy name is suggested and can be edited.
3. `Spara i SharePoint` requests delegated `Files.ReadWrite.All` on the selected account when necessary; opening files continues to use `Sites.Read.All`. Write consent is never requested merely by opening a file or visiting the page. The write permission covers files the test account can access; the app's destination checks are not a tenant-level permission boundary. Use only the separate test organization.
4. Create an upload session with `conflictBehavior: fail`, then send sequential 5 MiB fragments. The Graph token goes only to `graph.microsoft.com`, never to the preauthenticated upload URL. Such URLs and tokens are not logged or persisted by the save client.
5. Re-read the saved item's metadata and verify its identity, filename, size, drive and parent folder, plus destination ancestry. Only then show **Sparad i SharePoint**. This is server metadata verification, not a downloaded hash comparison.

The per-file limit is 25 MiB, matching the existing read test. Local export remains available for larger files and while offline. Cancelling or failing to obtain consent leaves the export in memory. Network failure during the final request may mean the file was committed; the UI asks the user to inspect the folder rather than automatically retrying or overwriting.

## Export transports

`src/export-bridge.mjs` is installed only on the seven named test pages with their expected module attributes. It handles same-origin blob/data download links, file sharing on iOS, and the native save-picker path. It does not patch fetch, Blob, object URL creation, or native file handles. The old 'save in opened file' test button is explicitly redirected to Save As and labelled **Spara kopia**.

Awaited native-picker/share exports do not complete until the selected transport acknowledges the file. Legacy synchronous download callers cannot await an anchor click; their ordinary download notice is not a SharePoint receipt. The separate save dialog and final receipt are authoritative for cloud status.

## Verification and current limit

The source is checked with Node tests for existing file reads, browser fetch binding, folder boundaries, permission changes, byte-preserving chunk upload, conflict handling, cancellation and server metadata checks. Browser integration tests exercise the actual save dialog with controlled Microsoft responses. Test results are recorded in the implementation status after the final run.

No real Microsoft upload has been verified from the development environment. `save.liveUploadVerified` remains false. The user must complete the first real save with the test account and reopen that project from SharePoint before this is called end-to-end verified.

Build: `npm ci --ignore-scripts --no-audit --no-fund && npm test && npm run build`. Commit `app.js` and its legal notice for static Pages. Keep test copies explicit; do not replace production routes.

## Microsoft references

- [Upload sessions and conflict behavior](https://learn.microsoft.com/graph/api/driveitem-createuploadsession?view=graph-rest-1.0)
- [Delegated file permission scopes](https://learn.microsoft.com/onedrive/developer/rest-api/concepts/permissions_reference?view=odsp-graph-online)
