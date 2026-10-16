# SmartMatch – Avläsning TEST 9

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9.html`. Intern version: `36.143-READ-TEST`.

Användarbeslut 16 oktober 2026: lägg till ett extra val där beslagskoden matchas mot ritningen innan produkter och arbetslistor läses. Det tidigare fullständiga flödet finns kvar. Ändringen gäller den separata avläsningstesten, inte standardprofilens låsta tabellregel eller ordinarie SmartMatch 1.3.

## Matcha bara koder

1. Öppna underlaget och låt **Matcha bara koder – produkter senare** vara valt.
2. Visa ett dörrkort. Välj **Markera kod** och dra tätt runt hela beslagskoden, med eller utan rubriken Beslagskod. Zoom med mushjul och två fingrar finns kvar.
3. Tryck **Hitta övriga dörrkort**. Kontrollera de föreslagna sidorna och avmarkera sådant som inte är dörrkort.
4. Tryck **Matcha koder mot ritningen**. Antalet avlästa kort och antalet ritningspositioner visas separat. Ett kort kan ha flera ritningspositioner eller sakna träff helt.
5. Kontrollera träffarna med **Visa**, avmarkera felaktiga placeringar och bekräfta granskningen. Tryck **Öppna kopplat projekt**.
6. **Spara → Spara PDF** bevarar kopplingarna i projekt-PDF:en även om produkterna inte lästs ännu. Nästa öppning använder de granskade kopplingarna direkt.

Det nya läget använder ett kodfält per sida och föreslår kort med liknande sidformat. Sidformatet används för att avgränsa kortläsningen; själva textbeteckningen avgör kopplingen till ritningen. Ett annat eller flyttat kortupplägg behöver ett nytt exempel eller manuell sidangivelse. För flera kort på samma sida används **Matcha koder och läs produkter – tidigare flöde**, som behåller tidigare upptäckt av separata kortområden.

Ingen tabellmarkering, produktavläsning eller GS-tolkning krävs i kodläget. Sidtext och lästa kodområden återanvänds mellan upptäckt och matchning. Stora ritningssidor med tydligt annat sidformat får ingen textutvinning under kortupptäckten. PDF.js behöver fortfarande tolka en sidas textström när dess kodfält ska läsas; markeringen avgränsar vilka textobjekt och vilken OCR-bildyta som används.

## Beteckningar och söksätt

- `GS 23`, `GS23` och `gs-23` behandlas som samma hela beteckning.
- Alfabetiska och sammansatta beteckningar, exempelvis `DBL-DS` och `DBLB OPPSD`, kan läsas utan krav på GS, WC eller siffror. En känd rubrik som Beslagskod tas bort före jämförelsen.
- Faktiska bokstavs- och sifferskillnader bevaras: `DBLB OPPSD` matchar inte `DBLb-OPPS`. `GS23` matchar inte en del av `GS230`. Ingen ungefärlig matchning införs.
- **Snabb sökning – PDF-stämplar först** läser i kodläget sparade stämplar och vanlig PDF-text på ritningen. Kodfält som bara finns som bild kan bildläsas lokalt inom markeringen. Saknade ritningsbeteckningar startar inte helsides-OCR.
- **Sök i text – snabbare, utan bildläsning** utesluter även kodfältens OCR.
- **Sök även i bilder – tar längre tid** är det uttryckliga valet för att komplettera ritningen med bildläsning. Det tidigare fullständiga flödets söksätt behålls.

Oläslig text behöver granskas. Flera valda kort med samma beteckning behöver begränsas till ett kort per beteckning innan automatisk koppling. Flera fysiska dörrar kan däremot länka till samma kort och behåller egna positioner och kontroller.

## Fortsätt med produkter

1. Välj **Fortsätt med produkter** i det kopplade projektet, eller vid dörrkortets väntande arbetslista.
2. Markera arbetslistan på ett exempelkort. Ta med kolumnrubrikerna, särskilt **Monteras av / Mont av**. Välj GS eller det tidigare urvalet med alla arbetsrader.
3. Tryck **Läs produkterna**, granska raderna och välj **Spara produkter**.

Detta steg läser tabellområdena på de redan valda kortsidorna. Det kör ingen ny kodavläsning, ritningsmatchning eller ombyggnad av positioner. Den öppna PDF:en återanvänds. Sparade länkar, positions-ID:n och kontroller bevaras. Befintliga arbetslistor för samma kod och kortsida bevaras även när kodläget används igen.

Innan produktsteget visas arbetet som **Ej läst**, utan konstruerad checklista eller 100 procent. När listan lästs används samma GS-regel, avprickning och tidsberäkning som i TEST 7–8: montörskolumnen styr, produktnamn följer med och okänd tid hittas inte på. Projektet kan sparas och återöppnas i båda stegen.

## Verifiering

- `node tests/smartmatch-read-codes-v9.cjs`: sammansatta beteckningar, verkliga bokstavsskillnader, bara kodområden, textläge, manuella sidor, uteslutna ritningssidor utan textläsning och bibehållet fullständigt flöde.
- `node tests/smartmatch-read-matcher-v9.cjs`: stämpel-/textsökning utan automatisk ritnings-OCR, hela ID-gränser, återanvänd text och uttryckligt bildläge.
- `node tests/smartmatch-read-main-v9.cjs`: granskade kort kräver ingen extra sidtextläsning i huvudflödet; väntande produkter behåller sparade svar; produktuppdatering gör ingen ny analys.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-codes-first-v9.cjs`: dator och iPad-vy, fyra avlästa kort och tre korrekta ritningspositioner, två kort utan träff, noll produktläsningar/OCR i det genererade textunderlagets kodsteg, klick öppnar rätt kort, väntande projekt-PDF öppnas direkt i ny webbläsarkontext, avbruten produktläsning lämnar projektet intakt och senare GS-arbete behåller alla länkar. Även det tidigare fullständiga flödet kontrolleras.
- Tidigare fullständiga TEST 7-testet och TEST 6:s direktöppningstest kördes genom tillfälliga kopior riktade mot TEST 9, med det fullständiga läget uttryckligen valt. Dator och iPhone-vy passerar, inklusive riktig lokal OCR av en bildtabell, GS-urval, tidsvägd procent, export, äldre projekt och tidigare sparade kontroller. Originaltesterna är oförändrade.
- `SMARTMATCH_SCHOOL_PDF=/lokal/sökväg/test-skolan.pdf CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-school-v9.cjs`: kundens reducerade skolfil ger **40 GS23-kopplingar**. Kodupptäckt och matchning tog cirka **4,2 sekunder** efter filöppning och förhandsvisning, med **ett OCR-anrop på kodfältet** och ingen ritnings-OCR. Det separata produktsteget tog cirka **11,1 sekunder**, med fyra OCR-anrop på kortets tabell och tre korrekta GS-moment. Samma 40 positions-ID:n och kopplingar behålls utan ny matchning. Tiderna är mätningar i testmiljön, inte garantier för andra filer eller enheter.

Alla skript och OCR-filer kommer från projektets lokala filer. Inga nya bibliotek eller externa OCR-tjänster används. Kundhandlingar och testexporter ligger utanför Git. Tidigare testversioner, Ritningsverktyg, Kontrollflöde, auth och native iOS ändras inte. Chromium med emulerade enhetsvyer är verifierat; fysisk Safari/iPad och en ny TestFlight-build är inte kontrollerade i denna webbändring. Mycket stora filers första PDF-tolkning och visning kan fortfarande ta tid; en ursprunglig 500 MB-fil är inte verifierad.
