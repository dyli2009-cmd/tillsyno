# Detektorer TEST 0.1

Entry: `detector-scan-test/all-in-one.html`, linked from the existing home-page Testversioner panel. The production Security Service runtime is unchanged.

`security.js` is an isolated snapshot of the Security Service runtime at `c543286`, with separate local-storage prefix, PDF metadata key and app identity. `test.js` supplies the test controls and number-box rendering; `core.js` reads black rectangular vector frames and the numeric text inside them. Short numbers and leading zeros are retained. The scanner uses the PDF viewport coordinate system, including native PDF rotation. View-only rotation is applied when rendering or placing markers.

Each physical occurrence has a UUID, page, center and box dimensions. A number is a display label, never the identity. Rescanning checks page and position and preserves existing IDs, manual edits and control results. Manual placement, moving, deletion/undo and the existing checklist controls are available.

When a regular service work-PDF is opened, the test extracts its embedded original drawing and project information and starts empty detector controls. Previously saved test work for that drawing is resumed locally. A test work-PDF preserves its own detector controls and positions and uses `SecurityDetectorTestWork`, not production metadata. Its drawing links point to individual detector reports.

This first test scans digital vector rectangles with extractable numeric text. Image-only pages and unreadable pages are identified in the result message and can be handled manually; OCR is not implemented. No drawing or customer PDF is bundled with the test or uploaded during scanning.

Validation: `node tests/detector-scan-test.cjs`. An optional private original drawing may be passed as the next argument for the Friskis fixture assertion. Browser QA also covers real source extraction, 32 labels, duplicate 1025 positions, repeated scans, independent status, save/reopen, manual placement/moving, checklist undo and narrow-screen layout. Private fixtures and QA pages are not committed.
