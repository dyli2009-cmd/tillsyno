# dorrservice

## Tillsyno v2.4.380 – hitta tidigare lokala SmartMatch-projekt

[Avläsning TEST 9.13](smartmatch-read-test.html) visar lokalt sparade projekt från äldre TEST-versioner direkt på första sidan. Knappen **Hitta tidigare lokalt sparade projekt** kan köra sökningen igen. Äldre stora PDF-filer läses från sin befintliga lokala lagring utan automatisk kopiering eller ny avläsning. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_13.md).

## Tillsyno v2.4.379 – lokal säkerhetskopia alltid synlig

[Avläsning TEST 9.12](smartmatch-read-test.html) visar **Spara lokalt nu** före den stora PDF-exportens förlopp. Arbetskopian kan därför sparas direkt i webbläsaren även medan PDF-exporten arbetar eller har stoppats. Knappen visar själv när den sparar och när kopian är klar. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_12.md).

## Tillsyno v2.4.378 – stora projekt och tydligt PDF-sparande

[Avläsning TEST 9.11](smartmatch-read-test.html) rättar exportfelet där stor inbäddad projektinformation inte kunde läsas tillbaka. Sparvyn visar arbetssteg, procent och förfluten tid. **100 % – PDF klar att spara** betyder att exportkontrollen är klar; tryck sedan **Spara PDF**. Vid direkt sparning visar appen även filskrivning och kontroll från disk. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_11.md).

## Tillsyno v2.4.372 – säkrare PDF-sparning

[Avläsning TEST 9.5](smartmatch-read-test-v9-5.html) förbereder och verifierar projekt-PDF:en innan Windows sparruta öppnas. Skrivfel avbryter filskrivningen och den sparade filen läses tillbaka före lyckat besked. Lokalt arkiverade TEST 9.4-projekt kan återhämtas i den nya, separata lagringen. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_5.md).

## Tillsyno v2.4.371 – produktläsning efter sparad OCR-text

[Avläsning TEST 9.4](smartmatch-read-test-v9-4.html) rättar överlappande textfragment i tabellrubriker, exempelvis **Monta + av**, när positionerna bevisar att samma bokstav lästs två gånger. GS krävs fortfarande i montagekolumnen. Misslyckad kolumnläsning blockerar sparning av ett tomt ersättningsresultat och behåller tidigare produkter och kontroller. Produktsteget hänvisar inte längre till ny ritningsmatchning. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_4.md). [TEST 9.3](smartmatch-read-test-v9-3.html) finns kvar separat.

## Tillsyno v2.4.370 – skilj kortbeteckning från ritningskod och justera ett kort

[Avläsning TEST 9.3](smartmatch-read-test-v9-3.html) skiljer dörrkortets ursprungliga beteckning, exempelvis **DBL**, från den uttryckliga ritningskopplingen **DBL-1**. Med **Justera läsområdet** kan kod- och tabellmarkeringar ändras för en enda sida eller ett enskilt kort och läsas om med **Läs bara detta kort**. Andra kort och tidigare kopplingar/avprickningar bevaras; en verklig kodändring kräver ny granskning. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_9_3.md). [TEST 9.2](smartmatch-read-test-v9-2.html) finns kvar separat.

