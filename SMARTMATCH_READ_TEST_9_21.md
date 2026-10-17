# SmartMatch Avläsning TEST 9.21

## Problem

I TEST 9.20 försvann procentmärket när en stämpel blev mindre än 34 × 20 CSS-pixlar. Märket kunde också skalas ned så långt att procenten inte gick att läsa. Vid utzoomning gick det därför inte att se vilka dörrar som redan hade påbörjats eller blivit klara.

## Ändring

- Varje position med sparad arbetsprocent över 0 % visar alltid sitt eget procentmärke på iPad.
- I översikten är märket 28 × 18 CSS-pixlar med 8-pixelstext.
- I normal- och detaljvy är märket högst 30 × 20 CSS-pixlar med 9-pixelstext.
- Märket ligger centrerat tre pixlar under stämpelreplikan och täcker inte koden.
- 1–99 % har mörk bakgrund och 100 % har grön bakgrund. Texten är vit med en ljus kant runt märket.
- 0 % visas utan procentmärke så att endast påbörjade dörrar framhävs.

Stämpelreplikan fortsätter att följa ritningens skala vid utzoomning och slutar växa vid 72 × 36 CSS-pixlar. Ändringen startar ingen extra PDF-rendering, OCR eller matchning.

## Bevarat

- Befintliga sparade kopplingar, kontrollpunkter och procentvärden öppnas direkt.
- TEST 9.20 och äldre filer, lokala projekt och IndexedDB-arkiv är oförändrade och läses endast som äldre källor.
- iPadens översiktsyta är fortsatt 1,65 megapixel, detaljytan 650 000 pixlar, DPR högst 1,25, sidgränsen 3 000 pixlar, logisk sidgräns 8 192 pixlar, detaljgränsen 24 MB och PDF-bildbudgeten 12 MB.

## Kontroll

Kontrollera på en fysisk iPad i Safari:

1. Öppna ett sparat projekt med flera dörrar som har olika arbetsprocent.
2. Zooma ut tills hela ritningen syns.
3. Bekräfta att alla positioner över 0 % har en tydlig procent under rätt stämpel och att 0 % saknar märke.
4. Zooma in och ut flera gånger. Procentmärket ska inte dubbleras, täcka koden eller växa över 30 × 20 CSS-pixlar.
5. Öppna en stämpel och bekräfta att rätt dörrkort och sparad procent visas.
