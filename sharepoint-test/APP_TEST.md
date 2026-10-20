# SharePoint – whole-app test 0.7

Entry: `../sharepoint-app-test.html?spv=0.7`. Avläsning: `../sharepoint-read-test.html?spv=0.7`.

## Problem and resulting behavior

The user renamed the SharePoint root from **GStest to Great**, requested arbitrary subfolders such as **Projekt**, **Service** and **Ordrar**, and needs to open a drawing of about 100 MB. Test 0.7 raises the whole-app limit to **200 MiB per file and 200 MiB per selection** and follows verified folder IDs across renames. It retains the same-file saving and compact dialogs introduced in 0.6.

- **Samma fil → Spara** updates the exact opened driveItem ID, retaining its filename and folder. It does not create a dated duplicate.
- **Ny kopia** is explicit. It suggests a different name, creates a separate file, and makes that confirmed copy the working project's target for later saves in the current session.
- A local project has no cloud target. Its first SharePoint save creates one file with the chosen name; following saves in that session use the confirmed item ID.
- Unrelated reports, ZIPs, diagnostic exports, attachments and drawing-tool PDFs without a provable complete-project identity remain separate exports. A matching filename alone never authorizes an update.
- **Den här enheten** remains available, including after conflicts, network failure or stopped uploads.

The SharePoint dialogs use a compact 580 px desktop layout, SVG icons, a clear primary save action, a file card for the existing target, and collapsible account/help details. Touch controls remain at least 44 px on phones and touch screens. The adapter's dialogs stay compact inside Avläsning's existing workspace-dialog system.

## Folders and large files

The initial configured root is `Tillsyno / Delade dokument / Great`. The application lists the actual SharePoint contents, including arbitrary nested folders; it does not require or create fixed Projekt/Service/Ordrar folders. **Uppdatera** stays in the current folder, rereads its current ancestry and names, and lists newly added files. The save-copy chooser behaves the same way.

After the first verified lookup, a small root reference containing site, library and folder IDs is kept in browser storage, scoped to the Microsoft account, Tillsyno user and configuration. Each use revalidates the configured site/library and the stored folder ID. A later folder rename keeps that identity. A deleted, inaccessible or invalid remembered folder does not silently switch to another folder with the old name. Blocked browser storage falls back to the verified ID in memory for the current session; readable but corrupt saved references remain errors. This is distinct from the session-only project-file binding described below. A new browser without a remembered reference starts from the configured Great path.

The shared 200 MiB limit applies to file selection, streamed downloads, project inspection, save controls and the upload writer. Downloads show progress and can be stopped by closing the chooser. Their two-minute timeout measures inactivity between received chunks, not total transfer time. Source identity is checked again after the complete download. The standalone read-only diagnostic retains its separate 25 MiB limit.

SmartMatch/CE source verification hashes ordered chunks of at most 2 MiB, including file length and chunk size in the internal fingerprint. It does not create an extra whole-file import buffer. Export inspection parses the module's existing source byte view directly, caches its small identity result, and parses each completed export afterward rather than in parallel. This reduces adapter allocations; it does not eliminate memory used by the existing PDF engine or guarantee 200 MiB documents on every iPad.

## Identity and project binding

The read client verifies item ID, name, size, parent, drive and eTag before and after downloading the file. Only that verified snapshot can become a save target. Its Microsoft account and Tillsyno user are also bound.

`source-binding.mjs` requires a known full-project save action and checks the module's active project and the completed working PDF's own metadata. SmartMatch/Avläsning project IDs, CE project IDs and the embedded source drawing in the existing control/service working-PDF formats are used; filenames and import intent are insufficient. The older raw-PDF-copy action cannot update the working project even if its original catalogue carries the same project ID. Unknown future SmartMatch schemas are explicitly excluded. An import that failed to become the active project cannot select a target. Local/new/closed/other projects and account changes invalidate previous associations. No source-file binding is written into customer PDFs or localStorage.

