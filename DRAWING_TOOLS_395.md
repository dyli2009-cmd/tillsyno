# Ritningsverktyg v2.4.395 – Digitalisera dörrkort TEST

Den här testfunktionen gör en kontrollerad, redigerbar arbetskopia av dörrkort innan de kopplas mot en ritning. Den synliga käll-PDF:en ändras inte. Resultatet får en gemensam ren layout och bygger på innehållet i originalkortet; det är inte en pixelidentisk kopia av projektörens mall.

## Arbetsgång

1. Öppna käll-PDF:en i **Ritningsverktyg** och visa ett representativt dörrkort.
2. Öppna **Verktyg → Digitalisera dörrkort · TEST** och välj **Markera dörrkort på aktuell sida**. Dra runt hela kortet: rubrik, tabellrubriker, samtliga avsnitt och all text som ska bevaras.
3. Ge mallgruppen ett namn och välj **Skapa mall från markeringen**. Kontrollera exempelkortet sida vid sida och välj sedan **Godkänn mallgruppen**.
4. Ange sidorna som använder samma layout, exempelvis `6–75`. **Föreslå sidor med samma sidformat** är bara ett förslag; kontrollera urvalet innan läsning.
5. Välj **Läs valda dörrkort**. Appen behandlar en sida i taget och visar fas, sida, procent, förfluten tid och beräknad återstående tid. Avläsningen kan avbrytas.
6. Välj **Öppna granskningen**. Originalet visas till vänster och det digitala kortet till höger. Rätta beteckning, rubrikfält och celler, flytta eller lägg till rader och hantera listan **Text som inte förts över**.
7. Välj **Godkänn kort** först när original och digitalt kort stämmer. Gå vidare med **Nästa osäkra** tills samtliga kort är kontrollerade.
8. Välj **Spara digitala dörrkort som PDF** för godkända kort. Välj även **Spara hela projektet som JSON** för en komplett, flyttbar datakopia.

Redan lästa sidor behålls när samma sidurval körs igen. **Läs aktuellt kort igen** används när ett enskilt kort behöver ersättas med en ny avläsning. Det befintliga granskade kortet ligger kvar om omläsningen avbryts eller bara blir delvis färdig.

## Vad som läses och sparas

Verktyget kombinerar ord som redan finns som PDF-text med lokal OCR för bildbaserad text. OCR använder de lokala svenska och engelska Tesseract-filerna. Överlappande observationer slås ihop, men källa, position, säkerhetsvärde och alternativa läsningar finns kvar för granskning. Om PDF-texten och bildavläsningen säger olika saker måste användaren välja rätt alternativ eller rätta själva fältet; en vanlig markering som kontrollerad räcker inte.

Den första mallen lär sig kortets beteckningsområde, kolumner och följande avsnitt när de finns i originalet:

- Daglåsning
- Nattlåsning
- Övrig utrustning
- Larm-Passer

Standardkolumnerna är **Benämning**, **Typ / utförande**, **Antal** och **Monteras av**. Kortets beteckning kan även läsas från ett inlärt läge när originalet saknar ordet *Beslagskod*, exempelvis `GS23`, `GS 23` eller `WC`.

Varje källord måste ha ett tydligt slutläge: placerat i ett fält eller en rad, eller uttryckligen ignorerat. En osäker placerad textdel måste dessutom markeras som kontrollerad. Låg säkerhet, positionsbaserad avsnittstolkning och oplacerad text blockerar godkännande tills användaren har hanterat dem. En delvis avbruten eller felaktig avläsning kan inte godkännas; kortet måste läsas igen. Om en avläst rad tas bort återgår dess källord till granskningslistan och försvinner inte tyst.

## Dataformat

Version 1 använder separata, validerade scheman:

- `tillsyno.door-card-template` för mallgruppen
- `tillsyno.digital-door-card` för ett digitalt kort
- `tillsyno.digital-door-card-project` för hela arbetsprojektet
- `tillsyno.digital-door-card-export` för den fristående JSON-exporten

