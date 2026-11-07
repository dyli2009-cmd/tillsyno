# SmartMatch 9.100.12 — design QA

Selected direction: third proposal, “Verktyg nära handen”, revised to put Koppla stämplar in Övrigt. Reference: exec-7c41fa14-d599-4827-a490-4b9eb7b4dc8c.png. No further generated images.

Implemented in the existing application: bottom dock Välj / Verktyg / Tid / Övrigt; existing tools and handlers retained; product-reading actions confined to preparation; conditional missing-card review moved to Övrigt. Stamp linking is a draggable floating window above the drawing, becoming a scrolling bottom sheet on phones. The current app theme is reused.

Local browser QA used the actual HTML, styles, compact controls and new dock scripts in a local fixture with synthetic PDF artwork. Authentication and runtime data handlers were omitted only in that fixture. This fixture is excluded from the deployment. It is layout evidence, not an end-to-end application test.

Observed at 1363px, 834px and 390px widths in desktop Chromium: four main actions visible and ordered correctly; More opens and linking opens; phone sheet leaves drawing and toolbar visible; iPad-width panel moves from left 254/top 72 to left 47/top 113 with pointer drag. Desktop tools menu renders above the dock. Fixed legacy CSS hiding Time and reordering controls, and limited the phone linking sheet to 60dvh after screenshot review.

Differences from the visual reference: actual PDF rather than decorative drawing; existing page/zoom/history controls retained; phone retains a separate compact history/page row. The toolbar follows the approved four-action arrangement. No physical iPhone/iPad or Safari test is claimed.

Verification: five changed JavaScript files pass node --check. New regression test covers four G8 at 20 minutes = 80 minutes; done/left, zero/missing times, pairs, packages, unlinked planned rows, immutable snapshots and changed scan quantities. Existing material-overview regression cases pass.

Release commit: 8a1131e76b2453c3a26415acbd432045a6d983dc. Production browser verification is recorded after Pages deployment below.

Production Chromium verification: version 9.100.12 loaded with the existing synthetic four-G8 project. Editing its product to TEST-350 and time to 20 minutes for all G8 positions gave door time 20 minutes and project time 1 hour 20 minutes / 4 units. More contained stamp linking and preparation; no zero-card review button was visible. The real linking dialog opened without hiding the drawing. No customer project was used.

One final legacy selector still hid tool SVGs despite the labels surviving; the scoped selector was increased to override it. Browser layout recheck confirmed the Text SVG displayed at 21 × 21px. The stylesheet URL is cache-busted for this correction. Remaining limitation: physical touch gestures and Safari rendering have not been tested on devices.
