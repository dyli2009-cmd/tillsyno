# Tillsyno v2.4.326 – tydlig ritningsstart på dator

Beställt 15 oktober 2026: efter val av dörrautomatik-/låschecklistor ska rubriken på ritningssidan visa aktuellt område och alla valda checklistor, och datorns ritningsstart ska förstoras.

Produktionsrevisionens protokollväljare uppdaterar endast DOM-rubriker från det befintliga aktiva protokollvalet. Områdesnamn hämtas från mapparna och checklistnamn från deras etiketter. Datorn visar t.ex. Dörrautomatik / Lås med Checklista revision dörrautomatik · Egenkontroll dörrautomatik · Checklista revision lås på raden under. Även blandade områdesval stöds. Vid mindre skärm, touch eller uttryckligt telefon-/surfplatteval återställs originaltexterna. Ingen ändring av protokollval, projektformat, export eller data.

CSS är avgränsad till dator med aktiverad protokollkontext: större topprubrik, synlig checklistrad, större Välj en ritning och Öppna PDF samt rymligare rubrikknappar. Färger och övriga arbetsvyer bevaras. Nödvändig cache-/versionshöjning, speglad iOS-källa. Kontrollflödet är åter låst.

Verifiering i Chromium: 27 kontroller över sju teman på två datorstorlekar, telefon/iPad/liggande iPad/surfplatteval med mus samt fem olika protokollkombinationer. Åtta före/efter-bilder för telefon/iPad är pixelidentiska. Växling till mindre/större fönster återställer respektive uppdaterar kontexten utan att ändra protokollval. Ingen horisontell överströmning eller runtime-fel. Riktig genererad PDF inläst och exporterad igen med korrekt protokollrubrik. Datorbild granskad i ljust och mörkt tema. Ingen fysisk enhet eller signerad TestFlight-build verifierad.
