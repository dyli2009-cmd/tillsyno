# Revisionsimport – låst arbetssätt 1

Status: **LÅST AV ANVÄNDAREN 2026-10-15** efter genomgången av grundlogiken i TEST v1. Låset gäller befintlig import. Ordinarie Kontrollflöde förblir orört.

Referens: TEST v1, grundkopia av Tillsyno 2.4.308, `snapshot.json`. Befintlig `legacy-door-import.js`, referenshash och jämförelsetester ska bevaras.

## Godkänd funktion

1. P/GoTo-länken väljer rätt gammalt revisionsprotokoll. Protokollets fullständiga maskin-ID identifierar objektet.
2. Samma fullständiga ID matchas mot ritningens märkning på samma sida. Exakt ID prioriteras framför avstånd, även om textrutan ligger långt från P-knappen.
3. En användbar kopplad FreeTextCallout anger dörrpunkten med pilspetsens koordinater. Textrutans position anger etikettens placering. Båda följer ritningens sidkoordinater.
4. Befintliga reservregler bevaras: utan exakt ID-match kan närmaste läsbara märkning inom befintlig avståndsgräns användas; utan användbar kopplad pil kan P-knappens läge användas. Reservplacering får inte beskrivas som verifierad exakt pilkoppling.
5. Kända dörr- och projektuppgifter läses enligt befintliga fältregler. Objektnummer, maskintyp, placering, beställare, utförande företag och kontaktuppgifter bevaras enligt befintlig implementation.
6. Den nya arbetsfilen använder appens revisionschecklista med 18 kontrollpunkter och appens markeringar/protokoll. Uppladdad original-PDF skrivs inte över.
7. Fortsätt återöppnar sparat arbete. Ny service nollställer dagens kontrollsvar, anteckningar, åtgärdsbekräftelser, order och signatur enligt befintlig funktion. Grunduppgifter, tekniker, logga och objektpositioner behålls; tidigare anmärkningar blir historik.
8. Checklistans innehåll, ritningsvy, kundmall och PDF-export får inte ändras som följd av en ny importprofil.

## Nya arbetssätt

Nya PDF-upplägg ska få **separata läsprofiler**, med egen identifiering och egna tester. De får inte ändra den låsta importens matchning, reservregler, prioritet eller koordinatberäkningar. Okänd fil får inte väljas som känd profil enbart för att några nummer liknar varandra.

Profilen för ritningspilar utan P-länkar och protokolluppgifter i textmarkeringar godkändes för separat implementation och publicering i TEST v2 den 2026-10-15. Den är **inte en ändring i arbetssätt 1 och låses inte genom detta dokument**. Se `IMPORT_PROFILE_V2.md`. Kontrollera hela maskin-ID:t innan en sådan koppling betraktas som säker. Avvikande ID kräver synlig avvikelse och ett uttryckligt manuellt val.

Den låsta funktionen får endast ändras efter en ny uttrycklig beställning från användaren. Uppdatera inte versionssiffror eller referenshashar för att kringgå låset.