Kortdata innehåller källsida och markerat område, redigerbar rubrik, strukturerade avsnitt och rader, källord med proveniens samt gransknings- och ändringsstatus. PDF-exporten skapar en sökbar vektorsida per godkänt kort och bifogar det kanoniska JSON-underlaget. JSON-exporten innehåller hela projektet, även kort som ännu behöver granskas och oplacerade ord.

## Lokal lagring och skydd

Arbetet autosparas i IndexedDB-databasen `tillsyno-digital-doorcards-v1` under källfilens fingeravtryck. Endast mall, kortdata, framsteg och begränsad filmetadata sparas. Käll-PDF, sidbilder, förhandsbilder och andra stora binärdata lagras inte i projektposten. När samma källfil öppnas igen kan granskningen fortsätta från den lokala kopian. Panelen visar hela tiden om beständig autosparning är aktiv. Om privat läge, lagringskvot eller webbläsarpolicy blockerar IndexedDB visas en röd varning; arbetet finns då bara under den aktuella sessionen och JSON måste sparas innan sidan stängs eller laddas om.

Original-PDF:en skrivs aldrig över. Läsning och export körs lokalt; inga dokument eller OCR-bilder skickas till en extern tjänst. Sidavläsning är sekventiell och originalförhandsvisningen har begränsad pixelbudget för att minska minnesbelastningen. PDF-export tar bara med godkända kort. JSON bör sparas som separat projektbackup, särskilt före rensning av webbläsardata eller byte av enhet.

## Avgränsningar i första testet

- Ett projekt använder en mallgrupp. Sidor med en annan layout ska inte läsas med samma mall.
- Automatisk identifiering av sidor med samma storlek bevisar inte att tabellayouten är densamma.
- Dålig skärpa, handskrift, sammanfogade tabellceller och ovanliga rubriker kan kräva manuell rättning.
- Digital PDF är en kompakt, enhetlig arbetskopia. Den återskapar inte originalkortets grafiska form pixel för pixel.
- Exporten kopplas ännu inte automatiskt till SmartMatch eller slås ihop med ritnings-PDF:en.
- Lokal autosparning följer webbläsaren och enheten. JSON-filen är den portabla projektkopian.
- En fysisk iPad med stora kundfiler återstår som praktiskt slutprov.

## Verifiering

- `tests/drawing-card-digitizer-core.cjs` kontrollerar svensk text, inlärd mallposition, kodvarianter, tabellavsnitt, låg säkerhet, full källordstäckning, redigering, godkännande och JSON-rundtur.
- `tests/drawing-card-digitizer-storage.cjs` kontrollerar stabilt källfingeravtryck, IndexedDB-/minneslagring, migrering och att PDF-byte eller förhandsbilder inte lagras.
- `tests/drawing-card-digitizer-export.cjs` kontrollerar sökbar vektor-PDF, svenska tecken, flera sidor, bifogad kanonisk JSON och integritetsrapport för oplacerad text.
- `tests/drawing-ocr-reader.cjs` kontrollerar att den nya valfria ordlistan kan lämna både PDF-text och OCR-observationer till digitaliseringen utan att ändra äldre läsares kontrakt.
- `tests/drawing-card-digitizer-browser.cjs` kör hela gränssnittsflödet, PDF/JSON-export, IndexedDB-återställning, simulerat lagringsfel, avbrytning samt spärr för delvis avlästa kort.
- `tests/drawing-card-digitizer-large-preview-browser.cjs` öppnar den riktiga Tånga-filen med 52 A1-sidor och verifierar upprepade iPad-renderingar under 3 megapixlar utan externa anrop eller krasch.

Statisk JavaScript-kontroll och Ritningsverktygets befintliga regressionsprov ska också passera före publicering. Kontrollflöde, SmartMatch och autentisering ligger utanför denna ändring.
