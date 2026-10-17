# SmartMatch – Avläsning TEST 9.2

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-2.html`. Intern version: `36.145-READ-TEST`. Tillsyno-version: `v2.4.369`.

Den separata avläsningstesten får två beställda förbättringar: tydliga GS-checklistor med produktvärden under kortets avsnitt, samt ett kompletteringsflöde för saknade ritningskopplingar och dörrkort. [TEST 9.1](smartmatch-read-test-v9-1.html) finns kvar separat. Statusen med fas, sida, procent och tid behålls; se [hur den ska tolkas](SMARTMATCH_READ_TEST_9_1.md).

## Läs GS-arbetet som produktlistor

1. Öppna projekt-PDF:en i **Avläsning TEST 9.2**. Börja med kodmatchningen om kopplingarna ännu inte är gjorda.
2. Välj **Fortsätt med produkter** när korten är kopplade. Är alla produktlistor redan lästa heter knappen **Läs produkterna igen**.
3. Visa ett exempelkort och markera hela önskade tabellen eller arbetslistan. Ta med **Övrigt / Produkt**, **Monteras av / Mont av**, avsnittsrubrikerna och eventuella upprepade kolumnrubriker.
4. Låt **GS – endast vårt montage** vara valt. Tryck **Läs produkterna** och följ statusen för sida och arbetssteg.
5. Granska produktvärdena och avsnitten. Tryck **Spara produkter** och öppna ett dörrkort för att kontrollera checklistan.
6. Välj **Spara → Spara PDF** för att ta med listor och avprickningar i filen.

Checklistan visar produktkolumnens värde, exempelvis **256**, **6696** eller **Utsida**, i stället för att lägga komponentnamnet framför varje produkt. Kortets rubriker kan ge grupper som **Daglåsning**, **Nattlåsning**, **Övrig utrustning** och **Larm/Passer**. Andra tydliga avsnittsrubriker kan också behållas. Samma produkt i två olika avsnitt är två separata arbetsmoment.

**Fortsätt med produkter** läser i första hand de kort som fortfarande väntar på produktläsning och behåller redan färdiga listor. **Läs produkterna igen** öppnar produktsteget när alla listor är klara, så att du kan markera och läsa dem på nytt med den nya tabelltolkningen. Ingen av knapparna gör om ritningsmatchningen.

| På kortet | Resultat i GS-listan |
| --- | --- |
| Behör · 256 · Monteras av GS | 256 |
| Trycke · 6696 · Levereras av DT · Monteras av GS | 6696 |
| Låshus · 310-50 · Levereras av GS · Monteras av DT | Utelämnas |
| Produkt med tomt, blandat eller oklart monteringsansvar | Tas inte med som ett gissat GS-moment |

Varje upprepad tabellrubrik avgränsar sin egen produkt- och ansvarskolumn, även när kolumnerna flyttats mellan tabellerna. Radbrutna produktvärden läses ihop inom samma cell. Saknas tydlig produkt- eller montörskolumn visas en varning; verktyget konstruerar inga GS-kontrollpunkter från lös text.

Tidigare automatiskt skapade GS-listor kan få den nya produktvisningen från sina sparade tabellord. Befintliga radnycklar och avprickningar återanvänds. Manuellt ändrade listor behålls. Finns inte tillräckligt underlag för en säker omtolkning behålls tidigare innehåll i stället för att ersättas med en gissning.

## Lägg till saknade kopplingar

Detta används efter att ett projekt öppnats. Det kompletterar befintliga kopplingar utan att köra om den ursprungliga matchningen.

1. Visa ritningen och välj **Lägg till kopplingar** i verktygen, eller **＋ Koppling** i positionsvyn.
2. Tryck **Markera beteckning på ritningen** och dra tätt runt ett helt exempel, exempelvis **DBL**. Undvik andra texter och färgade linjer i markeringen.
3. Kontrollera **Hela beteckningen att hitta** och den avlästa färgen. Rätta texten vid behov.
4. Välj **Dörrkortssida som ska öppnas**. Kontrollera förhandsbilden så att rätt kort valts.
5. Låt **Bara samma textfärg som exemplet** vara valt när färgen ska avgränsa träffarna. Låt **Snabb sökning – PDF-stämplar och text** vara valt när beteckningarna är sökbar text eller PDF-stämplar.
6. Tryck **Sök på ritningen**. Sökningen går över projektets ritningssidor; kända kortsidor och den valda kortsidan används inte som ritning.
7. Granska träffarna med **Visa**, gå tillbaka med **Tillbaka till kopplingarna** och avmarkera felaktiga träffar.
8. Tryck **Lägg till valda kopplingar**. Befintliga positioner och deras avprickningar finns kvar.
9. Välj **Spara → Spara PDF**. Öppna den sparade filen nästa gång för att återanvända kompletteringen.

Hela beteckningen måste stämma. Mellanslag, bindestreck och stora/små bokstäver jämnas ut, men **DBL** matchar inte **DBL-DS** och **GS23** matchar inte **GS230**. Flera positioner kan öppna samma kort. Ett valt kort behöver inte ha samma tryckta rubrik som ritningsstämpeln: i detta separata flöde bekräftar användaren uttryckligen vilken kortsida beteckningen ska öppna.

Färgkravet kontrolleras mot den synliga textens färg på ritningen. En träff med annan eller oklar färg väljs bort. Om exemplets färg inte kan bestämmas stoppas sökningen med färgkravet aktivt; markera tätare eller stäng själv av **Bara samma textfärg som exemplet**. När kravet stängs av kan samma beteckning i andra färger också komma med.

Finns beteckningen endast som bild väljer du uttryckligen **Sök även i bilder – tar längre tid**. Du kan behöva skriva den avsedda beteckningen om exemplet saknar sökbar text. Bildläget ändrar inte kravet på hela beteckningen eller den efterföljande granskningen.

Redan kopplade positioner räknas som dubbletter och läggs inte till igen. En beteckning som redan är kopplad till en annan kortsida kan inte skrivas över genom detta flöde; välj samma kortsida. Avbryt sökningen med **Avbryt sökningen** om du inte vill fortsätta.

## Lägg till ett dörrkort som saknas i filen

1. Öppna **Lägg till kopplingar** och fäll ut **Saknas dörrkortet i filen?**.
2. Välj PDF-filen eller filerna med de saknade korten och tryck **Lägg till valda PDF-filer**.
3. De tillagda sidorna hamnar efter projektets befintliga underlag. Befintliga sidnummer, kopplingar och kontroller behålls.
4. Välj rätt nytillagd kortsida i **Dörrkortssida som ska öppnas** och kontrollera förhandsbilden.
5. Markera och sök ritningens beteckning, granska och lägg till kopplingarna enligt stegen ovan.
6. Det nya kortets produkter visas som **Ej läst**. Välj **Fortsätt med produkter** för att läsa de väntande korten; redan färdiga listor och deras avprickningar behålls.
7. Välj **Spara → Spara PDF** för att ta med både de nya sidorna och projektets uppdaterade data.

Om projekt-PDF:en redan innehåller tidigare genererade rapportsidor tas den gamla genererade avslutningen bort före kompletteringen. De ursprungliga underlagssidorna och deras sidnummer bevaras; en ny export bygger projektets aktuella rapportdel.

## Fortsätt från tidigare testversion

TEST 9.2 har egen lokal lagring. Historik, läsmallar och lokalt sparade sessioner från TEST 9.1 flyttas inte automatiskt. Öppna din senast sparade **projekt-PDF** i TEST 9.2. Finns arbetet bara lokalt i ett tidigare test öppnar du den versionen och väljer **Spara → Spara PDF** först.

## Avgränsning

Ändringen gäller den separata avläsningstesten. Den ändrar inte standardprofilens låsta ID-källa, ordinarie SmartMatch, automatisk DA-till-GS-koppling eller Kontrollflöde. GS-regeln är fortsatt montageansvar i **Monteras av**, oberoende av vem som levererar produkten. All OCR använder projektets lokala filer; ingen ny molntjänst införs.

Bildläsningen i TEST 9.2 använder nu svenska och engelska tillsammans. Samma uttryckligen beställda språkrättning gäller **Förbered sökbara dörrkort** i Ritningsverktyget, med lokal svensk språkfil för å, ä och ö. Granskning och säkerhetströsklar behålls; se [prova svensk bildtext från original-PDF](DRAWING_TOOLS_369.md).

Färg och bildläsning kan påverkas av överlappande linjer, bildkvalitet och otydliga tecken. Därför ingår granskning före kompletteringen. Första läsningen av stora bild-PDF:er kan fortfarande ta tid. Användarens ej tillgängliga 251 MB-fil, fysisk iPad/Safari och ny TestFlight-build är inte verifierade för denna webbändring.

## Verifiering

- `node tests/smartmatch-read-work-v9-2.cjs`: godkänt. Kontrollerar produktvärden, avsnitt och andra rubriker, upprepade och parallella tabeller med olika kolumngeometri, radbrutna celler, dubbletter, tomma värden och oklart ansvar. GS i leverantörskolumnen tar inte med DT:s montage. Den reducerade skolfilens lokalt sparade OCR-resultat ger **256, 6696 och Utsida** under **Daglåsning**; kundunderlaget ligger utanför Git.
- `node tests/smartmatch-read-extra-unit-v9-2.cjs`: godkänt. Kontrollerar textfärg, hela beteckningar, positionsgeometri och avbrytbar bildrendering.
- `node tests/smartmatch-read-extra-main-v9-2.cjs`: godkänt. Kontrollerar additiva positioner, dubbletter och kodkonflikter, återställning vid fel, borttagen gammal genererad rapportdel och korrekta sidnummer vid import. Befintliga kontrollsvar, läsdata, formulär, stämplar, metadata och bilagor bevaras; misslyckad import lämnar projektet intakt.
- `node tests/smartmatch-read-work-groups-browser-v9-2.cjs`: godkänt i Chromium på dator, iPad-vy och telefonvy. Åtta GS-produkter visas under fyra rubriker med egna kryss för samma produkt i olika avsnitt. Skiftade kolumner, upprepade rubriker och flerradig produkttext ingår. Verkligt klick på **Läs produkterna igen** samt PDF-export och direkt återöppning bevarar kopplingar, avprickningar, procent och tider. Ett äldre TEST 9.1-projekts sparade kryss migreras utan att spridas till lika produkter i andra avsnitt eller dörrar. Komponentnamn finns kvar som metadata för tillgänglighet och tidsberäkning.
- `node tests/smartmatch-read-extra-browser-v9-2.cjs`: godkänt i Chromium på dator, iPad-vy och telefonvy med faktisk mus-/pekmarkering. Kontrollerar hela beteckningar, färgavgränsning, vald kortsida, förhandsvisning, individuellt granskningsval, additiva kopplingar, dubblettskydd, avbrott och att felaktiga batcher inte lämnar deländringar. Sparad projekt-PDF öppnas utan ny matchning och behåller gamla och tillagda positioner samt kontrollsvar. Datorflödet kontrollerar dessutom tillagd glömd PDF, valfri manuell kortalias, senare GS-läsning endast av väntande kort och bevarade originalsidnummer/metadata.
- Webbläsarbilder är granskade utan horisontellt överflöde. Alla lokala skript och stilar i TEST 9.2 finns i offlinecachens fillista och på disk. Syntax- och diffkontroller passerar.

Ritningsverktygets tidigare verkliga OCR-webbläsartest har också passerat på dator med det nya svenska/engelska språkvalet: hela kort, text-PDF, beskärning/dolda områden och fortsatt inläsning som PDF-text i TEST 9 utan ny OCR. Se [språkrättningens verifiering](DRAWING_TOOLS_369.md).

Tidigare TEST 9.1-filer är oförändrade. Kundhandlingar, genererade test-PDF:er och skärmbilder publiceras inte i Git.