Borttagna sidor i Ritningsverktyget sparas redan via **Spara PDF → Spara mina sidval och ändringar → Spara PDF**. Hur mycket mindre filen blir beror på vilket innehåll som kan tas bort; se [förklaring och verifiering](SMARTMATCH_READ_TEST_9_3.md#spara-pdf-efter-borttagna-sidor).

## Tillsyno v2.4.369 – GS-produktgrupper, kompletteringar och svensk bildtext

[Avläsning TEST 9.2](smartmatch-read-test-v9-2.html) visar produktvärden från **Övrigt / Produkt** som checklistor under kortets avsnitt. **GS i Monteras av** avgör vilka rader som följer med. Med **Lägg till kopplingar** markerar du en beteckning på ritningen, söker samma hela text och förvalt samma textfärg, granskar träffarna och väljer kortsida. Befintliga kopplingar och avprickningar bevaras. Saknade dörrkort kan läggas till från fler PDF-filer och produkterna läsas senare. Se [steg för steg och verifiering](SMARTMATCH_READ_TEST_9_2.md). [TEST 9.1](smartmatch-read-test-v9-1.html) finns kvar separat.

När alla produktlistor redan är lästa öppnar **Läs produkterna igen** produktsteget för en ny läsning utan att göra om ritningskopplingarna. Finns väntande kort läser **Fortsätt med produkter** dessa och behåller färdiga listor.

**Förbered sökbara dörrkort** i Ritningsverktyget använder nu svenska och engelska tillsammans för bättre stöd för å, ä och ö i bildtext. Samma språkfiler används i TEST 9.2 och finns lokalt för offlinebruk. Granskning av osäkra ord behålls. Prova igen från original-PDF:en enligt [stegguiden för svensk bildtext](DRAWING_TOOLS_369.md).

## Tillsyno v2.4.368 – se vad SmartMatch-avläsningen gör

[Avläsning TEST 9.1](smartmatch-read-test-v9-1.html) visar vilken fas, PDF-sida, kort eller bildyta som läses, framsteg inom den aktuella fasen, förfluten tid och en försiktig uppskattning av återstående tid. Lokal bildläsning visar sin egen procent. Samma information följer med när produkterna läses senare. Kodmatchning, söksätt och GS-regler behålls. Se [arbetsgång, hur statusen ska tolkas och verifiering](SMARTMATCH_READ_TEST_9_1.md). [TEST 9](smartmatch-read-test-v9.html) finns kvar separat.

## Tillsyno v2.4.367 – sökbara dörrkort med originalbilden kvar

[Ritningsverktyget](drawing-tools.html) får en testfunktion där du markerar hela dörrkortet, väljer sidor, läser bildtexten lokalt och granskar resultatet. **Spara sökbar PDF** lägger granskad text osynligt på samma plats utan att ersätta originalbilden. Procent, aktuell sida/område och tidsuppskattning visar vad som pågår. Texten kan även sparas som JSON. Första bildläsningen tar tid; senare textläsning kan återanvända resultatet. Se [steg för steg, avgränsningar och verifiering](DRAWING_TOOLS_367.md).

## Tillsyno v2.4.366 – spara valda sidor utan bildoptimering

**Spara PDF** i [Ritningsverktyget](drawing-tools.html) skiljer nu vanlig export av kvarvarande sidor från **Optimera bilder och spara**. Därmed kan borttagna extrasidor sparas utan att den valfria bildjämförelsens gräns för korsreferenser stoppar exporten. Bildoptimeringens verifiering och skyddet för signerade filer behålls. Se [arbetsgång och verifieringsstatus](DRAWING_TOOLS_366.md).

## Tillsyno v2.4.365 – bildrensning följer med när PDF sparas

**Spara PDF** i [Ritningsverktyget](drawing-tools.html) återanvänder nu identiska bilder och verifierar innehållet även när förlustfri export körs direkt. En misslyckad ny rensning kan inte lämna en äldre export som tyst sparas i stället. Slutmeddelandet visar faktisk storlek före/efter. Se [rättning och verifiering](DRAWING_TOOLS_365.md).

## Tillsyno v2.4.364 – samlad PDF-analys i Ritningsverktyg

[Ritningsverktyget](drawing-tools.html) har nu **Analysera PDF** för hela arbetsfilen: jämför sidinnehåll, granska dubblettsidor och se vad som tar plats. Förlustfri rensning återanvänder identiska bilder, tar bort oanvända objekt och visar verklig storlek före/efter. Text, stämplar, lager, formulär, bilagor och projektdata kontrolleras före sparande. Markerad text och exportval finns i samma meny. Se [arbetsgång, avgränsningar och verifiering](DRAWING_TOOLS_364.md).

## Tillsyno v2.4.363 – gruppera all markerad text

[Ritningsverktyget](drawing-tools.html) jämför nu hela texten i det markerade området, med valfria ord, siffror och tecken. Exempelvis sju **Beslagskod: DBLB upp SD** blir en grupp med ett förvalt exemplar att behålla och sex extrasidor. Kodformat och kända rubriker krävs inte. Bildläst text med låg säkerhet visas för granskning och kan också grupperas. Se [rättning och verifiering](DRAWING_TOOLS_363.md).

## Tillsyno v2.4.362 – gruppera dörrkort efter markerad rubrik

[Ritningsverktyget](drawing-tools.html) kan läsa ett markerat rubrikfält, exempelvis **Beslagskod GS23**, och gruppera PDF-sidor med samma kod. Välj en sida att behålla, avmarkera extra exemplar som också behövs och ta bort valda extrasidor i ett ångringsbart steg. Förlustfri PDF-export bevarar kvarvarande sidors innehåll. Text läses först; lokal bildläsning begränsas till markeringen. Se [steg för steg och verifiering](DRAWING_TOOLS_362.md).

## Separat Avläsning TEST 9 – matcha bara koder, produkter senare

[Testsidan](smartmatch-read-test.html) börjar med **Matcha bara koder**: markera beslagskoden, hitta korten och granska ritningens kopplingar utan att läsa arbetslistorna. **Fortsätt med produkter** läser GS-arbetet separat och behåller kopplingarna. Text- och bildsökning samt tidigare fullständiga flödet finns kvar. Se [steg för steg och verifiering](SMARTMATCH_READ_TEST_V9.md). [TEST 8](smartmatch-read-test-v8.html) är bevarad.

## Separat Avläsning TEST 8 – zoom där koden markeras

[TEST 8](smartmatch-read-test-v8.html) har zoom med mushjul på dator och två fingrar på pekskärm. Zoomen följer pekaren eller fingrarnas mittpunkt. **Flytta vyn** låter användaren dra runt det inzoomade underlaget med mus eller ett finger. Kod- och tabellmarkeringar behåller sina sidkoordinater. Se [handhavande och verifiering](SMARTMATCH_READ_TEST_V8.md). [TEST 7](smartmatch-read-test-v7.html) är bevarad.

## Separat Avläsning TEST 7 – markerade områden, text först och GS-arbete

[TEST 7](smartmatch-read-test-v7.html) har tre tydliga söksätt: **Snabb sökning – PDF-stämplar först**, **Sök i text – snabbare, utan bildläsning** och **Sök även i bilder – tar längre tid**. Kod och arbetslista läses inom markerade områden; läsresultat återanvänds mellan kortupptäckt och provläsning. Nya arbetslistor väljer GS:s montage utifrån ansvarskolumnen. Tidigare söksätt, alla arbetsrader och direktöppning av sparade projekt finns kvar. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_V7.md). [TEST 6](smartmatch-read-test-v6.html) är bevarad.

