# SmartMatch Avläsning TEST 9.18

## Syfte

TEST 9.18 gör iPadens grundritning lite tydligare utan att återinföra den tunga rendering som fick Safari att starta om. Översikten höjs försiktigt från 1,35 till 1,50 megapixel. Det motsvarar ungefär fem procent högre linjär skärpa.

De redan länkade stämplarnas beteckningar, till exempel `GS1`, `GS2` och `DBL`, ligger fortfarande i TEST 9.17:s separata skarpa etikettlager och öppnar rätt dörrkort vid tryck.

## Bevarade iPad-skydd

- högst 3 000 pixlar per sida för översiktsbilden
- högst 650 000 pixlar för den synliga detaljytan
- högst 8 192 logiska pixlar för ritningssidan
- ingen tillfällig CSS-transform av hela ritningen under iOS-zoom
- automatisk detaljrendering avstängd för projekt över 24 MB
- 12 MB arbetsbudget för PDF-bilder
- generationsskydd för markörlagret
- befintliga projekt och lokala arkiv öppnas utan ny OCR eller matchning

## Avgränsning och slutprov

Ändringen gäller endast iPadens grundritning. Dator, Android, dörrkort, kopplingar, kontrollpunkter och sparad projektdata är oförändrade. Det avgörande slutprovet är upprepad zoomning och panorering av den stora verkliga ritningen på en fysisk iPad med Safari.
