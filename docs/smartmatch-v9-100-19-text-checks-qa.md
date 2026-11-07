# SmartMatch 9.100.19

## Changes
- Preserve nested checklist/canvas scroll while measuring automatic window height. Await protocol data before clearing the previous list, and ignore stale renders from another door/document.
- Hide the secondary Avlästa produkter inventory in the door window. Group reread and list deletion under Liståtgärder. Rename Rensa alla to Avmarkera alla.
- Koppla text under Övrigt selects a drawing region, reads native PDF text first and uses bundled local OCR only for image regions. The operator can correct the name. Positions have independent pending/done/open states and comments.
- Transparent hit regions retain original PDF text. Status badges scale with the marked region. Textkontroller appears in Positioner, with a name search and navigation to the drawing.
- Text checks persist in project metadata and local drafts. They are independent of timed door products. Closing/changing documents cancels pending work and rejects writes to a stale PDF.
- Center page/save-state information with theme-based colors.

## Validation before deployment
- Browser reproduction with 50 synthetic product rows and actual production list/window code: previous window code jumps from scrollTop 1693 to 0; patched code remains at 1692 (one pixel from layout rounding).
- Browser feature harness: native text selected, editable name, open status and comment persisted after reload, marker and Textkontroller entry visible.
- Node regression: selection coordinates/read order, input validation, save bridge, stale document guard, actual project payload roundtrip, separate door totals and scroll clamp regression.
- Existing completion/time/GS-link/undo/zoom tests pass. JavaScript syntax passes.

## Limits
- Browser tests use synthetic content, not customer documents. Physical iPhone/iPad performance is not measured by desktop viewport testing.
- Badges are interactive SmartMatch project state; this change does not flatten them onto an ordinary PDF for external readers.
