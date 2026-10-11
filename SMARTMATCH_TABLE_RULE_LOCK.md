# SmartMatch – låst regel för tabellavläsning och ritningskoppling

**STATUS: LÅST enligt användarens beslut 2026-10-11.**

Denna regel gäller standardprofilen för dörrkortsidentifiering i SmartMatch. Principen får endast ändras efter en uttrycklig instruktion från användaren. Låset gäller avläsningsregeln; rättningar som gör implementationen förenlig med regeln är tillåtna.

## 1. Tabellen först

Appen ska först identifiera dörrkortets tabell och dess celler, inklusive tomma celler. Tabellens placering på sidan, antal kolumner och vilka utrustningsrader som finns under ID-rutan får inte bestämma vilket dörr-ID som väljs.

## 2. Översta vänstra rutan är källan

Beteckningen ska läsas från tabellens översta vänstra cell. En sammanfogad översta cell som börjar vid tabellens vänsterkant räknas som denna cell. Projekttext ovanför tabellen, högerkolumnen och senare utrustnings-/artikelrader får inte ersätta ID-källan.

Exempel: `Dörrkort 140 C` ger `140C`; `140C` och `140 C` ska matcha samma beteckning. `GC1`, `GS2` och `GS 1` ska också kunna läsas. Beteckningen får inte väljas beroende på vissa obligatoriska rubriker som Littera, Antal eller Hängning.

Om första rutan är tom, oläsbar eller tvetydig ska kortet visas som olöst. Appen får inte gissa ett ID från en annan ruta.

## 3. Därefter läses ritningen

När kortets beteckning är identifierad ska appen hitta motsvarande hela beteckning på ritningen och koppla rätt dörrkort till den positionen. Textens koordinater används för placering, inte som krav på att kort och ritning ligger på samma ställe. `1` får inte matcha en del av `11` eller `1-45-1`. Flera ritningspositioner kan ha samma kortbeteckning och ska behålla sina egna positioner.

Ritningstexten måste vara läsbar. Skannad bildtext kan kräva OCR; oläsbara eller osäkra träffar ska redovisas i stället för att kopplas genom gissning.

## 4. Ett nytt tabellupplägg

**Användarens förtydligande 2026-10-11: tabellens uppbyggnad är ett viktigt underlag.** När ett projekt använder ett nytt eller oprövat dörrkort ska användaren lägga in ett exempel på själva tabellen, helst som PDF. Vi ska läsa exemplet och förstå tabellens gränser, rader, kolumner, eventuella sammanfogade eller tomma celler och vilken ruta som är överst till vänster. Först därefter verifieras ID-avläsningen och matchningen mot ritningen för detta upplägg.

Arbetsgången är **lägg in tabellen → förstå och kontrollera uppbyggnaden → läs ID i översta vänstra cellen → matcha hela ID på ritningen**. Koordinater hjälper oss att hitta cellen i det upplägget; de är inte ett krav på att alla framtida tabeller måste ha samma placering.

Om exemplet visar att befintlig avläsning inte fungerar ska stödet rättas inom denna låsta regel och testas mot exemplet. Ett upplägg som redan är verifierat behöver inte läras om för varje kort. Att användaren lämnar ett exempel innebär inte i sig att appen automatiskt lär sig eller sparar en ny tabellmall.

Vid ett nytt eller tidigare oprövat tabellupplägg ska användaren först öppna/läsa in ett dörrkort i appen. Avläsningen ska kontrolleras mot den verkliga tabellen: var den börjar, vilken cell som är överst till vänster och vilket ID som läses där.

Om appen inte kan tolka upplägget ska avläsningsstödet undersökas och vid behov anpassas och testas med ett exempel innan automatisk koppling för det upplägget betraktas som fungerande. Ett nytt upplägg ändrar inte den låsta regeln om ID-källan.

Målet är generell automatisk tabellavläsning, inte obligatorisk projektspecifik kod. Att öppna ett exempel innebär inte att appen idag automatiskt lär sig en ny tabellmall eller sparar ett sådant upplägg.

## 5. Verifierad status när regeln sparas

TEST v36.87 hittar alla 15 dörrkorts-ID:n i användarens Snidaren-PDF vid test med appens PDF.js 3.11.174. Den nuvarande implementationen använder fortfarande text- och rubrikheuristik; generell geometrisk cellidentifiering för alla tabellupplägg är inte färdig eller garanterad.

Detta dokument sparar och låser beteenderegeln. Det inför ingen ny appfunktion eller ny testversion.

## 6. Samband med dörrautomatik och gemensam regelsamling

Den här regeln bestämmer **dörrkortets ID → motsvarande ritningsposition**. [Automatikregeln](SMARTMATCH_AUTOMATION_RULE_LOCK.md) bestämmer **automatikens märkning → objektsökning → närmaste GS-position**. GS-positionens dörrkortskoppling gör att man kan hitta vidare till kortet, men kortets automatikrad eller modell får inte hindra automatikens knapp eller närmaste-GS-pil.

