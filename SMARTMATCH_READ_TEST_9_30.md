# SmartMatch Avläsning TEST 9.30

Problem: 9.29 created only the GS work list and discarded other structured products. A missing installer looked like a missing product.

9.30 stores a separate `products` inventory on each source card, including category, product/model, source quantity, group and installer. Only exact GS installer rows become automatic work items. Supplier GS never implies installer GS. DT, ambiguous and blank installer cells remain visible in the inventory. Unresolved columns still require review before accepting work; original text remains available.

The reader now requests the whole product table. The same inventory is used during import, subsequent product reading and single-card rereading; it is copied to aliases and included in existing portable PDF data. Existing checklist keys, per-position overrides and custom points are preserved. Review and the linked door show All products separately from the GS checklist. Simple aligned two-column cards without an installer retain candidate products but create no automatic GS work.

Existing manual checklist add/edit/remove controls remain. Editing now supports explicit same-source-card scope, defaulting to the current position. Töm kontrollistan hides base points and removes custom work only for the selected door, preserving original product data and extra-time entries.

Files: new versioned reader/work/main/session/page; older 9.29 files unchanged. Current test alias points to 9.30. Offline cache revision adds the new modules. Stable shared modules remain versioned 9.29. Internal build 36.173.

Validation:
- node tests/smartmatch-read-products-v9-30.cjs
- node tests/smartmatch-read-work-v9-30.cjs
- browser work/persistence suite on desktop and emulated iPad: grouped rows, wrapped cells, inventory through PDF save/reopen, checks/time, old key migration, failed reread protection
- custom point browser suite: scope, edit, clear selected door, extra time and independent checks
- offline browser suite: versioned and current test assets cached and fetchable without network
- single-card reread browser suite: only selected source read, additions preserve edits/checks/time

Browser checks use generated PDFs and Chromium, not physical Safari or the user's full project PDF. OCR recognition accuracy on new scans still requires comparison with their originals; this release changes parsing, inventory and work handling, not the OCR engine.

DS/DA replica symbols are shown only on iPad/iPhone, including iPad desktop-mode user agents. Desktop gets no overlay symbols or equipment-index read. PDF source content is unchanged. Verified with desktop, iPad portrait/landscape and iPhone browser profiles.