## Separat Avläsning TEST 6 – granska en gång, öppna projekt-PDF direkt

[TEST 6](smartmatch-read-test-v6.html) öppnar en sparad projekt-PDF direkt med granskade kopplingar och arbetsstatus. Nya underlag får guidens steg; flerfilsöppningen och Läsområden används för ny granskning. Välj **Spara → Spara PDF** för att ta med kopplingarna i filen. Se [arbetsgång och verifiering](SMARTMATCH_READ_TEST_V6.md). [TEST 5](smartmatch-read-test-v5.html) är bevarad.

## Separat Avläsning TEST 5 – snabb sökning i stora ritningar

[TEST 5](smartmatch-read-test-v5.html) läser sparade PDF-stämplars beteckningar och positioner före text- och bildläsning. Snabbsökning är förvald; välj **Sök även i bilder** för att komplettera sparade stämplar med bildinnehåll. Upprepade dörrkort på samma sida, egna arbetslistor och granskningssteget behålls. Se [steg för steg och verifiering](SMARTMATCH_READ_TEST_V5.md). [TEST 4](smartmatch-read-test-v4.html) finns kvar separat.

## Separat Avläsning TEST 4 – flera dörrkort på samma sida

[TEST 4](smartmatch-read-test-v4.html) hittar upprepade kortområden från ett markerat exempel, även när flera kort delar PDF-sida. Hela beteckningar som KLASSRUM 1 bevaras. Varje kort får eget visningsutsnitt och arbetsinnehåll. Se [steg för steg och verifiering](SMARTMATCH_READ_TEST_V4.md). [TEST 3](smartmatch-read-test-v3.html), [TEST 2](smartmatch-read-test-v2.html) och SmartMatch 1.3 finns kvar separat.

## Tillsyno v2.4.361 – SmartMatch 1.3 läser Beslagskod

En separat dörrkortsprofil läser översta tabellrutan i det nya liggande kortformatet, även när rubriken är en bild. Beslagskod WC eller GS10 kopplas till samma beteckning på ritningen. Befintliga läsregler har kvar sin prioritet. Bildläsningen körs lokalt och stöder offline efter att appfilerna har hämtats. Se [ändring och verifiering](SMARTMATCH_BESLAGSKOD_133.md).

## Tillsyno v2.4.360 - ritningsverktyg med originalkvalitet

Förlustfri PDF-export är standard och stöder beskärning, sidval och dolda områden utan att göra ritningslinjer och text till bilder. Bildimport behåller upplösningen. Stora PDF:er kan delas vid hela sidgränser och varje del sparas separat. Se [ändring och verifiering](DRAWING_TOOLS_360.md).

