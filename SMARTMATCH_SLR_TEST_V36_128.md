# SmartMatch SLR TEST v36.128 – zoomanpassad status och kompakt SLR-lista

## Beslut 13 oktober 2026

Egenkontroll-/SLR-etiketterna ska ta mindre plats när ritningen zoomas ut. Ungefär 210 % används som referens för den tydliga, större storleken. Egenkontroll ska ligga vid vänsterkanten och SLR vid högerkanten på respektive markering. SLR-mapparna ska vara mindre, mobilanpassade och ligga i en kompakt lista, med tydligt utfällbara mindre verktyg.

## Byggt

Statusetiketternas storlek följer ritningens zoom relativt 210 %, med ett övre tak vid referensstorleken. Vid 50 % är etiketterna cirka 24 % av denna storlek; vid 100 % cirka 48 %. Den gröna statuslinjen krymper också vid utzoomning. Egenkontroll är fäst utanför vänsterkanten och SLR utanför högerkanten; bakgrunder, separata procent och anmärkningsvarning behålls. Koordinater, GS-pil och kontrollberäkning ändras inte.

SLR-dialogen anpassar höjden efter innehållet och har en maximal bredd på 660 px. Mobilen använder liten sidmarginal och högst 90 % av skärmhöjden. En mapp per rad, mindre mappsymbol, kompakt procentsiffra och liten öppningspil. Stängda mappar visar namn och status; öppnad mapp visar sina verktyg direkt under rubriken. Verktyg och slutknappar är mindre. Redigeringsknapparna heter Ändra standard och Endast denna dörr, med samma befintliga redigeringsomfattning. En kort instruktion säger att mappen öppnas för att visa verktygen.

## Avgränsning

Endast separat SLR TEST v36.128:s presentationskod och fasta smartmatch-slr-test.html uppdateras. v36.127 finns kvar som återgång. Ny lokal versionsnyckel; befintligt arbete tas med via projekt-PDF. SLR-data, mappgranskning, filstorleksanalys, sparning/PDF-export, GS-regler, ordinarie app och iOS/TestFlight är oförändrade.

## Verifiering

JavaScript-syntax godkänd. Faktisk renderDASplitProgress körd i Chromium vid 50/100/210 % zoom; etikettbredder minskar proportionellt och procentvärdena behålls. Faktisk SLR-modul och komplett CSS körda med syntetiska PDF-mallar. Mobil 390 × 844: dialogen är 378 px bred och cirka 545 px hög med stängda mappar, jämfört med tidigare nära helskärm. Riskanalys öppnas med verktyg direkt under sin rubrik. Mobilbilder och datorvy 1000 px visuellt kontrollerade. QA-filer och bilder publiceras inte. Full kundritning med verklig iPhone/iPad-pinch återstår att prova.

