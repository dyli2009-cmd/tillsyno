# SmartMatch – Avläsning TEST 4

Den fasta testsidan `smartmatch-read-test.html` följer nu TEST 5. Bevarad versionssida för denna version: `smartmatch-read-test-v4.html`. Intern version `36.138-READ-TEST`. TEST 3 och dess filer är bevarade på `smartmatch-read-test-v3.html`; ordinarie SmartMatch 1.3, Kontrollflöde och native iOS har inte ändrats.

## Varför samma steg inte fungerade i TEST 3

Det första underlaget hade ett dörrkort per sida. Det nya har sex separata kort på en sida och fyra på nästa. TEST 3 sökte och lagrade endast ett kort per sida, vilket tappade de övriga områdena. Dessutom blev `KLASSRUM 1` felaktigt enbart `1` vid kodextraktion. Detta är korrigerat i den separata TEST 4-läsaren.

## Så gör du

1. **Visa ett dörrkort.** När flera kort finns på samma sida markerar du bara ett av dem som exempel. Tryck **Markera kod** och dra runt den beteckning du vill söka efter, exempelvis hela `KLASSRUM 1` i vänstra stämpeln. Ta inte med en annan beteckning bredvid, exempelvis `Dörr D01`, i samma markering. Båda kan vara riktiga ID-källor; välj en källa i ditt exempel.
2. **Markera tabell / arbetslista.** Dra runt samma korts hela arbetsinnehåll. En lista med rubriker och beskrivningar fungerar också; du behöver inte ha en tabell med produktkolumner.
3. **Hitta övriga dörrkort**, granska de föreslagna korten och tryck **Läs korten och sök på ritningen**. Varje kort läses i sitt eget område och kan väljas bort separat, även när flera delar samma PDF-sida.
4. **Granska träffarna och öppna arbetsprojektet.** Tryck **Visa**, avmarkera felaktiga träffar och godkänn granskningen. Ett klick på ritningen öppnar rätt kortutsnitt med just det kortets arbetslista. Klar-markeringar hör fortfarande till den enskilda dörrpositionen. `Arbete 0/9` visas inte på ritningen.

I det nya underlaget förekommer `GS1` även som exempel i teckenförklaringen. Sökningen visar därför elva textträffar. Avmarkera teckenförklaringens exempel så återstår de tio avsedda dörrpositionerna. Om du väljer D01–D10 som källa förekommer de både i rumsbeskrivningar och vid dörrarna, vilket också kräver granskning. Läsaren gissar inte vilka likadana texter som är fysiska dörrar.

## Vad som ändrats

Exemplets återkommande tabelltexter och deras relativa placering ger förslag på förflyttade och skalade kortområden. Varje kort får ett eget ID, källsidnummer, kodområde, arbetsområde och visningsutsnitt. Det finns inga fasta kundkoder, sidlistor eller rutnätskoordinater i läsaren.

Hela beteckningar med ord och siffror bevaras: `KLASSRUM 1` matchar hela `KLASSRUM1`, medan kända rubrikord i exempelvis `Dörrkort 140C` lämnar beteckningen `140C`. Tvetydiga val kräver granskning. På sökbara sidor utan bilder används den tillgängliga PDF-texten som kodkälla så att OCR inte skapar falska alternativ som `WE` för `WC` eller tappar accenten i `ENTRÉ`.

Upprepade kategorirubriker och följande beskrivningar kan bilda en arbetsuppgift tillsammans, även när produkttexten är helt versal. Den tidigare vanliga radtabellen behåller sina rader. Uppgifter från grannkort på samma sida tas inte med. Originalkortets visning och knappen **Passa** använder det aktuella kortets utsnitt.

Projekt-PDF och lokal återställning bevarar varje korts region och arbetsstatus. TEST 3:s sidbaserade läsdata kan återöppnas och behåller sitt tidigare arbete; kort utan sparat utsnitt visas som tidigare på helsida. TEST 4 använder egna lokala lagringsnycklar och sessionsdatabas.

## Verifierat 2026-10-16

- Det nya underlaget: tio kort, fördelade sex och fyra på två sidor. Samtliga tio beteckningar och deras sex egna arbetsuppgifter läses. Elva textträffar visas och tio avsedda dörrpositioner återstår efter granskning av teckenförklaringen.
- Ett annat genererat underlag med andra koder, annat sidformat, flyttade kort och helt versal produkttext verifierar att stödet inte är knutet till kundfilen.
- Båda flödena passerar i Chromium i dator-, iPhone- och iPad-storlek, med touchmarkeringar i de två senare. Klick, individuellt kortutsnitt, arbetsinnehåll, separat status och omladdning verifieras. Desktop kontrollerar även projekt-PDF, återöppning i ny webbläsarkontext och konflikt med lokal läsdata.
- Det tidigare underlaget behåller alla 25 länkar, sju dörrkort och nio arbetsrader per kort. Äkta tidigare TEST 3-export och separat genererad bakåtkompatibilitetskontroll återställs med länkar och arbetsstatus.
- Inga externa OCR-anrop eller JavaScript-fel uppstod. Kundfiler och exporterade PDF-underlag har inte lagts i repot. Inloggning ersätts av testharnessen och livekonton har inte verifierats.

Tester:

- `node tests/smartmatch-read-regions-v4.cjs`
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-regions-browser-v4.cjs`
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-single-cards-v4.cjs`

Ange `REAL_MULTI_CARD_PDF` som lokal filväg för den nya tresidiga kontrollfilen och `SMARTMATCH_REAL_PDF` för den tidigare åttasidiga filen. PDF:erna följer inte med testerna. `SMARTMATCH_DEVICE=desktop`, `iphone` eller `ipad` begränsar en körning.

## Kvarvarande avgränsning

Upprepade områden känns igen genom läsbar PDF-text i exemplet. Skannade kort kan fortfarande bildläsas inom valda läsområden, men automatisk upptäckt av flera helt skannade kort på samma sida är inte verifierad. Andra eller oläsbara upplägg kan behöva nya markeringar eller manuell rättning. Chromium-touchtester ersätter inte fysisk Safari/iOS. Ingen TestFlight-build ingår.
