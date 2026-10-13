# SmartMatch SLR TEST v36.126 – tydligare Egenkontroll-/SLR-status på ritningen

## Användarbeslut 13 oktober 2026

Procenten för Egenkontroll och SLR ska synas tydligare mot ritningen. Lägg bakgrund bakom procentetiketterna och gör den gröna statuslinjen tjockare.

## Ändring

- Två separata procentetiketter under automatikens markering, med kontrasterande bakgrund, kant och diskret skugga.
- Etikettnamn 9,5 px och fet procentsiffra 11,5 px; samma läsbara storlek på mobil. Etiketterna får sin naturliga bredd i stället för att pressas in på varsin halva av en liten märkning.
- Statuslinjen är 3,1–4,5 px i stället för cirka 1,55–2,5 px. Mörkare grönt och en ljus kontur förbättrar kontrasten mot PDF-linjer.
- Grå etikett vid 0 %, ljusgrön vid framsteg och orange anmärkningsetikett med utropstecken behålls. Varje halvas procent och pil-/objektplacering är oförändrade.

## Avgränsning

Endast separat SLR TEST v36.126:s presentationskod, nya versionsfiler och fasta smartmatch-slr-test.html uppdateras. Egenkontroll-/SLR-beräkning, granskning, delade uppgifter, PDF-exportlogik, GS-regler, ordinarie app och iOS/TestFlight ändras inte. Tidigare v36.125 är kvar som återgång. Ny lokal versionsnyckel; sparad projekt-PDF bär tidigare arbete.

## Verifiering

JavaScript-syntax godkänd. Den riktiga renderDASplitProgress-funktionen och kompletta versions-CSS:en kördes i Chromium med tät syntetisk ritningsbakgrund. Visuell granskning vid 430 px mobilbredd och 1050 px datorbredd, med separata procent för 25/50 %, 100/100 % och 75 % med anmärkning/0 %. Etiketterna har bakgrund, procenten är större och halvorna visar skilda värden. Fullständig kundritning på användarens iPhone/iPad återstår att prova. Inga QA-bilder eller kundfiler publiceras.