## Tillsyno v2.4.359 – tydligare administration

Ansökningar först, filter för väntande/godkända/alla, tydliga modul- och licensuppgifter och kontoradering i en separat meny. Samtliga adminrutor följer färgtemat. Felrättning av godkännandets försök-igen-flöde. Se [ändring och verifiering](ADMIN_UI_359.md).

## Tillsyno v2.4.358 – ZIP kan sparas när direktdelning stoppas

CE-exporten hämtar den färdiga ZIP-filen även när webbläsaren nekar själva delningen. Avbrott behåller filen utan extra hämtning. Gäller både valda filer och komplett CE-underlag. Se [ändring och verifiering](CE_ZIP_SHARING_358.md).

## Tillsyno v2.4.357 – justerbar CE-vy och temakopplad underskrift

Delad datorvy med tydligare text och menyer högst upp. Samma enkla Ny dörr-ikon på dator, iPhone och iPad. Underskriftens datumfält och omgivning följer valt färgtema. Se [ändring och verifiering](CE_DESKTOP_357.md).

## Tillsyno v2.4.326 – tydligare ritningsstart på dator

Aktuellt område och valda checklistor visas i datorns ritningsrubrik. Större ritningsstart; telefon/iPad och färgteman bevaras. Se [ändring och verifiering](DESKTOP_DRAWING_HEADER_326.md).

## Tillsyno v2.4.325 – tydligare checklistval på dator

Större text, ikoner och kryssrutor för alla tre områden på dator. Telefon/iPad och färgteman bevaras. Se [ändring och verifiering](DESKTOP_CHECKLISTS_325.md).

## Tillsyno v2.4.324 – tydligare områdesval på dator

Större rubriker, text och ikoner i områdeskorten. Samma kortmått, teman och mobil-/iPad-vyer. Se [ändring och verifiering](DESKTOP_AREA_324.md).

## Tillsyno v2.4.323 – större startsida på dator

Större kort, text och ikoner på dator. Telefon, iPad och färgteman bevaras. Se [ändring och verifiering](DESKTOP_HOME_323.md).

## Tillsyno v2.4.322 – kundmallens rubrik följer temat

Se [ändring och verifiering](CUSTOMER_PREVIEW_THEME_322.md).

## Tillsyno v2.4.321 – sparrutan följer temat

Rättar fasta mörkblå färger i Spara PDF-rutan. Se [ändring och verifiering](SAVE_PDF_THEME_321.md).

## Tillsyno v2.4.320 – ingen fast blå laddningsbakgrund

Valt tema gäller redan före externa resurser och under sidbyten. Se [ändring och verifiering](NAVIGATION_THEME_320.md).

## Tillsyno v2.4.319 – samma tema genom arbetsflödena

Rättar fasta färger och datorns palettöverskrivning. Temavalet följer projekt, protokoll, översikt, CE och Ritningsverktyg på alla enheter. Se [ändring och verifiering](THEME_CONSISTENCY_319.md).

## Tillsyno v2.4.318 – större och lugnare datorvy

Större arbetsytor och mappkort, mörkblå omgivning och dämpade blågrå fält. Telefon, iPad och startsida bevaras. Se [ändring och verifiering](DESKTOP_LAYOUT_318.md).

## Tillsyno v2.4.317 – tre nya mörka teman

Midnattsblå, Grafit och Mörkgrön ger mörk omgivning och ljus text. Sju valbara teman, fortsatt val på Hem. Se [ändring och verifiering](DARK_THEMES_317.md).

## Tillsyno v2.4.316 – stabil vänsterställd CE-dörrad

Rättar den fördröjda mappikonen som sköt dörrtexten mot mitten. Se [orsak och verifiering](CE_DOOR_ROW_316.md).

## Tillsyno v2.4.315 – CE-rubriker till vänster

Projektuppgifter och Dörrar och dörrautomatik håller vänsterkanten. Se [ändring och verifiering](CE_HEADINGS_315.md).

## Tillsyno v2.4.314 – dörrnummer först i CE-filnamn

Valda ZIP-filer får löpnummer först: 01-Loggbok-…, 01-Egenkontroll-…, 02-Loggbok-…. Se [ändring och verifiering](CE_FILE_NAMES_314.md).

## Tillsyno v2.4.313 – enklare CE-startsida

