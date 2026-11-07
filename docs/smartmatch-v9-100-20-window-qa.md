# SmartMatch 9.100.20

## Cause and correction
The card display-area editor created an anonymous dialog. The workspace shell treated it as a blocking full-page view at z-index 11000 while the existing door window remained above 12000. The inaccessible editor made the drawing inert.

The editor now has the stable ID pwCardViewDialog and the shared window manager also recognizes its class. It opens as a floating, draggable, resizable window with one close control, minimize and maximize. Its PDF preview fits the available window size. The text/pointer editor is mounted at the body level so drawing stacking contexts cannot trap it underneath other windows. Saving a display crop rejects a changed project, and avoids repainting another selected door.

The Tools menu and Select active state now use theme variables. Text editing controls and display-area controls follow the same theme. Document color swatches preserve actual annotation colors. A scoped CSS layer resolves legacy high-specificity global button overrides, including text-check status colors. List maintenance buttons now align to one width without the old delete-button margin.

## Verification
- Reproduced the original blocking state in the published app: unnamed card editor z=11000, door z=12053.
- Browser harness with production card editor/window manager/CSS: child opens at a higher z-index, floating=true, one close control, dark-theme text readable, save closes the editor and returns to the door. Tested 390 px and 768 px frames; no form overflow observed.
- Dark Tools menu uses rgb(16,38,56) background and rgb(229,238,245) text.
- Node tests: card save, changed-project guard, selected-door guard, existing checklist/comments, local text checks, scroll preservation and note/GS links.
- 9.100.19 production smoke test: marked native PDF text, corrected name, saved open/done status and comment, opened from Positioner, reloaded successfully. Downloaded project PDF contains the same textChecks in both supported metadata dictionaries.
- Physical iOS device performance was not measured in this environment.
