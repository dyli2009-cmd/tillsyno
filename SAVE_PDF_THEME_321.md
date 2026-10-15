# Tillsyno v2.4.321 – Spara PDF följer valt tema

Beställd rättning: användaren såg mörkblått vid Spara PDF efter att sidövergången rättats. Sparrutans .secSaveHead och huvudalternativ hade fortfarande fasta blå färger, även när en ljus palett valts.

Sparrutans yta, rubrikrad, stängknapp, arbets-PDF-/ny-PDF-alternativ, ikoner och sekundärtext använder nu samma temavariabler som resten av appen. Backdrop använder vald sidfärg. Ingen ändring av dialogens placering/storlek, filnamn, exportkod, PDF-innehåll eller projektformat. Samma CSS i webb/native och rot/revision.

Verifiering: den mörkblå rubriken återskapad från v320. Riktig PDF laddas, Spara PDF öppnas via ordinarie knapp och färger kontrolleras i revisions- och säkerhetsflödet för alla sju paletter och telefon/iPad/dator. Arbets-PDF laddas ned och öppnas med PDF-lib. Webbläsarsimulering; ingen fysisk enhet eller TestFlight-build verifierad.
