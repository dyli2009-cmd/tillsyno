# SmartMatch Avläsning TEST 9.17

## Syfte

TEST 9.17 gör de redan länkade stämplarna läsbara på iPad utan att återinföra den tunga detaljrendering som fick Safari att starta om. Själva grundritningen får vara mjuk i det minnessnåla läget. Beteckningen vid en länkad dörr, till exempel `GS1` eller `GS2`, ritas däremot skarpt i ett separat etikettlager ovanpå ritningen.

## Så fungerar det

1. Öppna ett färdigt SmartMatch-projekt med sparade kopplingar.
2. Visa ritningen och zooma till dörren.
3. Grundritningen kan vara mjuk medan den laddas eller när projektet använder stabilt iPad-läge.
4. Den länkade stämpelns beteckning ligger kvar skarpt vid sin sparade position och följer zoom och panorering.
5. Tryck på den länkade stämpeln för att öppna samma dörrkort som tidigare.

Etiketterna byggs från projektets redan sparade kopplingar. De kräver därför ingen ny bildscanning eller OCR av hela ritningen.

## Bevarade iPad-skydd

TEST 9.16:s minnesskydd är kvar:

- ingen tillfällig CSS-transform av hela ritningsytan under iOS-zoom
- högst 8 192 logiska pixlar för iPadens ritningssida
- begränsad PDF-bildbudget
- stabilt läge utan automatisk helsidesdetaljrendering för stora projekt
- generationsskydd så att snabba zoomningar inte lämnar dubbla markörlager
- befintliga lokala projekt och färdiga projekt-PDF:er öppnas utan ny avläsning

## Avgränsning

Det skarpa lagret gäller länkade SmartMatch-stämplar. Det gör inte hela den stora PDF-ritningen högupplöst på iPad. Den avgränsningen behövs för att hålla Safaris minnesanvändning inom en stabil nivå.

## Verifiering

Automatiska kontroller ska bekräfta att etikettlagret följer position och zoom, att en länkad etikett fortfarande öppnar rätt dörrkort och att TEST 9.16:s iPad-budgetar är kvar. Det avgörande slutprovet görs på en fysisk iPad med Safari genom upprepad nypzoom och panorering i samma stora projekt. WebKit-emulering på dator kan inte återskapa iPadens verkliga minnestak.
