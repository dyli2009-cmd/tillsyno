# SharePoint – whole-app test 0.6

Entry: `../sharepoint-app-test.html?spv=0.6`. Avläsning: `../sharepoint-read-test.html?spv=0.6`.

## Problem and resulting behavior

The user requested that **Spara update the same SharePoint file**, with a separate copy choice, and asked for a smaller, clearer SharePoint interface. Test 0.5 always created copies; 0.6 changes the default for a verified working project opened from SharePoint.

- **Samma fil → Spara** updates the exact opened driveItem ID, retaining its filename and folder. It does not create a dated duplicate.
- **Ny kopia** is explicit. It suggests a different name, creates a separate file, and makes that confirmed copy the working project's target for later saves in the current session.
- A local project has no cloud target. Its first SharePoint save creates one file with the chosen name; following saves in that session use the confirmed item ID.
- Unrelated reports, ZIPs, diagnostic exports, attachments and drawing-tool PDFs without a provable complete-project identity remain separate exports. A matching filename alone never authorizes an update.
- **Den här enheten** remains available, including after conflicts, network failure or stopped uploads.

The SharePoint dialogs use a compact 580 px desktop layout, SVG icons, a clear primary save action, a file card for the existing target, and collapsible account/help details. Touch controls remain at least 44 px on phones and touch screens. The adapter's dialogs stay compact inside Avläsning's existing workspace-dialog system.

## Identity and project binding

The read client verifies item ID, name, size, parent, drive and eTag before and after downloading the file. Only that verified snapshot can become a save target. Its Microsoft account and Tillsyno user are also bound.

`source-binding.mjs` requires a known full-project save action and checks the module's active project and the completed working PDF's own metadata. SmartMatch/Avläsning project IDs, CE project IDs and the embedded source drawing in the existing control/service working-PDF formats are used; filenames and import intent are insufficient. The older raw-PDF-copy action cannot update the working project even if its original catalogue carries the same project ID. Unknown future SmartMatch schemas are explicitly excluded. An import that failed to become the active project cannot select a target. Local/new/closed/other projects and account changes invalidate previous associations. No cloud identity is written into customer PDFs or localStorage.

Each queued export captures its project context before it waits. A confirmed save refreshes the item ID/eTag and invalidates older queued save contexts. Bindings are intentionally in memory: after a reload, open the working file from SharePoint again to establish the source.

The two SmartMatch test pages use their existing input-based project opener on desktop too, so **Öppna färdigt projekt** reaches the SharePoint source choice. Their own unsaved-work checks, import pipeline and Avläsning PIN remain in place. Their existing save-object action passes the module's normal complete PDF export through the adapter.

## Writes and conflicts

Opening files still uses delegated `Sites.Read.All`. Explicit SharePoint saving requests delegated `Files.ReadWrite.All`; visiting a page or opening a file does not request write consent. This scope covers files the signed-in test account can access. The GStest restriction is an application destination check, not a tenant-level Graph permission boundary. Use the separate test organization.

The writer resolves the configured site/library/GStest folder, verifies ancestry and current online admin/module access, and retains the existing 25 MiB file limit and sequential 5 MiB chunks.

For updates it uses `POST /drives/{driveId}/items/{itemId}/createUploadSession` with the opened `If-Match` eTag. It rechecks source identity and eTag before session creation and every fragment. An observed newer version, missing/renamed/moved source or HTTP 409/412 stops the update. There is no name-path fallback, forced overwrite of a conflicting version, automatic copy, deletion or automatic retry.

A new file still uses `conflictBehavior: fail`. File bytes are forwarded without re-encoding. Graph tokens go only to Graph, never to preauthenticated upload URLs. Final item ID/name/size/drive/parent/eTag and ancestry are verified before the SharePoint receipt. The new eTag is used on the next save.

**Concurrency limit:** Microsoft documents If-Match on upload-session creation but does not expressly guarantee that the precondition is atomically reapplied at final-fragment commit. Client checks catch observed changes; they are not a proven lock across concurrent writers. A real Microsoft concurrency test remains necessary before claiming that stronger guarantee. Metadata verification is not a downloaded byte/hash comparison.

A failed final request may have saved the file. The export remains available, and the UI asks the user to check SharePoint before retrying. Stopping an upload retains the original export for an explicit local save.

## Isolation and Avläsning snapshot

Only the seven `sharepoint-*-test.html` copies and `sharepoint-test/` change. Production HTML, module JavaScript, Tillsyno authentication, Avläsning PIN implementation and service worker are untouched. The standalone read diagnostic remains read-only.

The Avläsning test copy now loads the existing **9.78** snapshot from main `3951e870143363bdebd6d33eba304dd33d07e4db`. Its project-data schema is compatible with 9.74, but its PDF export reuses shared protocol pages. Retaining 9.74 while enabling same-file updates would reintroduce older per-position protocol copies and back links. The adapter therefore uses the existing 9.78 implementation without changing it. Other test copies retain their original module snapshots. Test copies share their corresponding module's existing browser storage.

## Verification and current limit

Node and browser evidence is recorded in `IMPLEMENTATION_STATUS.md`. Browser fixtures simulate Microsoft and use generated PDF files, while exercising the real UI, writer, export bridge and Avläsning page.

No real Microsoft account upload or physical Safari/iOS test has been performed here. `save.liveUploadVerified` remains false. The live acceptance step is: open a small test working PDF from SharePoint, edit one checkbox, save twice, confirm one unchanged filename/item in GStest, then reopen it from SharePoint and verify the work.

Build: `npm ci --ignore-scripts --no-audit --no-fund && npm test && npm run build`. Commit the generated `app.js` with source changes. Browser tests are opt-in and are not replaced by ordinary `npm test`:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

## Microsoft reference

- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
