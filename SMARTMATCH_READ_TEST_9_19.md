# SmartMatch Avläsning TEST 9.19

## Syfte

TEST 9.19 låter den ursprungliga PDF-stämpeln vara hela den visuella markeringen. Appen lägger inte längre en extra kodtext ovanpå den tryckta koden. Den osynliga klickytan följer stämpelns verkliga PDF-ruta och ritningens zoom, så originalets färg, form och text syns utan dubbel text eller en stor fristående ikon.

Procentmärket ligger framför den genomskinliga klickytan och skalar ned med stämpeln. Det blir därför inte en stor fristående ikon över en utzoomad ritning.

## Något tydligare grundritning

iPadens översiktsbild höjs från 1,50 till 1,65 megapixel. Det ger ungefär 4,9 procent mer linjär detalj. Ritningslinjer och rumsnamn som redan är riktig PDF-text blir lite tydligare, men små klassrumsnamn kräver fortfarande inzoomning.

Ett komplett HTML-textlager används inte. Den aktuella skolritningen innehåller tusentals ord på första sidan, och så många extra textelement skulle kunna belasta Safari och täcka ritningen.

## Bevarade skydd

- högst 3 000 pixlar per sida för översiktsbilden
- högst 650 000 pixlar och DPR 1,25 för detaljytan
- högst 8 192 logiska pixlar för ritningssidan
- ingen tillfällig CSS-transform av hela ritningen under iOS-zoom
- automatisk detaljrendering avstängd för projekt över 24 MB
- 12 MB arbetsbudget för PDF-bilder
- befintliga sparade projekt öppnas utan ny OCR eller matchning

## Slutprov

Kontrollera på en fysisk iPad med Safari att originalstämpelns färg, form och text syns utan dubbel text, att stämplar inte täcker planen vid utzoomning, att koden blir läsbar efter inzoomning, att procentmärket syns och att tryck på stämpeln öppnar rätt dörrkort. Upprepad nypzoom och panorering är fortsatt det avgörande minnesprovet.
