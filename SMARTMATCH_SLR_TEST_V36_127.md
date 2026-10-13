# SmartMatch SLR TEST v36.127 – filstorlek under Analys

## Beslut 13 oktober 2026

Visa hur stor den öppnade PDF-filen är under Analys, med en enkel analys av filstorleken.

## Byggt

Analys & rapporter visar ett separat Filstorlek-kort med filnamn, MB, exakt byteantal och sidantal. Knappen Analysera filstorlek uppdaterar samma mätning. Storleken läses direkt från den öppnade PDF:ens bytebuffert, inklusive bilagor som finns i filen. Ingen export, PDF-omskrivning eller omskanning behövs.

Visningen är uttryckligen märkt Öppnad PDF. Ändringar som ännu inte har sparats ingår inte i den filstorleken. Öppna en sparad PDF igen för att mäta dess nya storlek. Ingen uppskattad framtida exportstorlek visas. Utan öppnad PDF visas Ingen PDF öppen och analysknappen inaktiveras.

## Avgränsning

Endast separat SLR TEST v36.127:s analysvy och fasta testadress uppdateras. v36.126 bevaras som återgång. Versionsfilerna och lokalnyckeln följer v36.127; sparad projekt-PDF innehåller tidigare arbete. SLR-/egenkontrollberäkning, sparning/export, ritningskoppling, ordinarie app och iOS är oförändrade.

## Verifiering

JavaScript-syntax godkänd. Faktisk prettyPdfSize/smartRenderFileSize och komplett CSS körda i Chromium: 147 849 216 byte visas som 141,00 MB; uppdatering till 1 MB och nytt filnamn fungerar; stängd PDF rensar gammal storlek och inaktiverar knappen. Mobilvy 430 px visuellt kontrollerad. Inga kundfiler eller QA-bilder publiceras. Funktionen mäter bufferlängden direkt; detta är inte ett öppnings- eller prestandatest av en verklig 141-MB-kundfil.

