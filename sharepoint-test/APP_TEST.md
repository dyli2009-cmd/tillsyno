# SharePoint – whole-app test 0.9

Entry: `../sharepoint-app-test.html?spv=0.9`. Avläsning: `../sharepoint-read-test.html?spv=0.9`.

## Problem and resulting behavior

The user still saw the duplicate-name error after 0.8. This time the exact error was reproduced through the real Avläsning 9.80 **Spara → Förbered PDF → Spara PDF** path with a valid project containing 162,416 JSON characters. The compressed PDF was only 7,822 bytes: the failure depended on embedded project data, not transfer size. The adapter's PDF string decoder exhausted the JavaScript call stack, its inspection returned an unrecognized export, and ordinary Save fell through to `saveCopy`. The previous 101 MiB transfer fixture had small project metadata and did not cover this case.

Test 0.9 decodes UTF-16 PDF catalogue strings in bounded blocks, as the existing Avläsning reader already does. Project ID, schema, active-workspace, complete-export and original-eTag checks remain required. The correction covers both a source that already contains large metadata and metadata that grows during work. It does not grant overwrite permission to an unrelated report or unknown project format.

The file list and confirmed save receipt now show **Senast ändrad i SharePoint**, using the server's `lastModifiedBy` and `lastModifiedDateTime`. The receipt uses the final verified item response. Missing names/timestamps have neutral fallbacks; the current login and device clock are not substituted as authorship evidence. This is file-level information, not a live editing indicator or a history of individual door checks. No checkout, co-authoring or automatic merge is introduced.

### Retained behavior from 0.8

The user reported that ordinary project saving still rejected an existing filename. The prior adapter updated a file only while its verified cloud reference remained in memory; an unbound project used the new-copy path. A single-file **Förbered ritning** handoff also discarded the import reference, and a page reload restored the local project without its cloud target. Test 0.8 corrects these paths while retaining Great, arbitrary nested folders, the **200 MiB per file and selection** limit, and the compact dialogs.

- **Samma fil → Spara** updates the exact opened driveItem ID, retaining its filename and folder. It does not create a dated duplicate.
- An unbound complete project offers **Samma namn**. Ordinary **Spara i SharePoint** looks for the exact chosen filename inside the chosen folder. It updates that item when present, or creates it when absent. Following saves use the confirmed item ID.
- **Ny kopia** is explicit for every complete project. It suggests a different name, creates a separate file, and makes that confirmed copy the working project's target for later saves. An existing name in copy mode is still a conflict.
- A verified single-file **Förbered ritning** import retains its cloud source. A successful SmartMatch local-cache restore in the same tab can recover the verified reference with its last-known eTag, including before the first PDF export.
- Unrelated reports, ZIPs, diagnostic exports, attachments and drawing-tool PDFs without a provable complete-project identity remain separate exports. They do not use the ordinary complete-project save-by-name path.
- **Den här enheten** remains available, including after conflicts, network failure or stopped uploads.

The SharePoint dialogs use a compact 580 px desktop layout, SVG icons, a clear primary save action, a file card for the existing target, and collapsible account/help details. Touch controls remain at least 44 px on phones and touch screens. The adapter's dialogs stay compact inside Avläsning's existing workspace-dialog system.

## Folders and large files

The initial configured root is `Tillsyno / Delade dokument / Great`. The application lists the actual SharePoint contents, including arbitrary nested folders; it does not require or create fixed Projekt/Service/Ordrar folders. **Uppdatera** stays in the current folder, rereads its current ancestry and names, and lists newly added files. The save-copy chooser behaves the same way.

After the first verified lookup, a small root reference containing site, library and folder IDs is kept in browser storage, scoped to the Microsoft account, Tillsyno user and configuration. Each use revalidates the configured site/library and the stored folder ID. A later folder rename keeps that identity. A deleted, inaccessible or invalid remembered folder does not silently switch to another folder with the old name. Blocked browser storage falls back to the verified ID in memory for the current session; readable but corrupt saved references remain errors. This is distinct from the tab-scoped project-file restore reference described below. A new browser without a remembered root reference starts from the configured Great path.

The shared 200 MiB limit applies to file selection, streamed downloads, project inspection, save controls and the upload writer. Downloads show progress and can be stopped by closing the chooser. Their two-minute timeout measures inactivity between received chunks, not total transfer time. Source identity is checked again after the complete download. The standalone read-only diagnostic retains its separate 25 MiB limit.

SmartMatch/CE source verification hashes ordered chunks of at most 2 MiB, including file length and chunk size in the internal fingerprint. It does not create an extra whole-file import buffer. Export inspection parses the module's existing source byte view directly, caches its small identity result, and parses each completed export afterward rather than in parallel. This reduces adapter allocations; it does not eliminate memory used by the existing PDF engine or guarantee 200 MiB documents on every iPad.

## Identity and project binding

The read client verifies item ID, name, size, parent, drive and eTag before and after downloading the file. Only that verified snapshot can automatically bind an imported file to a save target. Its Microsoft account and Tillsyno user are also bound. For an unbound complete project, the user's chosen folder and filename instead select a target through the named-save flow below.

