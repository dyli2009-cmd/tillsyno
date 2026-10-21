# Avläsning 9.100 – dörrkort med enstaka produkter

9.99:s profil utan produktrubrik krävde minst tre ifyllda produktrader för att fastställa kolumnen. Kort med många streck och bara en verklig GS-produkt blev därför olösta och fick ingen automatisk avprickningspunkt.

9.100 lägger till profilen `responsibility-matrix-sparse-product-cells-v1`. Tryckta streck och andra uttryckliga tomvärdesmarkörer får ge geometriskt underlag för produktkolumnen. Minst tre samstämmiga cellrader, ett tydligt Lev av/Mont av-par och minst två kända avsnitt krävs fortfarande. En implicit tom cell skapar ingen produkt och kan inte ensam bevisa en kolumngräns. En enda ifylld produkt med GS i Lev av eller Mont av blir en GS-punkt. Verifierade tabeller med enbart streck ger noll produkter/punkter.

Streck blir aldrig produkter eller arbetsrader. Ansvarsregeln, produktvärdet, avsnittet och separata källradsidentiteter återanvänds från tidigare parser. Om strecken och den verkliga produkten antyder olika kolumngränser, eller flera textfragment gör komponent-/produktgränsen osäker, avstår tillägget. Produkt eller kommentar får inte flyttas till fel kolumn genom gissning. Redan fungerande resultat från 9.32/9.98/9.99 används först och återanvänds oförändrat. Inga dörrbeteckningar, artikelnummer eller fasta sidkoordinater styr profilen.

Arbetsgången är densamma: markera hela tabellområdet inklusive komponent/produkt och Lev av/Mont av. Ett tidigare felkort kan läsas på nytt med **Läs om kortet**, sedan granskas och sparas med **Spara produkter**. Tidigare arbete, avprickningar och ritningskopplingar skyddas av 9.99:s befintliga omläsningsflöde.

Läsaren återanvänds från 9.99 med endast uppdaterad versionsmärkning och läsmallnyckel/fallback. Layout, öppningsspärrar, matchning och projektformat ändras inte. Startsida, fast testadress och offlinecache följer 9.100 / app 2.4.470, HTML-build 36.235. Tidigare versionsfiler, övriga moduler och auth bevaras.

Verifiering:

- `tests/smartmatch-read-work-v9-100.cjs` verifierar en/noll ifyllda produkter, numeriska modellvärden, GS-ansvar, separata källrader, orörda indata, flyttad/förstorad geometri, tomma celler och tvetydiga gränser. Täta komponentetiketter och en senare kommentar får inte dölja den verkliga modellen. Äldre parserprov inklusive OCR-radjustering passerar via 9.100.
- `tests/smartmatch-read-sparse-browser-v9-100.cjs` använder genererade PDF-filer med fyra avsnitt, 25 streckceller och en verklig produkt: exakt en GS-punkt, separata fysiska avprickningar, exakta ritningskopplingar, PDF-export och återöppning i ny session utan OCR. Sparat felkort läses om genom 9.99-knappen med skydd för arbete, produktinventering, alias och kopplingar. Misslyckad omläsning och Avbryt bevarar data. Flödet passerar på dator/iPad/iPhone; datorprovet har även körts efter sista geometriskyddet.
- En privat fixtur byggd av det tidigare bifogade kortets verkliga PDF.js-cellgeometri, med en ursprunglig GS-produkt kvar och övriga produktvärden ersatta med streck, ger en produkt/en GS-punkt i rätt avsnitt. Samma fixtur misslyckas i 9.99. Oförändrat originalkort ger samma 16 produkter/11 GS som tidigare, och fem andra tidigare kundkort ger exakt tidigare JSON-resultat. Kundfiler och utdrag ingår inte i repot.
- Befintligt komplett avläsningsflöde passerar på sex enhetsprofiler. Syntax, fast HTML-kopia, laddningsordning, referenser och 877 offlinefiler är kontrollerade.

Den nya GS9-bilden har inte lämnats som käll-PDF; just dess PDF-text/OCR har därför inte verifierats. Browserproven använder Chromium med emulerad skärmstorlek/pekfunktion. Fysisk Safari/iOS och skannade original har inte testats för tillägget.
