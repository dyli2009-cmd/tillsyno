# SmartMatch – låst regel för tabellavläsning och ritningskoppling

**STATUS: LÅST enligt användarens beslut 2026-10-11.**

Denna regel gäller dörrkortsidentifiering i SmartMatch. Principen får endast ändras efter en uttrycklig instruktion från användaren. Låset gäller avläsningsregeln; rättningar som gör implementationen förenlig med regeln är tillåtna.

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

Vid ett nytt eller tidigare oprövat tabellupplägg ska användaren först öppna/läsa in ett dörrkort i appen. Avläsningen ska kontrolleras mot den verkliga tabellen: var den börjar, vilken cell som är överst till vänster och vilket ID som läses där.

Om appen inte kan tolka upplägget ska avläsningsstödet undersökas och vid behov anpassas och testas med ett exempel innan automatisk koppling för det upplägget betraktas som fungerande. Ett nytt upplägg ändrar inte den låsta regeln om ID-källan.

Målet är generell automatisk tabellavläsning, inte obligatorisk projektspecifik kod. Att öppna ett exempel innebär inte att appen idag automatiskt lär sig en ny tabellmall eller sparar ett sådant upplägg.

## 5. Verifierad status när regeln sparas

TEST v36.87 hittar alla 15 dörrkorts-ID:n i användarens Snidaren-PDF vid test med appens PDF.js 3.11.174. Den nuvarande implementationen använder fortfarande text- och rubrikheuristik; generell geometrisk cellidentifiering för alla tabellupplägg är inte färdig eller garanterad.

Detta dokument sparar och låser beteenderegeln. Det inför ingen ny appfunktion eller ny testversion.
