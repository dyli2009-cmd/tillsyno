# SmartMatch – Avläsning TEST 9.6

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-6.html`. Intern version: `36.149-READ-TEST`. Tillsyno-version: `v2.4.373`.

Användaren beställde dels korrekt hantering av svenska bokstäver och uppdelade PDF-rubriker, dels ett tydligt engångsflöde för alla projekt: avläs en ny fil, spara resultatet i PDF:en och öppna den färdiga filen på samma eller en annan dator utan ny avläsning. De sju korten och 35 kopplingarna från kundprovet är provresultat, inga hårdkodade kortnamn eller mängder i appen.

## Ny fil – avläs en gång

1. Välj **Avläsning av ritning och dörrkort**. Välj en PDF som innehåller allt, eller flera PDF-filer som ska ingå i projektet.
2. Visa ett exempelkort. **Avläs koder och produkter – en genomgång** är förvalt. Markera kodfältet och hela den tabell som ska bli arbetslista, inklusive kolumnrubrikerna.
3. Välj **Hitta övriga dörrkort**. Granska vilka sidor som är kort. Välj **Läs korten och sök på ritningen**.
4. Granska beteckningar, arbetsrader och träffar. Bekräfta träffarna och öppna arbetsprojektet.
5. Välj **Spara → Spara PDF**. Vänta tills filen är verifierad. Kontrollrutan visar antalet sparade kort, kopplingar och arbetsrader och om produktläsning fortfarande återstår. Tryck **Spara PDF** och välj plats/filnamn.
6. Flytta själva den nya PDF-filen till nästa dator om du vill fortsätta där.

**GS – endast vårt montage** kräver fortfarande GS i **Monteras av / Mont av**. Om underlaget saknar montageansvar kan appen inte gissa GS-arbete. Välj då uttryckligen **Alla markerade arbetsrader** om alla valda rader ska tas med, och granska urvalet.

Alternativet **Endast koder – produkter återstår** finns kvar. Det sparar kopplingarna utan att läsa produkter. Bara sådana väntande kort visar **Fortsätt med produkter**; produkterna måste då läsas en första gång för att kunna visas.

## Färdig fil – öppna utan avläsning

1. Välj **Öppna PDF** och välj den sparade projekt-PDF:en.
2. Granskade kopplingar, kortens arbetslistor och varje dörrs avprickningar återställs ur filen. En stor PDF kan ta tid att läsa och visa, men kodmatchning, produktläsning och OCR körs inte igen.
3. Klicka på en kopplad position för att se dörrkortet och de sparade kontrollpunkterna.

Även **Avläsning av ritning och dörrkort** känner igen en redan färdig, ensam projekt-PDF och öppnar den direkt. Ingen av öppningsknapparna tvingar fram ny granskning av den filen. För att avsiktligt ändra tidigare avläsning finns **Läsområden** och **Verktyg → Läs om produkter**. Den vanliga fortsätt-knappen är dold när produkterna är färdiga, och dess API startar inte heller omläsning av färdiga kort.

**Öppna PDF** startar ingen automatisk avläsning för en rå PDF eller för ogiltiga/oförenliga projektdata. Appen förklarar att filen behöver förberedas via avläsningsknappen. Den öppna arbetsytan ersätts inte före denna kontroll.

**Spara lokalt** är en arbetskopia i webbläsarens lagring, inte en uppdatering av originalfilen i Utforskaren. För överföring används **Spara PDF**. Alla projekt-PDF-val, även det äldre alternativet **Projekt-PDF-kopia**, tar nu med aktuell projektinformation i stället för enbart ursprungliga PDF-byte. Protokollsrapporter är fortfarande separata rapporter.

## Vad som rättats

- I den uppladdade PDF:en använder bokstäver som ö andra typsnitt än omgivande text. `D`, `ö` och `rrkort 140C` blev tidigare `D ö rrkort 140C`, vilket tolkades som koden `DÖRRKORT140C`. En neutral texthjälpare återförenar angränsande fragment på samma baslinje, inklusive roterad text. Den ändrar inte PDF-innehållet, stavar inte om okända ord och ersätter inte å/ä/ö med a/o. Riktiga mellanslag, radslut, kolumnavstånd och överlappande dubblerad text hålls isär.
- Kända fullständiga rubrikord känns också igen när OCR lämnat interna fragmentmellanrum. Beteckningen efter rubriken behöver inget GS-/WC-prefix. Okända namn och verkliga bokstavsskillnader behålls.
- Filväljaren för flera PDF:er tvingade tidigare fram granskning även för en ensam redan färdig projekt-PDF. Detta sker nu bara vid uttrycklig ändring av avläsningen.
- Ett lokalt arkiv kan innehålla original-PDF:en och ett separat arbetsutkast. Det utkastet lämnas nu till öppningskontrollen och projektåterställningen innan filen kan misstolkas som oavläst. Samma sak gäller återställning efter webbläsarens omladdning.
- Projekt-PDF:ens återlästa avläsningsdata verifieras för direkt öppning före export. Sparningsskydden från TEST 9.5, inklusive tomfilskontroll och kontroll av direkt skrivna diskfiler, finns kvar.

TEST 9.6 har separat lokal lagring. Giltiga arkiv och deras utkast från TEST 9.5 kan kopieras en gång till tom 9.6-lagring, utan att äldre lagring ändras eller nyare projekt skrivs över. Spara ett pågående äldre arbete lokalt eller som projekt-PDF innan du byter version.

## Verifiering

- `node tests/smartmatch-read-text-v9-6.cjs`: svenska/andra Unicode-bokstäver och kombinerande tecken, godtyckliga beteckningar, uppdelade rubriker, roterad text och skydd för mellanslag/kolumner/rader. STÄD/STAD och ÖST/OST förblir olika. Delade alternativa ID:n gissas inte till en gemensam kod.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-text-browser-v9-6.cjs`: dator-, iPad- och telefonvyer. Nio andra genererade beteckningar ger 18 exakta kopplingar och svenska produktord i fem rader per kort. Ny fil går genom avläsningsknappen, full läsning är förvald och färdiga produkter startar ingen omläsning. Rå PDF via Öppna PDF avvisas utan scanning. Lokalt arkiverat råoriginal öppnas med sitt utkast och kan sedan återställas efter omladdning. Exporterad fil återöppnas med bibehållna ID:n, kopplingar, arbetslistor och kontroll/tid i en separat webbläsarmiljö. Där är antalet avläsningsguider, matchningskörningar, produktläsningar och OCR-arbetare **noll**. Även förberedelseknappen öppnar en färdig ensam projekt-PDF utan ny avläsning.
- `CHROMIUM_PATH=/usr/bin/chromium SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-work-browser-v9-6.cjs`: befintliga GS-/kolumn-/gruppfixturer återanvänds med de nya öppningsvalen och det frivilliga omläsningsverktyget. Kodläge, uppskjutna produkter, otillgänglig montagekolumn, rättning av enskilda kort, bevarade kontroller/procent/tider samt äldre radnycklar passerar.
- TEST 9:s kodtester och TEST 9.3:s områdes-/upptäcktstester, riktade i minnet till den nya kodmodulen, passerar. `SAVE_REVISION=9-6 node tests/smartmatch-read-save-v9-5.cjs` passerar sparskydden.
- Det tidigare extra-kopplingsprovet, riktat till TEST 9.6 på dator, passerar faktisk musmarkering, färg-/textavgränsning, oförändrat gammalt arbete, PDF-export/återöppning och tillägg av en glömd kort-PDF. Dess produkter förblir väntande tills de uttryckligen läses första gången; redan granskad ritning matchas inte om.
- Kundprovet med **Skolprojekt – Dörrförteckning och Separat Dörrkort (1).pdf** gav automatiskt **7 kort och 35 kopplingar** utan manuellt ändrade beteckningar eller bildläsning. Hela läsningen med uttryckligt urval av alla rader gav **63 arbetsrader**. En verifierad projekt-PDF på **136 581 byte** återöppnades i en ren webbläsarmiljö med samma data och utan guide, matchning, produktläsning eller OCR. Original och provutdata finns utanför Git.

Ändringen gäller den separata avläsningstesten. Produktionsmoduler, Ritningsverktygets funktioner, standardprofilens ID-källa, automatisk DA-koppling, GS-ansvar, inloggning och licenser ändras inte. Tidigare versionsfiler behålls. Browserproven körs i Chromium; fysisk iPad/Safari och TestFlight är inte verifierade här.
