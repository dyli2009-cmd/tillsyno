# Avläsning 9.90 – sök en beteckning och koppla flera stämplar

Öppna kortets rad och välj **Sök / koppla manuellt**. Sökfältet fylls med kortets kod, exempelvis GS31. **Sök på alla ritningssidor** söker hela beteckningen i projektets ritningssidor; dörrkortssidorna utesluts. **Sök även i bilder** är förvalt för att även kunna hitta skannade stämplar. Bildsökning tar längre tid och kan avbrytas utan att tidigare kopplingar försvinner.

Träffarna samlas med antal per sida, kryssrutor och **Visa** för kontroll på originalritningen. Nya träffar väljs från början, utom tidigare avmarkerade positioner. **Koppla N valda till GS31** kopplar hela det granskade urvalet samtidigt. Redan kopplade positioner dubbleras inte; positioner kopplade till annan kod eller tidigare borttagna går inte att välja här. Den vanliga manuella rutmarkeringen finns kvar.

Sökfältet får uttryckligen avvika från kortets beteckning: användaren kan söka den tryckta texten `DBL b-upps` och koppla valda resultat till kortet DBL B uppst. Det är användarens uttryckliga val, ingen automatisk namnlikhetsregel. GS31 får inte matcha GS310, GS31A eller SGS31.

Alla valda placeringar valideras innan något skrivs till matchningen. Ett fel mitt i urvalet ger inga delvis sparade nya kopplingar. Resultatet är bundet till PDF, kort, söktext och kortsida; inaktuellt resultat måste sökas om. Kopplingar och deras avmarkeringar sparas genom befintligt flöde och följer med till ritningsvyn samt senare omsökningar.

På iOS används begränsade bilddelar och sidor bearbetas i följd med frigöring av bildresurser och OCR-motor. Även där omfattar den nya sökningen alla ritningssidor; ingen dold begränsning till den visade sidan.

Verifierat:
- `tests/smartmatch-read-bulk-v9-90.cjs`: faktisk kontrollkod med kontrollerade söksvar; full sidomfattning, bildläge, urval, exakt kod, alternativ söktext, atomär validering, dubbletter, konflikter, sparande/återöppning, fel och avbrott.
- `tests/smartmatch-read-code-search-v9-90.cjs`: riktig PDF-rendering med tre ritningssidor och två dörrkort; samtliga GS31 hittas och GS310/GS31A/SGS31 utesluts.
- `tests/smartmatch-read-manual-v9-90.cjs` och `tests/smartmatch-read-handoff-v9-90.cjs`: tidigare manuella kopplingar, status, räknare och överlämning.
- Syntax och HTML-resurser kontrollerade. Ingen full webbläsarverifiering med användarens verkliga projekt-PDF; faktisk OCR-träffsäkerhet för dess saknade stämplar är inte bekräftad.
