# SmartMatch – Avläsning TEST 9.9

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-9.html`. Intern version: `36.152-READ-TEST`. Tillsyno-version: `v2.4.376`.

Användaren rapporterade att 77 färdiglästa kort ändå kunde blockera nästa steg, bland annat när två olika kortsidor hade GS23. Den tidigare granskningsvyn krävde unika och lästa beteckningar för alla valda kort. Kortens stora paneler och placering i en smal sidokolumn gjorde det svårt att hitta orsaken. Ett kort utan motsvarande ritningsstämpel var däremot inte i sig ett krav på att hela projektet skulle stoppas.

## Hitta det som återstår

1. Gör avläsningen som tidigare. Datorns dialog använder mer av skärmen. Den kompakta kortlistan ligger direkt under förhandsvisningen, med detaljer som kan öppnas vid behov.
2. Välj **Behöver åtgärdas** för att se kort med saknad eller dubbel beteckning, ändrat läsområde eller läsfel. Varje kort visar orsaken i klartext.
3. Sök på exempelvis **GS23**, **51** eller **sida 51**. **Nästa att kontrollera** går till nästa problemkort och visar dess sida utan ny avläsning.
4. Vid två kort med samma kod: välj **Använd detta kort** på den kortsida som ska gälla. De andra exemplaren läggs åt sidan. Appen väljer inte första dubbletten automatiskt.

## Fortsätt med det som är klart

1. Välj **Lägg åt sidan** på enstaka kort, eller **Fortsätt med klara kort** för att lägga de olösta korten åt sidan tillsammans.
2. Granska de faktiska ritningsträffarna och bekräfta dem. Klara unika kort som saknar ritningsträff kan ligga kvar för senare manuell koppling.
3. Öppna projektet. Åsidosatta kort kopplas inte genom gissning. De ursprungliga PDF-sidorna finns kvar.
4. Välj **Spara → Spara PDF**. Sparningskontrollen visar både avlästa kort och antalet åsidosatta kort som följer med filen.
5. Nästa gång används den sparade avläsningen direkt. Välj **Fortsätt med … kort att kontrollera** när du vill rätta det som återstår. Redan klara kopplingar och arbete används igen.

Om ritningssökningen avbryts visar appen felet. Ett uttryckligt fortsatt val kan använda tidigare kända positioner; ett misslyckat sökresultat får inte utges för att vara fullständigt. Saknas tidigare träffar skapas inga automatiska kopplingar från den misslyckade sökningen. Användaren kan öppna projektet för senare manuell komplettering efter bekräftelse.

Produktläsningens GS-regel behålls. Att lägga ett misslyckat produktförsök åt sidan får inte ersätta en tidigare arbetslista med en tom lista. Tidigare arbete och den återstående uppgiften måste följa med i projektet.

## Lagring och avgränsning

Klara kort och åsidosatta kort lagras separat i projektdata. Åsidosatta kort behåller avläst text, läsområde, sida och orsaken till att de återstår. Alla kända kortsidor undantas från ritningssökning, även när en kortbeteckning inte kunde läsas. PDF-sidor tas inte bort av granskningsvalen.

Gruppkopplingar från 9.8, fysiska positioners ID:n, kontroller, tidjusteringar och bortval ska bevaras. Ett åsidosatt kort med samma beteckning som ett redan kopplat källkort ersätter inte det använda kortet vid fortsättning. Behåll valet eller korrigera beteckningen om det faktiskt är ett annat kort. Den befintliga gruppändringen används fortsatt för att byta mellan redan avlästa kort, med separat arbetshistorik.

9.8 och tidigare snapshots behålls. 9.9 använder separat lokal lagring och kan kopiera tidigare 9.8-arkiv utan att källan ändras. Delvis färdiga projekt med åsidosatta kort öppnas i 9.9 eller senare. Ingen ändring i ordinarie SmartMatch, DA/SLR-regler, GS-montageregeln, Ritningsverktygets funktioner, Kontrollflöde, beta 10 eller auth.

## Verifiering

- `node tests/smartmatch-read-partial-browser-v9-9.cjs`: genererade 77 kort med dubblett, saknad kod och saknad ritningsträff; kompakt granskning, uttryckligt dubblettval, fortsatt arbete, avbruten sökning och sparad PDF till ren webbläsare.
- `node tests/smartmatch-read-partial-state-v9-9.cjs`: sparade åsidosatta kort, validering, sidklassning och bevarat tidigare arbete.
- `SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-work-browser-v9-9.cjs`: tidigare GS-produktprov med kompaktvyns öppning av detaljer; oläst montagekolumn stoppar vanlig sparning tills området rättats, och tidigare kopplingar/arbete/tider bevaras.
- Befintliga GS-produkt-, grupp-, sparnings- och återöppningstester körs mot den nya sidan i den omfattning ändringen berör dem. Tidigare testfiler ändras inte.

En testfil med 77 kort är syntetisk. Användarens aktuella PDF med 77 kort har inte bifogats här. Dator-/iPad-/iPhone-vyer provas med webbläsaremulering; fysisk iOS och TestFlight verifieras separat.

Verifierade resultat: det första utökade webbläsarprovet passerar på dator och iPad. 77 kort kan granskas med minst fem kompakta rader synliga under förhandsvisningen på dator. Ett uttryckligt primärval lämnar 74 ritningskopplingar, en giltig omatchad beteckning och två kort för senare. Misslyckad ritningssökning kan uttryckligen fortsätta med tidigare 74 positioner; hela PDF:ens 78 sidor behålls. Senare manuell rättning söker endast den nya beteckningen och lämnar de klara korten oförändrade. Ett misslyckat produktförsök bevarar tidigare GS-rader, bockning och tidsjustering, sparas som en väntande uppgift och läses om riktat. Färdig PDF öppnas i ren webbläsare med 0 nya avläsningar, produktläsningar, OCR-arbetare och guider. Metadata-/valideringsprovet och tidigare grupp-, spar- och GS-produktregressioner passerar; Unicode-/produkt-/PDF-provet passerar på dator-, iPad- och iPhone-storlek.

Slutligt utökat webbläsarprov passerar på dator och iPad, även helt åsidosatt projekt med 0 kopplingar, sparning och riktad fortsättning. Sex hela kort syns samtidigt i den kontrollerade datorvyn vid 1440×1000; förhandsvisningen ligger kvar när kortlistan rullas. Nytt granskningsflöde återställer gammal sid-/kodsökning, medan filtrering behålls under pågående granskning.
