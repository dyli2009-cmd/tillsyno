# Kundmall – TEST v3

Beställd 2026-10-15. Ändringen gäller kundmall och exporterad revisionschecklista för dörrautomatik i den separata testappen.

- Rubriken är CHECKLISTA REVISION AV DÖRRAUTOMATIK.
- En ljus, rundad knapp med ritad vänsterpil och texten Tillbaka till ritningen ersätter den lilla mörka pilknappen. Den ligger under dokumenthuvudet och länkar till rätt ritningssida i exporterad arbets-PDF. Knappen fungerar även när man trycker på den i appens PDF-förhandsvisning.
- Anläggning, anläggningsnummer, serviceföretag, beställare och övriga projektfält på revisionssidan använder normal text. Rubrik och tabellhuvud behåller sin tydlighet.
- ID / märkning behåller fet text.
- AO-nummerfältet på revisionssidan är helt tomt. Projektets orderdata, orderfältet på översikten och inbäddade arbetsdata ändras inte.

Tidigare TEST v2 finns i `v2/all-in-one.html`. Gamla v1/v2-runtimefiler och båda importreglerna är oförändrade. V3 använder samma kompatibla lokala projektlagring som v2, så tidigare testarbete finns kvar. Ordinarie Kontrollflöde och iOS/TestFlight ändras inte.

## Verifiering

`tests/controlflow-customer-v3.cjs` genererar en riktig PDF och granskar text, teckensnitt och AO-rutans innehåll med PyMuPDF. Anläggnings-/företagsvärden är normala, maskin-ID är fetstilt, den nya rubriken och tillbaka-texten finns och AO-rutan är tom.

Testet klickar tillbaka-knappen i förhandsvisningen och kontrollerar att rätt ritningssida visas. Det verifierar även den exporterade PDF-länkens destination och att projektets ordernummer och objektens positioner är oförändrade. PDF-sidan har renderats och granskats visuellt.
