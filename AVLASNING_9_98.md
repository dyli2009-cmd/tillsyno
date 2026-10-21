# Avläsning 9.98 – dörrkort utan produktkolumnrubrik

Ett nytt dörrkortsexempel har två vänsterkolumner för komponent och produkt men saknar rubriken Övrigt/Produkt. Ansvarskolumnerna Lev av, Mont av, Ansl av, Funk ansvar och Anm finns. Den tidigare tabelläsaren hittade ansvarskolumnerna men avstod från produktläsning när produktkolumnens rubrik saknades.

9.98 lägger till en separat läsprofil, `responsibility-matrix-unheaded-products-v1`, för den verifierade uppbyggnaden. Den befintliga läsaren körs först och behåller sitt resultat för redan stödda kort. Tillägget kräver en sammanhängande ansvarsrubrikrad, tomma vänstra rubrikfält, minst tre tydligt åtskilda komponent-/produktrader och minst två kända avsnitt. Vid osäkra eller ofullständiga kolumner behålls tidigare olösta resultat och granskningskrav. Upprepade eller flera ansvarsmatriser i samma markering godtas inte av tilläggsprofilen. Inga kundnamn, artikelnummer, fasta sidkoordinater eller dörrbeteckningar styr profilvalet.

Produktgränsen kompletteras bara i en tillfällig kopia av läsorden. Original-PDF, råtext och ordpositioner ändras inte. Den befintliga 9.32-regeln gäller även här: tydligt GS i Lev av eller Mont av ger en GS-punkt, en gång per produktrad. GS enbart i Ansl av räcker inte. Rader med DT eller otydligt Best/GS i båda ansvarsfälten behålls i produktlistan utan att automatiskt bli GS-punkter. Avsnitt och separata produktrader bevaras.

Arbetsgången är densamma: lägg till kort-PDF:en, markera beteckningen överst och matcha mot ritningen. Läs produkter senare i SmartMatch och markera komponent-/produktkolumnerna samt ansvarsrubrikerna och aktuella rader. Rubriken Övrigt/Produkt behövs inte för den nya profilen. Kodavläsning och ritningsmatchning återanvänds utan ändring; en matchande ritning måste finnas i projektet.

Endast Avläsning använder tillägget. Layouten från 9.97 med inställningar och godkännande vid öppningsknappen bevaras. Tidigare versionsfiler, ordinarie SmartMatch, Kontrollflöde, auth och projektformat ändras inte. Startsida, fast testadress och offlinecache följer 9.98 / app 2.4.468, HTML-build 36.233.

Verifiering:

- Det bifogade kortet har lästs privat med appens verkliga PDF.js-ordgeometri: beteckning utan OCR, 16 produkter, 11 GS-punkter och fyra avsnitt. Två identiska modellvärden på olika produktrader får separata identiteter. Originalord och PDF-bytes är oförändrade. Fem tidigare kundkort ger exakt samma JSON-resultat i läsaren före och efter tillägget. Kundfiler och utdrag ingår inte i repot.
- `tests/smartmatch-read-work-v9-98.cjs` verifierar ansvar, produktinventering, avsnitt, stabila källrader, förflyttade/förstorade tabeller, fragmenterade rubriker och osäkra strukturer som ska förbli olösta. Tidigare 9.32-prov, inklusive OCR-radjustering, passerar även via tilläggsläsaren.
- `tests/smartmatch-read-matrix-browser-v9-98.cjs` passerar på dator, iPad och iPhone med genererade separata ritnings-/kortfiler: markering av översta beteckningen, två kort, tre exakta ritningskopplingar, produktläsning senare, fyra avsnitt, separata avprickningar samt PDF-export och återöppning i ny session utan omsökning eller OCR. Det befintliga kompletta avläsningsprovet passerar dessutom på sex enhetsprofiler.

Det nya exemplet innehåller inget ritningsblad, så dess verkliga ritningsmatchning är inte verifierad. Matchningsprovet använder genererade ritningar. Webbläsarproven använder Chromium med emulerad skärmstorlek och pekfunktion; fysisk Safari/iOS har inte testats. Andra okända tabellupplägg, enbart bildbaserade kort och upprepade matriser kräver egen verifiering.
