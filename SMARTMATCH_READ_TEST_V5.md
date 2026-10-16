# SmartMatch – Avläsning TEST 5

Den fasta testsidan `smartmatch-read-test.html` följer nu TEST 6. Bevarad versionssida för denna version: `smartmatch-read-test-v5.html`. Intern version `36.139-READ-TEST`. TEST 4 finns kvar på `smartmatch-read-test-v4.html` med sina tidigare källfiler. Ordinarie SmartMatch 1.3, Kontrollflöde och native iOS ingår inte i ändringen.

## Snabbare sökning i stora PDF-ritningar

En PDF kan ha stämplarnas beteckningar och positioner sparade som annoteringar, även när stämpeltexten inte ingår i sidans vanliga textsökning. TEST 4 läste annotationens `Contents` via PDF.js, men saknade `Subj`. Ett litet bildobjekt på samma stora sida kunde därför starta bildläsning av hela ritningen i hundratals områden.

TEST 5 läser `Subj`, `Contents`, `Subtype`, flaggor och PDF-rektangel från PDF-lib-dokumentet som öppningsguiden redan behöver. PDF:en parsas en gång för både projektinformation och stämpelindex i guiden. Indexet innehåller inga hårdkodade projektbeteckningar, sidmått eller koordinater.

Förvalet **Snabb sökning – PDF-stämplar först** använder stämpelindexet direkt på en ritningssida när alla efterfrågade beteckningar har entydiga, synliga PDF-stämplar där. Den vägen anropar varken sidans textextraktion, operatorlista, rendering eller OCR. Resultat och koordinater ska fortfarande granskas. En tydlig rad anger att övrig vanlig text och bilder på sidan inte kontrollerats.

Välj **Sök även i bilder (tar längre tid)** och tryck **Sök på ritningen igen** för att komplettera med vanlig PDF-text och full bildläsning. Om stämpelindexet inte täcker efterfrågade beteckningar på sidan används tidigare text-/bildreserv även i snabbläget. En native textträff ensam stoppar alltså inte sökningen efter bildbaserade etiketter.

Olika fullständiga beteckningar hålls isär: exempelvis GS23, GS230 och GS23-A. Motstridiga efterfrågade beteckningar i samma annotering ger en varning och text-/bildreserv, inte två automatiska kortkopplingar. Invisible/Hidden/NoView-stämplar och ogiltiga rektanglar används inte. Ett markerat ritningsexempel kan bekräftas mot stämpelns position utan OCR.

## Så gör du

1. Öppna PDF:en på testsidan. Välj ett dörrkort och markera den beteckning som ska matchas samt dess tabell eller arbetslista.
2. Tryck **Hitta övriga dörrkort** när filen innehåller flera kort. Granska kortlistan. Varje kort behåller sitt eget läsområde även när flera delar samma sida.
3. Låt **Snabb sökning – PDF-stämplar först** vara valt och tryck **Läs korten och sök på ritningen**. Skannade kortfält läses fortfarande lokalt inom sina markerade områden.
4. Tryck **Visa** för att kontrollera placeringarna. En färdigrenderad förhandsvisning återanvänds när nästa träff ligger på samma sida och zoom. Välj bildsökningen och sök igen om bildstämplar också behöver kontrolleras.
5. Granska valda träffar, kryssa i bekräftelsen och öppna arbetsprojektet. Varje dörrposition har egen arbetsstatus även när flera positioner använder samma dörrkort.

Ett redan sparat projekt behåller sina granskade kopplingar. Öppna **Läsområden**, välj söksätt och sök igen för att använda den nya sökvägen. TEST 5 har egna lokala nycklar och sessionsdatabas; exporterade äldre läsprojekt kan fortfarande öppnas.

## Kontroll av den stora skolritningen

Den lokala kontrollfilen är cirka 12,45 MB och har två sidor. Ritningen har 236 annoteringar, varav 40 synliga stämplar med `Subj=GS23`. Det medföljande kortet har **Beslagskod: GS 23** som bildtext i tabellens översta vänstra hörn. Litterafältet beskriver en särskild dörr och är en annan ID-källa.

I Chromium-testet tog PDF-lib-inläsning och indexering cirka 1,5 sekunder och den efterföljande stämpelsökningen cirka 10 millisekunder. Alla 40 GS23-positioner hittades med noll anrop till ritningssidans textläsning, annoteringsläsning via PDF.js, operatorlista, rendering och OCR under själva sökningen. TEST 4-vägen startade i stället 325 OCR-områden. Tiderna är mätningar på testdatorn, inte en garanti för en viss telefon eller hela öppningsflödet.

Detta underlag innehåller ett GS23-kort. Andra stämpelkoder får kopplingar när motsvarande dörrkort finns med och valts; antalet matchade koder är inte hårdkodat.

## Verifiering

- `node tests/smartmatch-read-stamps-v5.cjs`: råa PDF-metadata, Unicode, objekt-referenser, flaggor, felaktiga annoteringar och PDF-rundresa.
- `node tests/smartmatch-read-matcher-v5.cjs`: snabbväg, flera koder, saknade koder, ID-gränser, motstridiga metadata, rotation, exempelmarkering, blandat bildinnehåll, uttrycklig bildsökning och avbrytning.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-metadata-fallback-v5.cjs`: ett fel i stämpelindexeringen får inte tappa importerade kort, granskade kopplingar eller sparat arbete.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-fast-browser-v5.cjs`: genererad stor ritning, bildbaserad kortrubrik, faktisk indexering och sökning, granskning, återanvänd förhandsvisning, kortklick, separata arbetsresultat och återöppning. `SMARTMATCH_SCHOOL_PDF` kan ange den uppladdade kontrollfilens lokala sökväg. Kundfilen ingår inte i repot.
- `SMARTMATCH_READ_VERSION=v5 CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-matcher-v3.cjs`: verklig lokal OCR av blandad vanlig text och färgade bildetiketter.
- De befintliga browserharnessarna `tests/smartmatch-read-regions-browser-v4.cjs` och `tests/smartmatch-read-single-cards-v4.cjs` kan köras med `SMARTMATCH_READ_VERSION=v5`. Standardvalet är fortsatt v4.

Verifierat 2026-10-16: skolfilens 40 länkar, kortupptäckt, bildbaserade kodfält, målad kortbild, arbetsrader, separat dörrstatus och omladdning passerar i Chromium, inklusive telefonstorlek. Genererat underlag passerar dator-, iPhone- och iPad-storlek. Tidigare underlag med tio kort på delade sidor samt sju kort på separata sidor behåller sina tio respektive 25 granskade länkar, arbetsinnehåll, export och återöppning.

## Kvarvarande gränser

Snabbsökning via stämpelmetadata bevisar inte att inga ytterligare etiketter finns som vanlig text eller bilder på sidan. Bildsökningsvalet finns för denna komplettering. PDF:er med ofullständiga stämpelmetadata kan fortfarande behöva den långsammare reservläsningen.

Första visningen av en ritning med mycket vektorinnehåll kan fortfarande ta flera sekunder. Sökförbättringen bygger inte om visaren till DZI/bildkaklor. Förhandsvisning och arbetsritning behåller sina begränsningar för bildminne. Automatisk upptäckt av flera helt skannade kort på samma sida har samma avgränsning som TEST 4. Chromium i telefon-/surfplattestorlek ersätter inte fysisk Safari/iOS-verifiering.

All bearbetning använder lokala projektbibliotek; ingen ny extern tjänst eller CDN har lagts till. Inloggning och licensregler är oförändrade. Kundfiler, skärmbilder och exporterade projekt ligger utanför det offentliga repot.
