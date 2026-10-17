# SmartMatch – Avläsning TEST 9.4

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-4.html`. Intern version: `36.147-READ-TEST`. Tillsyno-version: `v2.4.371`.

När koder och ritningskopplingar fungerade kunde **Läs produkterna igen** ändå visa ”Kolumnen Monteras av saknas” på alla kort. Felet återskapades med ett riktigt dörrkort från användarens uppladdade PDF: det förberedda textlagret innehöll två överlappande rubrikfragment, **Monta** och **av**. Samma bokstav hade blivit avläst i två bildområden. Den sammanslagna texten blev därför inte den kända kolumnrubriken **Mont av**.

## Fortsätt från ett redan kopplat projekt

1. Spara ditt arbete i tidigare test med **Spara → Spara PDF**, om det hittills bara finns lokalt.
2. Öppna den sparade projekt-PDF:en i TEST 9.4 via **Öppna ny PDF**. Granskade kopplingar används direkt.
3. Välj **Läs produkterna igen**, eller **Fortsätt med produkter** om produkterna väntar på läsning.
4. Tryck **Markera tabell / arbetslista**. Ta med komponentnamnen till vänster, **Övrigt / Produkt**, **Lev av** och **Mont av** samt alla önskade avsnitt och produktrader. Dörrillustrationer och tomma statuskolumner behövs inte.
5. Låt **GS – endast vårt montage** vara valt. Om hela tabellen är förberedd med sökbar text kan du välja **Sök i text – snabbare, utan bildläsning**. Textläget startar ingen OCR. Om text saknas behöver du uttryckligen välja bildläsning.
6. Tryck **Läs produkterna** och granska arbetsraderna. På det provade WC-kortet ska **5265** och **6696** visas under **Daglåsning**.
7. Tryck **Spara produkter**, öppna en kopplad position och bocka av respektive produkt med dess Klar-ruta.
8. Välj **Spara → Spara PDF** för att bevara produkter, läsområden och avprickningar i filen.

TEST 9.4 har egen lokal lagring. Tidigare testers lokala historik flyttas inte automatiskt; den sparade projekt-PDF:en används vid övergången.

## Om kolumnerna fortfarande inte kan läsas

Produktsteget visar vilka kort som behöver rättas och blockerar **Spara produkter** tills kolumnläsningen lyckats. Tidigare arbetslistor och avprickningar finns kvar. Välj **Justera läsområdet** vid ett berört kort, ta med kolumnrubrikerna och tryck **Läs bara detta kort**. När alla misslyckade kort är rättade kan produkterna sparas. Det behövs ingen ny ritningsmatchning för detta.

En tydligt läst tabell där endast DT monterar kan korrekt ge noll GS-punkter och får fortfarande sparas. Det skiljs från en tabell vars kolumner inte kunnat tolkas. Manuellt valda **Alla markerade arbetsrader** finns kvar som det tidigare uttryckliga alternativet.

## Vad rättningen gör

- Kända kolumnrubriker kan återställas från två fragment som överlappar på samma rad och upprepar samma bokstav. En vanlig felskrivning utan överlappande positionsbevis godtas inte som en ny rubrik.
- Produktnummer och GS/DT ändras inte genom rubrikrättningen. GS i **Mont av / Monteras av** är fortsatt ansvarskällan; leveransansvar räcker inte.
- Misslyckad produktläsning och äldre automatiska listors omtolkning får inte ersätta befintliga arbetsrader med ett oläst tomt resultat.
- Produktvyn säger att ritningskopplingen är sparad, i stället för att uppmana till stämpelsökning.
- Kodmatchning, alias, positioner, avprickningar, tidsregler och tidigare tester behålls. Ritningsverktygets OCR ändras inte i denna rättning.

## Verifiering

- `node tests/smartmatch-read-work-v9-4.cjs`: godkänt. Överlappande rubrikfragment återställs oberoende av skala och textordning. Verkliga bokstavsskillnader, bristande geometri, produktvärden och leverans-/montageskillnaden kontrolleras. Olästa kolumner skiljs från en giltig DT-tabell utan GS-montage.
- TEST 9.2:s omfattande produkttest, tillfälligt riktat mot den nya läsaren: godkänt. Produktvärden, avsnitt, upprepade och parallella tabeller, radbrutna celler, GS/DT, tomma och tvetydiga celler samt tidigare skolunderlagets lokala OCR-data kontrolleras.
- `CHROMIUM_PATH=/usr/bin/chromium SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-work-browser-v9-4.cjs`, även med `ipad` och `iphone`: godkänt i alla tre Chromium-vyerna. Det genererade underlaget innehåller överlappande Monta/av-fragment samt åtta GS-produkter i fyra avsnitt, skiftade kolumner och radbrutna värden. Misslyckad omläsning blockerar tom överskrivning; lokala rättningar återställer sparning först när båda korten lästs korrekt. Koder, positions-ID:n, kopplingar, kryss och tider bevaras vid omläsning, PDF-export och direkt återöppning. Migrering av äldre TEST 9.1-radnycklar passerar också.
- Riktigt kundunderlag: på ett extraherat originalkort från uppladdningen återskapades det rapporterade felet i TEST 9.3 med ett osynligt textlager framställt av den befintliga svenska/engelska OCR:n. TEST 9.4 läste samma textlager utan ny bildläsning och gav **5265** och **6696**, med fungerande avprickning. Originalkortet provades även med produktstegets lokala svenska/engelska bildläsning och gav samma två GS-punkter. Koder, positions-ID:n, geometri, ritningskoppling och granskat matchningsresultat var oförändrade; ingen ny ritningssökning kördes. Kund-PDF, bilder och OCR-utdata ligger utanför Git.

Detta prov av ett riktigt kort är inte en verifiering av samtliga 52 sidor eller alla andra tabellupplägg. Fysisk iPad/Safari och TestFlight är inte verifierade genom Chromium-vyerna.

Stabil HTML är byteidentisk med versionssidan. Alla lokala skript och stilar finns i offlinecachens fillista; syntax- och diffkontroller passerar. TEST 9.3:s filer är oförändrade.