Se [samlade funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md) för motiven, sambandet och hur reglerna ska förklaras vid nästa genomgång.

I v36.92 verifierades den verkliga sidklassningen i Chromium: Snidarens ritningssidor 1–10 utesluts från kortlistan och kortsidor 11–25 ger alla 15 korrekta ID:n. Det förbättrar skillnaden mellan ritning och kort utan att ändra ID-källan. Generell geometrisk cellidentifiering för alla tabellupplägg är fortfarande inte färdig.

## 7. Verifierat namngivet kort i samma grundupplägg – TEST v36.93

Användaren lade in ett exempel med översta sammanfogade cellen `Dörrkort Teknik` och två utrustningskolumner. Upplägget lästes och kontrollerades. Avläsningen utökades inom den låsta regeln så att en uttrycklig Dörrkort-rubrik med ett alfabetiskt namn på 2–6 bokstäver kan ge ID:t, här TEKNIK. Andra befintliga numeriska/GS-ID:n behåller tidigare avläsning.

Den skickade kort-PDF:en är verifierad ensam i appen. En genererad testritning med två Teknik-positioner kopplas till samma kort; längre ord som Teknikrum matchas inte och klick öppnar kortet. Ingen faktisk kundritning för detta exempel har verifierats. Se [TEST v36.93](SMARTMATCH_TEST_V36_93.md). Stödet kan återanvändas för samma kontrollerade upplägg; detta är inte automatisk inlärning av nya tabellmallar.

## 8. Separat känd läsprofil – TEST v36.94

**Användarbeslut 2026-10-11:** Nya tabellupplägg får läggas till som kända läsprofiler, samtidigt som den tidigare fungerande avläsningen och dörrautomatikregeln behålls. Det är ett separat tillägg för det nya upplägget; standardprofilens översta vänstra ID-cell är fortsatt låst.

Exemplet visar fem kort med en uttrycklig `Dorrkort <ID>`-titel ovanför tabellen, följd av `Objekt: <beskrivning>`, sedan `Komponent | Produkt` och utrustningsrader. Här är tabellens första vänstra cell alltså Komponent, inte dörr-ID. Den nya profilen `card-title-object-components-v1` läser ID från korttiteln endast när just detta sammanhängande upplägg och dess kolumngeometri känns igen. Den väljer inte projekttext, objektbeskrivningen eller produktvärden som ID.

Befintlig avläsning har företräde och dess funktioner är oförändrade. Den nya profilen används bara när den inte gav något ID. Saknad struktur, flera korttitlar, osammanhängande titeltext och tvetydiga beteckningar förblir olösta. Profilen gäller vanlig läsbar PDF-text; andra, roterade eller skannade upplägg är inte verifierade.

En tabell-PDF räcker som underlag för att lägga till och verifiera den här läsprofilen. Andra kort med samma kända upplägg och andra tydliga ID:n använder profilen utan projektspecifik kod. När de aktuella dörrkorten finns i appens projekt matchas deras hela ID mot ritningen genom befintlig sökning. Att skicka ett exempel till utvecklingsarbetet installerar inte automatiskt en runtime-mall eller lägger in filen i användarens projekt.

Verifierat i den faktiska TEST v36.94-sidan i lokal Chromium: fem kort identifieras även utan ritning; den kombinerade sexsidiga filen ger 14 korrekta ritningspositioner och fem korrekta kortsidor. Kontor och Teknik på ritningen saknar kort i filen och får därför ingen kortkoppling. Tidigare 15 GS-kort, Teknik-kortet i första cellen och dörrautomatikens v36.92-beteende har regressionstestats. Se [versionsdokumentet](SMARTMATCH_TEST_V36_94.md).

## 9. Kända profilen är kort även med en utrustningsrad – TEST v36.95

En extra kontroll visade att v36.94 identifierade titelns ID i en kort tabell men därefter kunde sortera bort sidan eftersom den äldre kortklassningen krävde ord som Låshus eller Cylinder. Det är inte ett krav i den nya profilens verifierade uppbyggnad.

v36.95 godtar därför ett kort som den kända profilen har verifierat, även när endast en utrustningsrad finns. Ingen ID-källa eller profilstruktur ändras. Standardprofilens funktioner, ritningsskydd och dörrautomatikens v36.92-modul är fortsatt oförändrade.

Den faktiska v36.95-sidan har verifierats med fem kort ensamma, hela exempelprojektets 14 kopplingar och ett genererat GC2-kort med samma upplägg och bara en automatikrad. Se [TEST v36.95](SMARTMATCH_TEST_V36_95.md). TEST v36.94 behålls som tidigare snapshot.