`source-binding.mjs` requires a known full-project save action and checks the module's active project and the completed working PDF's own metadata. SmartMatch/Avläsning project IDs, CE project IDs and the embedded source drawing in the existing control/service working-PDF formats are used; filenames and import intent are insufficient. The older raw-PDF-copy action cannot update the working project even if its original catalogue carries the same project ID. Unknown future SmartMatch schemas are explicitly excluded. An import that failed to become the active project cannot select a target. Local/new/closed/other projects and account changes invalidate previous associations. No source-file binding is written into customer PDFs or localStorage.

Each queued export captures its project context before it waits. A confirmed save refreshes the item ID/eTag and invalidates older queued save contexts. SmartMatch keeps a small restore reference in `sessionStorage`, scoped to the exact test page, Microsoft account, Tillsyno user and workspace, and verified against the project ID and complete original-byte fingerprint. It is used only after the module's `openCachedPdf` successfully restores the matching original and workspace. A same-name local import cannot claim it. The original eTag is retained, so another tab's save does not silently advance the restored project's base version. No PDF bytes, access tokens or upload URLs are stored by this reference. Blocked storage falls back to the current page's memory. Other modules retain their in-memory binding.

The prepare bridge accepts a verified one-time handoff only for the identical single `File` delivered to `rtMultiFiles` with the expected prepare intent. Other files, multi-file merges, failed imports and unrelated bridge calls invalidate the association. A successful cache write can record the verified active source before the first export; the original byte object is reused and inspected through the existing sequential identity cache.

The two SmartMatch test pages use their existing input-based project opener on desktop too, so **Öppna färdigt projekt** reaches the SharePoint source choice. Their own unsaved-work checks, import pipeline and Avläsning PIN remain in place. Their existing save-object action passes the module's normal complete PDF export through the adapter.

## Writes and conflicts

Opening files still uses delegated `Sites.Read.All`. Explicit SharePoint saving requests delegated `Files.ReadWrite.All`; visiting a page or opening a file does not request write consent. This scope covers files the signed-in test account can access. The Great restriction is an application destination check, not a tenant-level Graph permission boundary. Use the separate test organization.

The writer uses the same verified root as the file chooser, verifies ancestry and current online admin/module access, and uploads files up to 200 MiB in sequential 5 MiB chunks.

For updates it uses `POST /drives/{driveId}/items/{itemId}/createUploadSession` with the opened `If-Match` eTag. It rechecks source identity and eTag before session creation and every fragment. An observed newer version, missing/renamed/moved source or HTTP 409/412 stops the update. There is no name-path fallback, forced overwrite of a conflicting version, automatic copy, deletion or automatic retry.

For an unbound complete project's ordinary save, `saveNamed` first resolves `GET /drives/{driveId}/items/{parentId}:/{name}` in the verified selected folder. It checks file identity, name, parent, drive and eTag, freezes that ID/eTag, and uses the same ID-based update and conflict checks. Only HTTP 404 creates a new file with `conflictBehavior: fail`; a create race stops with `name_race`. A supplied existing source is rejected by this API so a caller cannot replace an older known eTag with a fresh lookup. Explicit `saveCopy` still never updates a matching name. A local project without a prior cloud reference has no earlier server baseline: named saving protects changes observed after lookup, not historical differences between an old local copy and the chosen server file.

A new file still uses `conflictBehavior: fail`. File bytes are forwarded without re-encoding. Graph tokens go only to Graph, never to preauthenticated upload URLs. Final item ID/name/size/drive/parent/eTag and ancestry are verified before the SharePoint receipt. The new eTag is used on the next save.

**Concurrency limit:** Microsoft documents If-Match on upload-session creation but does not expressly guarantee that the precondition is atomically reapplied at final-fragment commit. Client checks catch observed changes; they are not a proven lock across concurrent writers. A real Microsoft concurrency test remains necessary before claiming that stronger guarantee. Metadata verification is not a downloaded byte/hash comparison.

A failed final request may have saved the file. The export remains available, and the UI asks the user to check SharePoint before retrying. Stopping an upload retains the original export for an explicit local save.

## Isolation and Avläsning snapshot

Only the seven `sharepoint-*-test.html` copies and `sharepoint-test/` change. Production HTML, module JavaScript, Tillsyno authentication, Avläsning PIN implementation and service worker are untouched. The standalone read diagnostic remains read-only.

The Avläsning test copy loads the existing **9.80** snapshot from main `8d83b844cb26f73a4f317f64efa3b1dca3cf051f`, retaining the latest product-list improvements. Its schema 6 project payload and app bridge remain compatible with 9.79. The adapter uses that implementation without changing module JavaScript. The test copy labels the existing saved-project entry **Öppna projekt**; **Förbered ritning** remains the entry for new source drawings. Other test copies retain their original module snapshots. Test copies share their corresponding module's existing browser storage.

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
- https://learn.microsoft.com/en-us/graph/api/resources/driveitem?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/resources/identity?view=graph-rest-1.0
