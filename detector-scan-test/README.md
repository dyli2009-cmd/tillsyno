# Detektorer TEST 0.5

Entry: `detector-scan-test/all-in-one.html`, linked from the existing home-page Testversioner panel. The production Security Service runtime is unchanged.

## Example-first workflow

1. Open a drawing and zoom in on one black framed number.
2. Choose **1. Markera exempel**. Drag around the whole frame, or tap two opposite corners. Selection coordinates account for drawing rotation and zoom.
3. Review the cropped example, confirm its number and choose **Använd exempel**.
4. Choose **2. Skanna ritningen** to scan every page, then **Spara PDF**. The appearance example, connections, positions and control status are saved with that drawing.
5. Open the saved test PDF next time to continue immediately. The initial learning/scanning controls are hidden once controls exist; **Sök fler** offers optional additions. A different drawing starts empty, even if it has the same filename. The original drawing ALWAYS starts unlinked, even after earlier scans, explicit close/reopen, or filename changes. Cached work with the same source fingerprint is never restored automatically.

This is an appearance preset, not training a global AI model. Frame size, text height, orientation and text/image reading method are learned from the selected example; the example's number is never a search filter. Short numbers and leading zeros are retained. Each occurrence owns a UUID, page, coordinates, status and checklist, including repeated numbers in different positions. Rescanning preserves existing controls. Manual add/move and undo remain available.

## Manual size adjustment

After **Lägg till manuellt**, enter the number and place it on the drawing. The **Bredd** and **Höjd** sliders open directly below the drawing. Each adjusts one visible axis from 25–600% of that box's initial size. **Klar** closes the controls; **Återställ storlek** resets both dimensions. For an existing manual or scanned number, open its control and choose **Ändra storlek**.

Dimensions are stored per occurrence in the original PDF viewport coordinate system. Stable base dimensions prevent compounded percentages after reopening. Rotating the drawing changes which visible slider controls each axis; zoom never changes saved geometry. Text grows with the height across its baseline and is fitted inside the rectangle in both the browser and PDF. Moving a box retains its dimensions; repeated scans retain existing sizes and use original dimensions for positional deduplication. Exported PDF links follow the rectangular width/height instead of a square radius. Changes use session undo/redo and persist in saved test-PDFs.

## Implementation and scope

`security.js` is an isolated snapshot of the Security Service runtime at `c543286`, with separate storage prefix, PDF metadata key and app identity. `state.js` restores controls only from metadata embedded in an explicitly opened test-PDF and rejects controls from ordinary/legacy imports and all local-cache fallback paths. `test.js` supplies controls, sample selection and number-box rendering. `core.js` contains pure vector/raster geometry, numeric matching and position identity. `vision.js` reads samples and scans rendered PDF pages locally. The image pass detects visible closed black rectangular borders, including frames drawn with four independent PDF strokes. It checks candidate dimensions against the example rather than depending on PDF path construction.

A sample with extractable numeric text enables text reading inside matching frames. A sample without text enables local Tesseract OCR of matching frame interiors; bundled worker/model assets load on demand. This avoids treating unrelated electrical symbols as text candidates on ordinary digital drawings. For mixed drawings, mark a scanned number as the example to enable image reading. The first image-reading use requires the bundled assets to be available. No drawing is sent to an external OCR service.

OCR accepts numeric-only results above a confidence threshold; the result message asks users to check image-read numbers and reports unreadable frames. Failure to start OCR does not discard already read digital results. Appearance matching is intended for upright/quarter-turned closed rectangular black frames at comparable scale. Arbitrarily skewed scans, broken borders, drastically different label scales, low resolution and unusual fonts may need a new example or manual placement. The test does not promise to identify every detector symbol or distinguish visually identical room labels automatically.

Raster analysis uses a maximum six-million-pixel whole-page render when that retains enough border resolution, falling back to bounded overlapping tiles for large sheets with tiny labels. Cancel and source-change guards prevent stale results from applying. Scan results are applied only after the scan completes; cancelling leaves previous work intact.

When a regular service work-PDF is opened, the test extracts its embedded original drawing and project information and starts empty detector controls. Cached copies, learned samples and completion flags are ignored when opening a source drawing. Test work-PDFs use `SecurityDetectorTestWork` and preserve the example, controls and positions. Drawing links point to individual detector reports. A saved test work-PDF opens directly without a new-service prompt; an explicit new service keeps positions and connections while resetting checklist status. The number boxes use the existing Security Service `COLORS` palette in both the UI and exported PDF: gray for untested, green for approved, amber for action and red for failed, with white text and a black rectangular border. No customer PDF or private QA fixture is bundled.

## Validation

- `node tests/detector-size-test.cjs`: independent and rotated axes, saved baselines, reset, text fitting, size bounds and position identity after enlargement.
- `node tests/detector-state-test.cjs`: first-open isolation, legacy-test continuation, strict saved-file precedence, stale-cache rejection, portable positions/results and setup readiness.
- `node tests/detector-scan-test.cjs [optional private original PDF]`: vector numbers, native rotation, duplicate positions and isolated work metadata.
- `node tests/detector-appearance-test.cjs`: raster borders, learned scale, variable number lengths, rotated frames, invalid profiles and open/oversized-frame rejection.
- Browser QA: sample confirmation, the private original drawing, a generated alternate drawing with disconnected frame strokes, image-only OCR, independent same-number controls, repeat scans, cancellation, work-PDF save/reopen, per-drawing example reset, manual add/move, desktop and narrow-screen selection.

TEST 0.3 browser QA additionally verifies exact existing status colors in markers/PDF, no second scan after save/reopen, no links crossing between different PDFs with the same filename, portable reopening with local test history cleared, optional Sök fler, and a new service preserving connections while resetting status.

TEST 0.4 fixes the source-fingerprint resume behavior. The browser regression opens the supplied service PDF after scanning it, after closing it, under a different filename and as its embedded raw original; all start with zero controls and no learned sample. An explicitly saved test-PDF still restores its own positions and results. Customer drawing coordinates remain fixture data outside the shipped app, not built-in templates.

TEST 0.5 browser QA verifies automatic manual-size controls, independent width/height at 270° rotation, one-step undo of slider gestures/reset, reopening an existing box for adjustment, preserved size after moving/rescanning, separate sizes for duplicate numbers, view rotation, work-PDF save/reopen and exact rectangular PDF link bounds. Mobile layout and the existing-object button were checked through the browser.
