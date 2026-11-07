# SmartMatch 9.100.13 QA

Scope: workspace popup windows and drawing-text activation. No generated sketches. Existing object/machine/count identification rules remain unchanged.

Reports, linking, time, card and workspace dialogs receive a draggable header, resize edges, minimize, maximize/restore and close. Preparation initially opens maximized. Inline text editing uses the same window controls. Confirmation dialogs retain their existing blocking lifecycle; unrelated dialogs are not opted in.

Browser layout tests used the actual app HTML/styles in a local fixture without auth/data execution. Reports moved from x545 to x505 and resized from 800x650 to 523x517 through keyboard and pointer. Maximize became 1347x872 in a 1363x888 frame. At 390px width the linking window was clamped to x8/width374, with no horizontal body overflow. Preparation started at x8/y8 with the full available size. Physical iOS devices were not used.

Regression test smartmatch-windows-notes-v9-100-13.cjs covers explicit and legacy text links, ambiguous overlaps, page isolation, geometry sync, single/double-click activation, valid and invalid number formats, repeated linking without duplicate automation records and preservation of existing checks. The existing G8 time/quantity regression suite remains green. Changed JavaScript syntax checks pass.

The text hit target now opens the attached automation; double activation opens editing. Save exits the text tool. Spara och koppla DA creates or reuses the same automation record. A placed selection can read saved text overlays as well as PDF text. Note/automation IDs are stored in the existing project payload, alongside their current geometry.

Local preview fixtures are excluded from publication. Production interaction checks follow deployment.

Production verification on GitHub Pages: entered 151551-1-15-1 using Text, selected Spara och koppla DA, and received Egenkontroll / SLR choices. Single click opened choices; double click opened editing. Klar disabled the text tool. Dragged the label 130 screen pixels and reloaded: the link and moved position survived. Both Egenkontroll (model 15 resolved to Besam Powerswing) and SLR opened for the same ID. Preparation rendered maximized with the original PDF and review rail. Reports resized by pointer to 470x450 at x17/y78 while the drawing and DA text remained interactive. No customer file used. The two-choice DA window starts at a compact 240px height.
