# SmartMatch Avläsning TEST 9.79

Produktlistan är nu tidskälla för projektmaterialet. Tidigare hade listan och projektet separata tidskopior, så ändringar i produktlistan slog inte igenom i projektets beräkningar.

## Excel-produkter

Underlaget är den uppladdade `mängdning.xlsx`, blad `Blad1`, SHA-256 `d00b989d0df7e2a890ddda87bbe5dadf3ff2c1f5390dc603d3eda30327f91d1e`. Samtliga 67 produktrader motsvarar 66 unika produkter. Dörrtillslutare på rad 85 och 91 är samma produkt med samma tid och visas en gång. Alla produkter tas med oavsett mängd i Excel. Projektnamn, mängder och arbetstotaler från kalkylbladet ingår inte i appens grundkatalog.

65 produkter har angiven stycktid. `835c-50` saknar tid och får ingen gissad tid. En redan sparad egen tid på den produkten bevaras. Befintlig omräkning behålls: decimaltimmar × 60, avrundat till hela minuter per styck. Exempel: 0,1 = 6 min, 0,5 = 30 min, 1,5 = 1 tim 30 min och 0,33 ≈ 20 min. Råvärdet i timmar finns kvar i katalogens källuppgifter.

Excel-produkterna fanns redan i den inbyggda artikelmallen, men tidigare sparade produktlistor kompletterades aldrig med saknade poster. Appens produktlista fylls nu på från den verifierade grundkatalogen. Egna produkter, ändrade namn, kategorier och tider behålls. Källidentitet och namnkopplingar hindrar att namnbytta standardprodukter läggs till igen.

## Produktlista och projektmaterial

- En matchande produkt använder alltid produktlistans aktuella tid före äldre projektvärden och punktundantag. Även tom tid och noll minuter gäller. Fristående extraarbete och projektprodukter som saknas i listan har fortsatt egna tider.
- Produktnamn och kategorier i listan följer med till projektmaterialet. Tidigare namn behålls som namnkopplingar så att mängder, dörrkopplingar och avprickningar inte tappas vid namnbyte.
- I projektmaterialet visas kopplade produktuppgifter och tid som läsvärden. Knappen **Ändra i produktlistan** öppnar rätt produkt. Mängden i projektet kan fortfarande ändras. Samma tidskoppling används i punktredigeraren och när en känd produkt läggs till i projektet.
- **+ Projekt** lägger till mängd och skapar ingen ny tidskopia. Beräknad total, klart och kvar räknas om när listan sparas. Ändringar i en annan flik ogiltigförklarar även en förberedd projekt-PDF.
- Katalog och uppslagsindex cachas. Upprepade tidsberäkningar för många dörrpositioner tolkar inte om katalogens JSON för varje produkt.

Produktlistan använder fortsatt appens stabila lokala lagring `tillsyno.product-library.v1`, oberoende av projekt och testversion. En befintlig lista i webbläsaren styr när andra projekt öppnas. Den aktuella listan följer också med i projekt-PDF:en och kan återställas på en webbläsare som saknar en egen lista. Detta inför ingen automatisk synkronisering mellan olika enheter. Ett lagringsfel lämnar tidigare sparade värden kvar och visas som ett fel.

9.79 använder intern build 36.222 och service-worker-version 2.4.447-read9.79. Startsidan och testaliaset pekar på 9.79. Exporten med delade protokollsidor från 9.78 behålls, inklusive begränsningen för PDF-läsarens historikknapp.

## Verifiering

`tests/smartmatch-product-excel-parity-v9-79.cjs` jämför alla produkter mot en separat fixture som skapats direkt från den uppladdade Excel-filen: namn, grupper, källceller, råa timmar, minutvärden, saknad tid och dubblettursprung. Fixturen innehåller inga projektmängder eller projektnamn.

`tests/smartmatch-product-library-live-v9-79.cjs` kontrollerar uppgradering av äldre listor, bevarade egna värden, namnbyten, mängder, gamla projekttider, tom/noll tid, fristående extraarbete, portabel katalog, nekad lagring, 10 000 uppslag utan ny JSON-tolkning samt omräkning och exportogiltigförklaring vid flikändring.

`tests/smartmatch-product-drafts-v9-79.cjs` kontrollerar att ett osparat extraantal följer med när masterprodukten byter namn, även från en annan flik. Sparade mängder ändras inte förrän användaren sparar. Egna projektprodukters osparade tider och kategorier behålls också vid namnkoppling.

`tests/smartmatch-product-library-browser-v9-79.cjs` passerar i datorvy och iPhone-profil i Chromium. Hela flödet omfattar listan före öppnat projekt, komplettering av en gammal lista, direkt omräkning och flikändringar, läsfält/redigeringsknapp, tid utan värde/noll, namn- och kategoribyte, mängder och avprickningar, egna produkter och extratid, skydd mot dubbla namnkopplingar, lagringsfel och omstart. En verklig tvåsidig projekt-PDF sparas och återöppnas i en ren webbläsarkontext med rätt ändrade katalogvärden och projektsumma. Telefonvyn har ingen horisontell överbredd. Detta är Chromium-profiler, inte fysisk Safari.

Kopierade riktade tester för delade PDF-sidor, metadataskrivare, exportkö, sidcache, lokal sparning och ritningsnoteringar använder 9.79-modulerna.

Samtliga riktade tester ovan passerar. Den stora exportkontrollen i iPad-profil passerar också med 16 MiB PDF-bilaga och 4 MiB projektdata, med oförändrat originalhash, exakt återläst projektinnehåll, två originalsidor efter export/återexport samt fungerande avbrott och återförsök. Syntax, resursgraf, versionsmarkörer och aktuellt testalias är kontrollerade.
