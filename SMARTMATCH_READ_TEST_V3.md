# SmartMatch – Avläsning TEST 3

Separat test: `smartmatch-read-test-v3.html`. Den fasta avläsningsadressen `smartmatch-read-test.html` visar samma version. TEST 2 finns kvar som `smartmatch-read-test-v2.html` med sina tidigare läsfiler. Ordinarie SmartMatch 1.3, Kontrollflöde och native iOS är inte ändrade. Intern testversion: `36.137-READ-TEST`.

## Så provar du

1. **Öppna din PDF. Visa ett exempelkort.** Välj sidnummer i guiden. Tryck **Markera kod** och dra runt rubriken eller rutan som innehåller beteckningen. Hela `Dörrkort 140C` eller `Toalett 140C` går bra: koden blir `140C`. Tryck **Markera tabell** och dra runt arbetstabellen med dess produkttexter.
2. **Tryck Hitta övriga dörrkort.** Appen använder dina två läsområden för att föreslå andra kort med liknande tabellinnehåll. Granska sidlistan. Under **Kontrollera alla sidor** kan du lägga till eller ta bort sidor. Du kan också skriva sidnummer under **Sparad läsmall eller välj kortsidor själv**.
3. **Tryck Läs korten och sök på ritningen.** Varje korts egen rubrik och tabell läses. Kontrollera fältet **Beteckning att matcha**; öppna **Granska tabell och arbetsrader** vid behov. Appen söker kortens hela beteckningar på samtliga övriga sidor. Ändrar du en beteckning, tryck **Sök på ritningen igen**.
4. **Tryck Granska träffarna.** Använd **Visa** för att kontrollera platsen, avmarkera fel och kryssa i **Jag har granskat träffarna på ritningen**. Tryck **Öppna arbetsprojekt**. Där öppnar ett tryck på en dörrposition dess dörrkort och arbetslista. Varje fysisk dörr har egna Klar-rutor och egen arbetsprocent även när flera dörrar använder samma kort. Använd befintlig projekt-PDF-export för att flytta arbetet till en annan enhet.

Vid bildtext kan du också trycka **Markera stämpel på ritning**, visa ritningssidan, välja rätt beteckning och dra en tät ruta kring en exempelstämpel. Tryck sedan **Sök på ritningen igen**. Exemplet hjälper bildläsningen med textstorleken.

## Återanvändning och avgränsning

Läsområdena är relativa till sidans mått. Läsmallen lagrar bara namn och områden; den lagrar inte exempelkortets text som facit för andra kort. Sökningen innehåller inga kundnamn, fasta koder, fasta sidlistor eller koordinater från den uppladdade filen. Samma förfarande kan användas med andra beteckningar och andra sidformat.

Sidförslagen kräver liknande läsbart tabellinnehåll i de markerade områdena. Skannade områden kan bildläsas lokalt. Annan placering, annat kortupplägg, oläsbar text eller tvetydiga beteckningar kan kräva nya markeringar, manuellt sidval eller rättning. Ett exempel garanterar inte tolkning av alla tänkbara ritningar. Avvikande koder som `WCA` respektive `WC` likställs inte automatiskt.

Ritningssökningen använder sökbar PDF-text, PDF-annoteringar och lokal OCR på sidor med bilder eller utan textträffar. Färgade bildstämplar ingår i den renderade bilden; färg ensam skapar ingen kortkoppling. Hela beteckningen gäller: `WC` matchar inte `HWC`, `WCA` eller `WC1`; `1` matchar inte en del av `11` eller ett längre sammansatt ID. Svag OCR ska lämnas för granskning. De granskade positionerna används direkt i arbetsprojektet.

TEST 3 har egna lokala lagringsnycklar, sessionsdatabas och versionsfiler. Tidigare sparad läsdata kan läsas ur projekt-PDF:ens metadata. Originalfilen skrivs inte över, och kundunderlaget har inte lagts i repot. Ingen ny installation av en fullständig offlineapp ingår. Inloggningsregler och befintliga SmartMatch-profiler är oförändrade.

## Verifiering

- `node tests/smartmatch-read-codes-v3.cjs`: generella beteckningar, tvetydigheter, sidförslag från exempel, ritningsskydd och OCR-gränser.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-matcher-v3.cjs`: verklig PDF med sökbar text och färgade bildstämplar, exakta ID-gränser, begränsade OCR-delbilder och avbrytning.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-table-v3.cjs`: blandad tabell med native text, bildprodukt och separat bildrad samt helt skannat kort. Långa tabellinjer tas bort enbart i den tillfälliga OCR-bilden; native text och OCR kompletterar varandra efter position.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-guide-v3.cjs`: verkligt gränssnitt, ett exempel, kort på utspridda sidor, klickbara kopplingar, separata arbetsstatusar och återöppning. Ange `SMARTMATCH_REAL_PDF` som lokal filväg för att även köra det uppladdade åttasidiga kontrollunderlaget. Kundfilen medföljer inte testet. Playwright och Chromium krävs.

Det uppladdade underlaget innehåller en ritningssida, sju dörrkort och 25 märkningar: sju `140C` samt tre vardera av `VC`, `WC`, `HWC`, `130C`, `KONTOR` och `TEKNIK`.

Verifierat 2026-10-16:

- Hela det uppladdade underlaget passerar i dator-, iPhone- och iPad-storlek i Chromium. Ett markerat exempel ger sju föreslagna kort, alla 25 korrekta kopplingar och nio kompletta arbetsrader per kort. Samtliga nio produktvärden verifieras.
- Ett annat genererat underlag med annat sidformat, andra koder, varierande rubrikord och kort på utspridda sidor passerar i samma tre vyer. Längre liknande beteckningar ger inga delträffar.
- Klick öppnar rätt arbetslista. Två dörrar med samma kort har oberoende Klar-markeringar och arbetsprocent. Omladdning behåller arbetet.
- Projekt-PDF exporteras och öppnas i en ny webbläsarkontext. Filens inbäddade arbetsstatus får företräde även när giltig men motstridig lokal läsdata finns för samma PDF.
- Separata test för helord, färgade bildstämplar på blandade ritningssidor, avbrytning, blandade tabellrader och helt skannat dörrkort passerar. Bildrutor begränsas och inga externa OCR-anrop görs.
- TEST 2-snapshot är byte-identisk med tidigare testsida och dess JS/CSS är oförändrade. Den fasta adressens innehåll är identiskt med TEST 3-sidan. Resursreferenser, unika HTML-ID:n, JavaScript-syntax och whitespace är kontrollerade.

Webbläsartesterna ersätter auth-vakten för att kontrollera appens lokala arbetsflöde; de verifierar inte livekonton eller nya behörigheter. Emulerade touchvyer i Chromium ersätter inte ett prov på fysisk iPhone/iPad med Safari. Verifieringen ovan kördes lokalt före publicering. Ingen TestFlight-build ingår.
