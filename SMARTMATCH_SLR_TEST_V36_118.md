# SmartMatch SLR test 36.118

The form editor is mounted directly below the selected category, with Close editing both in the category row and at the editor heading. Closing invalidates pending renders and hides the editor while preserving stored per-door answers. Rebuilding category rows preserves the mounted editor and its live inputs. The upload action is labelled Ladda upp mall / Ersätt mall; replacement applies to the shared project template.

The product PDF has two columns, Produkt and Typ / modell, grouped by the populated door-card sections. Only labelled products with nonempty, non-dash values and GS, DT or EL responsibility rows are used. The value column is identified from repeated text coordinates; only contiguous value text from that column is retained. Administrative metadata, later detail columns, responsibility columns, comments and the original door-card page are excluded. Additional control items are taken from the current automation or its exact verified GS marker, never another floor. No completion claim is inferred from a populated specification value.

Older product PDFs are retained in saved projects but require Uppdatera PDF before previewing in this version. New product format and row count persist in the attachment manifest. No source PDF fixtures or user drawings are committed. Uploaded editable templates and independent per-door fields/signatures remain embedded in the project, together with static output attachments. Project page count stays unchanged.

Validation: syntax; editor mount/redraw/close/reopen model; synthetic GS/DT/EL rows, empty/dash rows, own controls and ambiguous/unreadable refusal; 15 real door cards inspected locally, including the 14-product two-column extraction on card 11; visual rendering of its one-page product PDF with two own items; four actual uploaded SLR template fixtures for static export, A/B independence and PDF attachment save/reopen. Live Safari editor interaction was not tested.

Commands from repository root:

- `node tests/slr-editor-v36-118.cjs smartmatch-slr-test-module-v36-118.js`
- `node tests/slr-product-list-v36-118.cjs`
- `node tests/slr-documents-v36-118.cjs smartmatch-slr-test-module-v36-118.js /path/to/private-fixtures` (description.pdf, logbook.pdf, declaration.pdf, selfcheck.pdf)
