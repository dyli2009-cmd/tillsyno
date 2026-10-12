# SLR test 36.117

Templates are supplied only by the user through the local file picker. No built-in template URLs or PDF assets remain in the current repository tree. Prior commits still contain the blank templates introduced in 36.116; history was not rewritten.

One shared editable source template per category is embedded in the project PDF. Each automation has independent answers and signatures. Static per-door documents and verified product lists are stored as PDF attachments, not appended pages. Preview uses the same flattened document composition as saved attachments. Text appearances are black; source dotted lines are retained. Signature widget shells and the AcroForm tree are removed from final outputs. The source template remains editable within the app.

Egenkontroll uses manufacturer Dorma, model ED100 for the known Dorma ED 100 machine. Drivsystem serienummer retains its internal key for compatibility but displays Maskin-ID and follows the selected automation designation.

Validation: four real uploaded template fixtures, zero widget annotations and no AcroForm in static outputs; black text color verified by rendered-PDF text spans; visual review; independent A/B dates/checks/signatures; source pages unchanged after project save; four shared sources, eight static documents, one per-door product survive attachment save/reopen. No live Safari editor test.