Each queued export captures its project context before it waits. A confirmed save refreshes the item ID/eTag and invalidates older queued save contexts. Bindings are intentionally in memory: after a reload, open the working file from SharePoint again to establish the source.

The two SmartMatch test pages use their existing input-based project opener on desktop too, so **Öppna färdigt projekt** reaches the SharePoint source choice. Their own unsaved-work checks, import pipeline and Avläsning PIN remain in place. Their existing save-object action passes the module's normal complete PDF export through the adapter.

## Writes and conflicts

Opening files still uses delegated `Sites.Read.All`. Explicit SharePoint saving requests delegated `Files.ReadWrite.All`; visiting a page or opening a file does not request write consent. This scope covers files the signed-in test account can access. The Great restriction is an application destination check, not a tenant-level Graph permission boundary. Use the separate test organization.

The writer uses the same verified root as the file chooser, verifies ancestry and current online admin/module access, and uploads files up to 200 MiB in sequential 5 MiB chunks.

For updates it uses `POST /drives/{driveId}/items/{itemId}/createUploadSession` with the opened `If-Match` eTag. It rechecks source identity and eTag before session creation and every fragment. An observed newer version, missing/renamed/moved source or HTTP 409/412 stops the update. There is no name-path fallback, forced overwrite of a conflicting version, automatic copy, deletion or automatic retry.

A new file still uses `conflictBehavior: fail`. File bytes are forwarded without re-encoding. Graph tokens go only to Graph, never to preauthenticated upload URLs. Final item ID/name/size/drive/parent/eTag and ancestry are verified before the SharePoint receipt. The new eTag is used on the next save.

**Concurrency limit:** Microsoft documents If-Match on upload-session creation but does not expressly guarantee that the precondition is atomically reapplied at final-fragment commit. Client checks catch observed changes; they are not a proven lock across concurrent writers. A real Microsoft concurrency test remains necessary before claiming that stronger guarantee. Metadata verification is not a downloaded byte/hash comparison.

A failed final request may have saved the file. The export remains available, and the UI asks the user to check SharePoint before retrying. Stopping an upload retains the original export for an explicit local save.

## Isolation and Avläsning snapshot

Only the seven `sharepoint-*-test.html` copies and `sharepoint-test/` change. Production HTML, module JavaScript, Tillsyno authentication, Avläsning PIN implementation and service worker are untouched. The standalone read diagnostic remains read-only.

The Avläsning test copy loads the existing **9.79** snapshot from main `4ea6d1de1007222b00ba6c8e8fe115bab4e2d223`, retaining both shared protocol pages and the current product-list time behavior. Its project schema and bridge remain compatible with 9.78. The adapter uses that implementation without changing module JavaScript. The test copy labels the existing saved-project entry **Öppna projekt**; **Förbered ritning** remains the entry for new source drawings. Other test copies retain their original module snapshots. Test copies share their corresponding module's existing browser storage.

## Verification and current limit

Node and browser evidence is recorded in `IMPLEMENTATION_STATUS.md`. Browser fixtures simulate Microsoft and use generated PDF files, while exercising the real UI, writer, export bridge and Avläsning page.

No real Microsoft account upload, the user's actual 100 MB drawing, or physical Safari/iOS test has been performed here. `save.liveUploadVerified` remains false. The live acceptance step is: browse Great and a nested project folder, refresh after adding a new PDF, open a working project, edit one checkbox, save twice, confirm one unchanged filename/item, then reopen it from SharePoint and verify the work. Check the actual large drawing on the intended device as well.

Build: `npm ci --ignore-scripts --no-audit --no-fund && npm test && npm run build`. Commit the generated `app.js` with source changes. Browser tests are opt-in and are not replaced by ordinary `npm test`:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

The browser suite requires Playwright, Chromium and OpenSSL. Large synthetic downloads stream from a temporary local HTTPS server; upload fragments are written directly to temporary files. The generated certificate, key and large PDFs are removed after the test. A large opaque stream tests file size and project persistence, not the rendering workload of the user's scanned drawing.

## Microsoft reference

- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/addressing-driveitems?view=odsp-graph-online
