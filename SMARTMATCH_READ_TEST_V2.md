# SmartMatch – Avläsning TEST 2

Testsida: `smartmatch-read-test.html?v=2`. Intern version: `36.135-READ-TEST`.

## Vad som ändrats

Avläsningstestet använder en gemensam läsare för ritningen. Provläsningen sparar exakta positioner; samma positioner används sedan av projektet för de dörrkoder användaren valt. Tidigare SmartMatch 1.3 och dess filer är oförändrade.

Den gemensamma läsaren läser sökbar PDF-text och PDF-stämplar. När ingen motsvarande sökbar beteckning hittas läses ritningen också som bild. En ritningssida utan PDF-text hoppas alltså inte längre över. Uppdelade textfragment, exempelvis W + C, kan ge beteckningen WC utan att WC blir en delträff i WC1, RWC eller WCP.

En exempelstämpel kan markeras på en ritningssida och kopplas till ett av de avlästa dörrkorten. Exemplet kontrolleras mot den valda beteckningen och dess textstorlek används för bildläsningen. Med ett exempel granskas även bildstämplar på sidor som redan har sökbara träffar. Detta är OCR med storlekshjälp, inte inlärning av en generell symbolmodell.

Bildläsningen använder Tesseract och de befintliga lokala språkfilerna. Ritningen läses i överlappande delar med begränsad canvasstorlek. Delarna behandlas sekventiellt och frigörs efter läsning. Originalfilen ändras inte. Avbryt avbryter det pågående läsflödet.

## Testflöde

1. Öppna ritning och dörrkort tillsammans och ange dörrkortssidorna.
2. Markera kod och tabell på ett exempelkort. Tryck **Provläs valda sidor**.
3. Kontrollera beteckningar och arbetsrader. Vid behov, tryck **Markera stämpel på ritning**, välj ritningssida och dra tätt runt en beteckning. Välj vilket dörrkort exemplet hör till.
4. Tryck **Sök stämplar på ritningen** efter att exemplet eller beteckningen ändrats.
5. Tryck **Visa** för att granska placeringen. Avmarkera felaktiga träffar. Kryssa i **Jag har granskat träffarna på ritningen** och starta.

En sökning med noll träffar visar detta uttryckligen. Om användaren väljer att fortsätta efter granskning skapas inga automatiska positioner för de valda koderna. Gamla scanners får inte återinföra avmarkerade träffar.

Exempel, träffar och avmarkeringar sparas med projektets metadata och lokala arbetsversion. Tidigare läsmallar kan fortfarande användas; de innehåller endast namn och dörrkortets markeringsgeometri. En äldre arbetsversion utan granskade träffar kan återöppnas och läsas om i de nya inställningarna.

## Verifiering

- `tests/smartmatch-read-test-v1.cjs`: tidigare avläsningsflöde, GS47-varianter, arbetsrader, separata markeringar per dörr, mallar och återöppning. Start kräver nu granskning.
- `tests/smartmatch-read-match-v2.cjs`: separata W/C-textfragment, gränser mot längre koder, rena bildstämplar, exempelmarkering, blandad sökbar text och bild, valda/avmarkerade träffar, exakt överensstämmelse mellan provläsning och projekt samt återöppning.
- `tests/smartmatch-beslagskod-v36-133.cjs` och `tests/smartmatch-table-layouts-v36-95.cjs`: tidigare låsta läsare och 15 verifierade kort.

Webbläsartesterna använder genererade PDF-underlag och körs i dator-, iPhone- och iPad-storlek, med touchhändelser i de två senare. Dessa ersätter inte ett prov med användarens exakta ritning på en fysisk iOS-enhet. Svårlästa, roterade eller överlappande beteckningar kan kräva en ny markering eller manuell komplettering. Testsidan har fortfarande ingen egen fullständig offlineinstallation.
