# SmartMatch 9.100.14: pick the selected physical GS

Root cause: chooseOnDrawing discarded pwDAGsSelect and located the automation instead. Selecting a suggestion only updated the dropdown, so the saved arrow remained unchanged; the screen gave no arrow preview or immediate confirmation action.

The drawing picker now preserves the exact selected physical position ID, locates that GS, outlines it and draws a dashed preview arrow. A small guide offers Koppla till GS45 and Avbryt. Clicking another GS changes only the preview. Confirmation runs the existing door-card compatibility checks and stores the link; the arrow becomes solid. Cancel restores the existing saved arrow. Drawing/placement tools are stopped before picking. Escape and project/dialog changes clean up the picker. Wrong-page clicks keep selection active; stale async confirmations cannot overwrite a canceled selection. Checks, SLR data and existing numbering rules are unchanged.

Automated regression: two physical GS45 positions, selected rather than nearest target, arrow endpoint at 2x zoom, manual retargeting, page guard, cancel, declined compatibility, stale async confirmation, saved link and retained checks/SLR. Existing text/automation regression also passes. JavaScript syntax passes.

Browser integration fixture executes the actual DA module with synthetic bridge data. Selected GS45 position 2 while the saved target was GS46; Peka ut GS showed a dashed arrow and position-2 guide. Confirmed Koppla till GS45; the rendered path had data-gs-id=45-right, no preview dash, and the status named GS45 position 2. No customer PDF used. Local fixture is excluded from publication. This does not reproduce the user's exact project file, which was not provided.