Två ingångar, hopfälld projekthistorik och direkt Nytt projekt med automatisk arkivering. Se [ändring och verifiering](CE_HOME_313.md).

## Tillsyno v2.4.312 – CE-filer utan undermappar

Välj dörrar och dokument och spara separata filer i en ZIP. Befintlig komplett mappexport finns kvar. Se [ändring och verifiering](CE_FILE_EXPORT_312.md).

## Tillsyno v2.4.311 – Färger och enhet på Hem

Utseendeknappen finns endast på startsidan. Sparade val gäller fortfarande i arbetsytorna. Se [ändring och verifiering](APPEARANCE_HOME_ONLY_311.md).

## Tillsyno v2.4.310 – flyttbar kundmall

Kundmallen i Dörrautomatik / Lås öppnas centrerat nära full höjd och kan flyttas via rubriken. X stänger; Tillbaka-raden tas bort endast där. Se [ändring och verifiering](CONTROLFLOW_CUSTOMER_FLOATING_310.md).

## Tillsyno v2.4.309 – godkända TEST v16 införd i Dörrautomatik / Lås

Ordinarie Kontrollflöde öppnar nu den godkända revisionsmodulen för protokoll under Dörrautomatik / Lås. Befintliga arbetsfiler, originalfilnamn, båda importprofilerna, symboltabell, signatur, serviceöversikt och kompakta vyer bevaras. Se [införande och verifiering](CONTROLFLOW_REVISION_RELEASE_309.md). Testkopian och andra fristående moduler är bevarade.

## SLR TEST v36.132 – direktmarkering utan popup

Knappen **Markera fem dokument kontrollerade** markerar de fem vanliga dokumentmapparna direkt utan extra bekräftelseruta. Produktlista och CE-skylt påverkas inte. Se [versionsanteckning](SMARTMATCH_SLR_TEST_V36_132.md). Endast separat SLR-test ändrat.

## SLR TEST v36.131 – markera fem dokument samtidigt

En knapp i den valda dörrautomatikens SLR-mapp låter användaren bekräfta granskning av Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran – tillverkare av maskin och Egenkontroll. Produktlista och CE-skylt förblir separata. Se [versionsanteckning](SMARTMATCH_SLR_TEST_V36_131.md).

## SLR TEST v36.130 – procentetiketter inåt

Egenkontroll ovanför vänsterkanten, SLR ovanför högerkanten. Båda breder ut sig mot mitten med spegelvända statusstreck. Se [versionsanteckning](SMARTMATCH_SLR_TEST_V36_130.md). Endast separat SLR-test ändrat.

## Separat SLR TEST v36.129

Egenkontroll visas ovanför markeringens övre vänsterhörn och SLR ovanför övre högerhörnet. Zoomanpassad storlek och kompakt mappvy behålls. Se [ändring och verifiering](SMARTMATCH_SLR_TEST_V36_129.md). Fast testadress `smartmatch-slr-test.html`.

## Separat SLR TEST v36.128

Statusetiketter följer ritningens zoom med Egenkontroll vid vänsterkanten och SLR vid högerkanten. SLR-mapparna visas som en kompakt lista med mindre utfällbara verktyg. Se [ändring och verifiering](SMARTMATCH_SLR_TEST_V36_128.md). Fast testadress `smartmatch-slr-test.html`; kontrollberäkning, ordinarie app och iOS är oförändrade.

## Separat SLR TEST v36.127

Analys visar den öppnade PDF:ens storlek i MB och byte, med filnamn och sidantal. Mätningen sker direkt utan export eller omskanning. Se [ändring och verifiering](SMARTMATCH_SLR_TEST_V36_127.md). Fast testadress `smartmatch-slr-test.html`; ordinarie app och iOS är oförändrade.

## Separat SLR TEST v36.126

Tydligare procent för Egenkontroll och SLR på ritningen: egna bakgrunder, större procentsiffror och tjockare grön statuslinje. Se [ändring och verifiering](SMARTMATCH_SLR_TEST_V36_126.md). Fast testadress `smartmatch-slr-test.html`; statusberäkning, ordinarie app och iOS är oförändrade.

## Separat SLR TEST v36.125

Gemensamma dörruppgifter från riskanalys till egenkontroll, kort dörrbeteckning (sista numret) och fullständigt Maskin-ID. 50 % kräver besvarade huvudval; 100 % kräver manuell mappkontroll per dörr. Se [specifikation och verifiering](SMARTMATCH_SLR_TEST_V36_125.md). Fast testadress `smartmatch-slr-test.html`; ordinarie app och iOS är oförändrade.

