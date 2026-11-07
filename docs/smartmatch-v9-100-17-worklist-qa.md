# SmartMatch 9.100.17 – compact door worklist

## Observed issues and changes
1. Opening G8 on a phone showed one pane only. Both is now the initial mode on every open: original card on the left, checklist on the right. Card-only and checklist-only modes remain available at all sizes. The PDF refits on pane changes and resize release.
2. Existing mobile grid rules placed action buttons below product text and inflated rows. Scoped layout now holds four labelled icon buttons at the right, using two columns in narrow lists. Name and model share one heading; time and optional comment appear below. The checklist count, headings and tools menu are compact. Progress moved to the shared title bar; the time summary uses theme variables.
3. Comments use existing per-position overrides/custom item notes. The inline editor supports save/cancel, validates that the project and row still exist, and inserts user content as text.
4. Armbågskontakter, sensors and smoke detectors have outside/inside installation checks. Each side contributes half of quantity × unit time. Both sides set the main checkbox. Main checkbox and bulk mark/clear update both sides. Explicitly single-side rows are not divided a second time. Removed/excluded rows clear saved stages.

## Tests
- Node syntax checks: main, completion helper, window manager, material report.
- Domain/integration tests: both sides separately, main checkbox, reversal, legacy completed rows, quantity, missing times, separate G8 positions, project report, custom rows, actual makeProjectPayload → buildInstances roundtrip with stage and comment.
- Existing regressions: live door-card rates, pair/package quantities, four G8, links/notes and GS pointer selection.
- Browser fixture uses production checklist rendering, comment editor, completion calculation and window code; synthetic door rows only. Viewports: 320, 390, 768, 1180 px; no horizontal pane overflow. Both mode, card mode, comments, save/reload, outside=35 min and completing arm contacts=45 min, 1 of 5 complete. Mist/Coast/Sand surfaces checked.
- Prior screenshot: tall rows and card/checklist tabs without Both. New phone rows retain actions at right, native partial checkbox state, and comment under product.

## Boundaries
Browser checks are simulated viewport sizes, not physical iOS devices. A small phone necessarily makes the left PDF preview narrow; card-only mode and existing PDF zoom remain available. No full accessibility certification is claimed. Test fixture and its synthetic data are not published. Project data stays in the existing storage/export paths.
