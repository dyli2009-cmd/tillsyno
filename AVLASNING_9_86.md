# Avläsning 9.86 – hela färgade stämplar

Appens ordinarie Avläsning-knapp öppnar smartmatch-read-v9-86.html.
Tidigare testsidor och deras JavaScript är oförändrade. Version 9.86 återanvänder
9.85:s projekt-, material-, spar- och kontrollfunktioner.

Sökningen identifierar sammanhängande färgade bakgrunder i överlappande,
minnesbegränsade rutor. Hela beteckningen inom varje stämpel läses i radordning.
Det gör att WC / DS och DBL / B uppst kan kopplas utan att första raden blir
ett separat WC- eller DBL-kort. Rumstext utanför stämpeln ingår inte i koden.
Vid markerat exempel används dess färg och form. Textläget granskar färgen
men startar ingen OCR. Sök även i bilder läser även bildstämplar som hela
textblock, med flera rader. Olika bokstäver jämställs inte: UPPST och
OPPS kräver fortsatt rätt beteckning eller en uttrycklig manuell koppling.

Befintliga sparade kopplingar räknas inte om vid öppning. Använd Positioner →
Koppla och granska nya träffar för att komplettera ett befintligt projekt.
iPadens uttryckliga bildsökning är fortsatt begränsad till markerad sida.

Verifiering: node tests/smartmatch-stamp-reading-v9-86.cjs använder verklig
PDF.js 3.11-rendering, genererad vektor-PDF och Canvas. Kontrollerar DBL med
intilliggande text, WC DS, DBL B uppst, DBL DS, GS1, GS2, tvåfärgsurval,
flerradigt exempel och skydd mot delbeteckningar. Befintligt iPad-test körs
också mot nya matcharen för att kontrollera sidgräns och minnesfrigöring.
Raster-PDF testas med verklig rendering och en simulerad OCR-respons: hela
textblocket läses med två rader. Själva OCR-motorns träffsäkerhet är inte
verifierad av det testet.

Användarens skärmbild är underlag; den faktiska ritnings-PDF:en finns inte i
underlaget. Det är därför inte verifierat att samtliga missade positioner i
den filen hittas. Svaga färger, överlappande stämplar, väldigt stora stämplar
som skärs av rutgränser samt bildläsningens noggrannhet kan kräva manuell granskning.