## Separat SLR TEST v36.124

Sju mappkontroller med procent, Ändra standard för Med glas/Utan glas, Ändra endast denna dörrautomatik, gemensam dörrsignatur och Visa PDF i scrollbart visningsfönster. Se [specifikation](SMARTMATCH_SLR_TEST_V36_124.md). Fast testadress `smartmatch-slr-test.html`; ordinarie app och iOS är oförändrade.

## Separat SLR TEST v36.123

[SLR v36.123 – dokumentmappar och dörrstandarder](SMARTMATCH_SLR_TEST_V36_123.md): sju mappar, full ifyllnad för Med glas/Utan glas, ändra bara denna dörr, CE-foto och sparad projektsignatur. Klart ger 100 % SLR för vald dörr; Spara → SLR exporterar valda klara dörrar till en ZIP med separata dokumentmappar. Fast testadress: `smartmatch-slr-test.html`. Ordinarie app och TestFlight är oförändrade.

> **Viktigt före ändringar:** Läs [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md). Där finns regler för modulgränser, versionshantering och hur Kontrollflöde/Projektflöde ska hållas separerade.

## SmartMatch TEST v36.105

Den separata TEST-appen visar vid tryck på en dörrautomatik **endast två dokumentval sida vid sida**: Egenkontroll dörrautomatik (vänster) och SLR-dokumentmapp (höger). Överflödig status-/objektinformation är dold i själva valmenyn, och dubblerad `Sök fler automatiker` syns inte där utan finns kvar i sidosektionen. GS-/SLR-logik samt korrigeringen av dörrklick från v36.104 är oförändrade; iOS/TestFlight har inte ändrats.

## Tidigare dörrklicksfix v36.104

Aktiv separat TEST: [fixad dörrklicksbugg](SMARTMATCH_TEST_V36_104.md). Tryck på dörrautomatikens markeringsruta ska nu öppna Egenkontroll-/SLR-val igen. Rotorsak i v36.103 var att GS-förslagets funktion fick `undefined` istället för dörrkortscachen. Samma GS/SLR-logik och förenklade instruktion från tidigare versioner behålls. Ordinarie app och TestFlight oförändrade.

## Tidigare textförenkling v36.103

Senaste separata TEST: Förenklad text i **Koppla dörrautomatik**-dialogen. Endast instruktionen "Rita en ruta kring dörrautomatikens ID. Sedan söker appen samma objekt på alla ritningssidor." visas. Funktionerna och GS/SLR-regeln från v36.102 är oförändrade. Fasta testadressen är uppdaterad.

## Tidigare GS-kontroll v36.102

[Senaste kontrollen av GS-koppling och SLR-källa (v36.102)](SMARTMATCH_TEST_V36_102.md) visar nu sparad GS mot föreslagen GS direkt i automatikdialogen och stoppar osäker källa till SLR. Korrigerad länk måste bekräftas av teknikern. Separat TEST, ingen TestFlight-uppdatering.

## Tidigare låst GS-regel v36.101

Senaste separata TEST: [högst en verifierad GS per fysisk automatik – säker framtida källa för SLR](SMARTMATCH_TEST_V36_101.md). DA-symbolen från v36.100 finns kvar som positionshjälp, inte som garanti att GS är rätt. Ordinarie Kontrollflöde och iOS är oförändrade.

## Tidigare spar-/uppdateringsflöde v36.71

Se [senaste implementerade spar- och uppdateringsflödet](SMARTMATCH_TEST_V36_71.md) och [sparad mall för kundens Egenkontroll](SMARTMATCH_MALL_EGENKONTROLL.md). TEST fungerar separat från ordinarie app.

## Fortsätt senaste SmartMatch-arbetet

**Starta här:** [SMARTMATCH_FORTSATTNING_2026-10-10.md](SMARTMATCH_FORTSATTNING_2026-10-10.md) – uppdaterad överlämning med beslut om PDF som projektfil, senaste TEST-versionen, 17 dörrautomatiker, Dropbox-buggen, tester och förslag på nästa steg.

## SmartMatch – sparade planer

- [SmartMatch TEST v36 – Koppla dörrautomatik direkt i ritningsvyn](SMARTMATCH_TEST_V36.md) – analysera efter att du öppnat PDF, eller koppla manuellt.
- [SmartMatch – dörrkoppling steg 1](SMARTMATCH_DORRKOPPLING_STEG1.md) – separat test för märkning, löpnummer, klickbara knappar och GS-positioner.
- [Samarbete för flera tekniker, automatisk dörrlåsning, offlinearbete, konflikter och Dropbox/Google Drive/OneDrive](SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md) – planeringsdokument, inte implementerat.

