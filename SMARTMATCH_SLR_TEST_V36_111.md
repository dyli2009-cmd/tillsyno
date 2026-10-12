# SmartMatch SLR TEST v36.111 – kryss i PDF-rutans mitt

Användaren rapporterade att X för bland annat Antal dörrblad 1/2 hamnade nedanför originalrutorna.

## Orsak och rättning
Den gemensamma CSS-regeln för vanliga knappar har min-height:36px. SLR-kryssens positionsberäkning använder en mindre explicit höjd, men det ärvda minimimåttet gjorde knappen högre. X ritades i knappens verkliga mitt och försköts därför nedåt. Vid en avsedd höjd 19px blev förskjutningen 8,5px.

SLR-modulen nollställer nu min-height och min-width endast för .slrOverlayTick. Befintliga PDF-koordinater, förstorat klickområde, val, sparning och zoom är oförändrade. Regeln gäller checkboxar och radioval på alla riskanalyssidor.

## Version och avgränsning
Fast adress: smartmatch-slr-test.html. Aktuell version: 36.111-SLR-TEST. Tidigare 36.110 HTML arkiverad separat. Alla nya resurser är avgränsade till SLR-testet; ordinarie app och TestFlight är inte ändrade.

## Kontroll
JavaScript-syntax passerade. Orsaken verifierad i aktiv CSS och kryssens centrering/positionsberäkning. Komplett visuell kontroll på iPhone/iPad återstår; den publicerade sidan kräver inloggning och lokal visuell testyta kunde inte öppnas av kontrollmiljön. Kontrollera Antal dörrblad 1/2 och andra kryss vid normal vy och zoom.
