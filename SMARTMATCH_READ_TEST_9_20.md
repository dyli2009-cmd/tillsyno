# SmartMatch Avläsning TEST 9.20

## Syfte

Stora projektfiler använder en minnesbegränsad ritningsbild på iPad. Originalstämpelns färg kan då synas medan den lilla tryckta koden blir för mjuk för att läsa, även om kopplingen är korrekt.

TEST 9.20 lägger därför en kompakt stämpelreplika över varje länkad position på iPad:

- gul yta
- svart kod och ytterkant
- tunn röd innermarkering
- ellips, rektangel eller rundad form enligt den sparade stämpeln

Replikan visar ritningens sparade beteckning, exempelvis `GS23` eller `DBL-OPPS`, och öppnar samma dörrkort som positionen redan är kopplad till. En längre beteckning kan delas på sitt eget bindestreck eller mellanslag i högst två rader, så bokstäverna kan förbli läsbara även i en fyrkantig stämpel.

## Zoom

Stämpelreplikan krymper tillsammans med ritningen när användaren zoomar ut. Den har ingen stor minsta yta som kan täcka en hel översiktsritning. När användaren zoomar in växer replikan tills den når högst 72 × 36 CSS-pixlar och behåller sedan den storleken. Texten anpassas till stämpeln med högst 11 pixlars teckenstorlek.

Om en stämpel blir så liten att texten skulle understiga fyra pixlar visas fortfarande den gula, svarta och röda formen. Beteckningen finns kvar i positionens tillgängliga namn och blir synlig igen efter inzoomning.

Procentmärket visas separat när stämpeln har tillräcklig plats, så kontrollstatusen inte lägger sig över koden.

## Bevarade skydd

- iPadens översiktsbild är fortsatt högst 1,65 megapixel
- högst 3 000 pixlar per sida för översiktsbilden
- högst 650 000 pixlar och DPR 1,25 för detaljytan
- högst 8 192 logiska pixlar för ritningssidan
- automatisk detaljrendering avstängd för projekt över 24 MB
- 12 MB arbetsbudget för PDF-bilder
- ingen tillfällig CSS-transform av hela ritningen under iOS-zoom
- sparade kopplingar, produkter och kontroller öppnas utan ny avläsning

## Slutprov

Öppna ett färdigt projekt på en fysisk iPad med Safari. Kontrollera `GS`, `WC` och en längre `DBL`-beteckning i normal vy, utzoomad vy och efter inzoomning. Koden ska bli tydlig, stämpeln ska sluta växa vid detaljzoom och ett tryck ska öppna rätt dörrkort. Upprepad nypzoom och panorering är fortsatt det avgörande minnesprovet.