Deploy trigger: 2.4.82







2026-10-15, Tillsyno v2.4.327: Beställd rättning av datorns PDF-start för Säkerhetsservice och Brandsäkerhet. Samma DOM-presentation som i revisionen aktiveras även i ordinarie all-in-one.js. Rätt områdesnamn och valda checklistor visas, befintliga större CSS-mått återanvänds. Routing, PDF, projektdata och telefon/iPad bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.328: Användaren beställde samma korrekta områdesrubrik och valda checklistnamn på dator, iPhone och iPad. Texten följer protokollvalet på alla enheter; de större måtten aktiveras fortfarande bara på dator. Mobilens och iPadens befintliga typografi och knappar bevaras. Ingen ändring av routing, PDF eller projektdata. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.329: Användaren bekräftade samma synliga områdesrubrik och checklistnamn i alla tre områden på dator, iPhone och iPad efter Fortsätt till ritningen. Revisionssidans kompakta CSS dolde checklistnamnen på små enheter. Kontexttext visas nu med normal radbrytning på alla enheter; större mått kvarstår endast på dator. Verifierat i 18 Chromium-flöden genom protokollvalet i två teman och tre enhetsvyer, med synlighetskontroll av underrubriken. Protokollval och befintliga textstorlekar bevaras. Ingen fysisk enhet eller ny TestFlight-build testad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.330: Beställd temarättning av Sparad servicefil hittad efter öppning av arbets-PDF. Dialogens bakgrund, rubrik, text, hjälptext, knappar och backdrop följer vald palett på alla enheter. Ingen ändring av Ny service/Fortsätt ändra, PDF-innehåll eller projektdata. 105 färg- och fortsättkontroller passerade i Chromium: sju teman på telefon, iPad och dator med en riktig arbets-PDF med ett objekt. Fortsätt behåller objektet och visar ritningen utan runtime-fel. Ljus iPad-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.331: Användaren beställde förstoring endast av Sparad servicefil hittad på dator. Dialogen får 640 px arbetsbredd, 22 px rubrik, 16 px brödtext, 14 px hjälptext, 16 px knapptext och minst 48 px knappar. Avgränsat till minst 1100 px, hover och precis pekare med telefon-/surfplatteval undantagna. Andra rutor, tema, textinnehåll, PDF och arbetslogik bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.332: Användaren prioriterade att menyraden Ritning/Översikt/Protokoll/Projekt ska följa valt färgtema. Gemensam CSS kopplar bakgrund, text, ikoner, hover, fokus och aktiv flik till paletten på alla enheter. Geometri och navigation bevaras. 168 Chromium-kontroller passerade i sju teman på telefon, iPad och dator inklusive faktisk växling av flikar efter öppnad arbets-PDF. Ljus iPad-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.333: Beställd rymligare ritningsarbetsyta på dator och tydligare moderna verktygsikoner. När en PDF visas på dator samlas snabbverktygen i sid-/zoomraden, rubrikdelen komprimeras och kontroller får 44 px klickytor. Ritytan ökade från 663 till cirka 734 px vid 1440×1000 och från 463 till cirka 534 px vid 1100×800. Den ursprungliga verktygsplaceringen återställs på telefon/iPad, vid mindre fönster och i andra vyer. Nya SVG-ikoner för sidbyte/zoom är gemensamma för alla enheter. PDF-beräkningar, koordinater, protokoll, projektdata och export ändras inte. Ny UI-modul inkluderas i offlinecachen. Verifierat: 21 flöden i sju teman på tre enhetsvyer och sex ytterligare flöden på 1100 px i revision/Säkerhetsservice/Brand. Meny, zoom, vynavigering och synlighet kontrollerade utan runtime-fel; telefon/iPad behåller ritningsytans höjd. Datorbild visuellt granskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.334: Beställt gemensam datorstorlek på rubrikdel, A+/A− och nedersta meny i Ritning, Översikt, Protokoll och Projekt. Desktop-kontexten behålls medan en PDF är öppen, oberoende av aktiv flik. Endast den samlade ritningsverktygsraden återställs vid byte till annan vy; även ordinarie Säkerhetsservice/Brand-översikt övervakas. A+/A− har 44 px klickyta och 14 px text; nedersta menyn har 13 px text och 44 px knappar i alla datorflikar. Innehåll, textskalningsfunktion, projektdata och PDF bevaras. Verifierat: 105 flikväxlingskontroller över sju teman och tre enhetsvyer samt 30 ytterligare kontroller på 1100 px för alla tre områden i ljust/mörkt tema. Rubrikhöjd, kontrollstorlekar och menymått är identiska mellan flikarna. Inga runtime-fel; datorns Projekt-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.335: Beställt Öppna annan ritning med synlig text och mappikon vid filnamnet i rubrikdelen på alla enheter. Långa filnamn kan visas fullt genom tryck. Beställt Justera stämplar direkt i Kundmalls ritningsvy: storlek för alla eller en vald stämpel, dragning av etikett utan flytt av objektpunkt, samt Spara PDF via befintligt sparflöde. Skalan sparas per objekt i customerStampScale (0,5–3); labelX/labelY sparar justerad placering. Samma ritningsbyggare används för Kundmall och export, även för äldre arbetsfiler. Dörrautomatikens båda protokolltyper har gemensam större standard (15,4/13,2 punkter för kort/lång etikett; 10 procent över tidigare revisionsstorlek). Återöppning förstorar inte stämplarna på nytt. PDF-zoom och stämpelstorlek är separata. PDF-objektens ankare, nummer och övriga kontrolluppgifter bevaras. Webb och native-källa speglas; ingen ny TestFlight-build verifierad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.336: På användarens beställning läggs Återställ alla storlekar i Kundmall → Justera stämplar. Återställer samtliga aktiva protokolls stämplar på alla sidor till 100 %, även med en enskild stämpel vald. Sparas via samma projekt-/PDF-flöde. Etikettplacering, objektpunkter och kontrolluppgifter bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.337: Beställd justering av pillinjens tjocklek i Kundmall → Justera stämplar. Normal, Lite tjockare, Tjock och Extra tjock gäller alla aktiva stämplar eller vald stämpel. Egen skala customerArrowScale (1–3), oberoende av etikettstorlek. Samma PDF-byggare används i kundmall och export. Pilspetsens linjer förstärks och storlek anpassas; objektpunkter och etikettplacering bevaras. Återställ alla storlekar ändrar enbart stämpelstorlek. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.338: Beställd tvåfingerzoom i kundmallens ritning. Separat visningszoom, skarp omrendering efter gest, zoom kring fingrarnas mittpunkt och begränsad canvasminnesåtgång. Ingen ändring av stämplarnas PDF-storlek, pillinjens bredd eller projektuppgifter. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.339: Användaren beställde samma kundmallsverktyg även i Säkerhetsservice och Brandsäkerhet. Ordinarie säkerhetsruntime använder nu samma ritningsbyggare för förhandsvisning och export och samma stämpelredigerare: alla/vald, storlek, återställ storlekar, pillinje, flyttning och tvåfingerzoom. Befintliga checklistor, rapporter, PDF-länkar, projektdatalagring och protokollval bevaras. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.340: Beställd muszoom i kundmallens ritning på dator för samtliga kontrollområden. Ctrl + mushjul (⌘ på Mac) zoomar kring pekaren, vanlig rullning bevaras. Samma separata visningszoom som tvåfingerzoom; PDF-data ändras inte. Kundmallsdialogens ritningsyta får korrekt kvarvarande höjd när verktygen radbryts. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.341: Beställd mindre text i Översikt → Beskriv åtgärd, inklusive hjälptexten Beskriv vad som gjordes för att lösa felet. 12 px på större skärmar, befintliga kompakta 10 px på små skärmar. Samma ändring för samtliga kontrollområden och i native-källan. Texter, innehåll och sparfunktion bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.342: Beställd standard i Kundmall för alla kontrollområden: Extra tjock pillinje (3×) och 177 % stämpelstorlek. Gäller när sparat eget val saknas; befintliga individuella justeringar bevaras. Återställ alla storlekar återgår till nya standarden 177 %. Kontroller för egna justeringar behålls. Samma byggare för kundmall och PDF-export, webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.343: Beställd hand/panorering i kundmallens ritningsvy. Vänster musknapp drar ritningen, handmarkör visar läget och klick efter dragning undertrycks. Stämpelhandtag behåller separat etikettflyttning. Samma redigerare i alla tre kontrollområden, webb/native-källor speglas. Zoom, PDF och projektdata bevaras. Kontrollflödet är åter LÅST.
