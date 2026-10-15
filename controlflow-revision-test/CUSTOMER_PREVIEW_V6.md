# Kundmallens ritning och pennblå signatur – TEST v6

Beställt 2026-10-15. Endast den separata revisionstestappen ändras.

## Samma ritning i kundmall och exporterad PDF

Tidigare ritade kundmallens ritningsvy en egen canvasversion av markeringarna med mindre text. PDF-exporten använde redan v4:s 50 procent större automatiketiketter. De två renderingarna såg därför olika ut.

TEST v6 bygger ritningssidorna med en gemensam PDF-funktion för både förhandsvisning och export. Kundmallen renderar denna PDF direkt, utan en extra canvasritning av etiketter och pilar. Textstorlek, ram, pilspets, färg, positioner, textanteckningar, ritverktyg och valda protokoll följer därmed samma ritning som kunden får. Sidvalet och A−/A+ i förhandsvisningen behålls.

Automatiketiketternas exporterade storlek är fortsatt 16,2 punkter, respektive 13,8 punkter för långa ID. Ingen ändring görs av markeringarnas storlek i arbetsvyn. Kundmallens protokoll, rubriker, etiketter för bokat datum/anläggning/serviceföretag/placering/AO och deras typsnitt lämnas orörda enligt användarens sista instruktion. Endast signaturtextens färg ändras.

## Signatur

Handskrift och textsignatur får pennblå färg `#3b82c4`. Nya pennstreck har rundade ändar och något tydligare linje. Äldre transparenta signaturbilder färgas om utan att ändra form eller mått. Förhandsvisning och export väntar in eventuell färguppdatering. Signaturen sparas fortsatt i projektet och återanvänds på alla protokoll.

TEST v5 finns kvar i `v5/all-in-one.html`. V1–V5:s runtime-filer och den låsta gamla importen är bevarade. Projektlayouten från v5 behålls. Ordinarie Kontrollflöde och iOS ändras inte.

## Verifiering

`tests/controlflow-customer-v6.cjs` jämför den faktiska kundmallscanvasens pixlar med motsvarande sida i en nedladdad arbets-PDF: ingen pixelskillnad på stående och roterad ritning, korta/långa ID, telefon, olika statusfärger, anteckningar, ritverktyg och valda protokoll. Testet kontrollerar också signaturfärg, omfärgning av sparad signatur, projekt-/PDF-återöppning, textalternativ, kundmallens befintliga teckensnitt, tom AO-ruta, fet ID-märkning och tillbaka-länk. Ritning och protokoll har renderats och granskats visuellt. Fysiska iPhone/iPad är inte testade.
