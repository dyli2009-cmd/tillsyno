# SmartMatch SLR TEST v36.116 – dokumentpaket och produktlista per dörr

Beställning 2026-10-13: fyra nya SLR-original ska ingå och följa samma logik som riskanalysen. Ordning: Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran (tillverkare av maskin), Produktlista, Egenkontroll. Ytterligare befintliga kategorier ligger efter dessa.

## Tillagda originalmallar
- Beskrivning av maskinen: 1 sida, 15 fält.
- Loggbok: 4 sidor, 130 fält/widgetplatser.
- EG-försäkran: 1 sida, 16 grupper/17 widgetplatser.
- Egenkontroll Svängdörr: 5 sidor, 123 grupper/143 widgetplatser.

Fyra rena PDF-mallar finns i templates/slr-test-v36-116 och laddas i SLR-testet. Tidigare exempelvärden, kryss, datum, namnteckningsannoteringar och standardvärden har tagits bort. Ursprungliga användarfiler är orörda. Riskanalysen som redan finns i projektet bevaras. Mallarna lagras en gång per projekt-PDF; dokumentuppgifter och signaturer är separata per fysisk automatik.

## Samma dokumentlogik
Samtliga PDF-mallar visas på originalsidorna med textfält, avmarkerbara kryss/radioval, dropdownval, datumkalender och signaturer på originalets signaturplatser. Loggbokens olika rader och egenkontrollens kontrollpunkter har egna signaturfält. Maskin ID och dörrbeteckning hämtas från den valda automatikens identitet. Kända projektuppgifter fylls i; övriga uppgifter är manuella. Datum/signaturer och kontrollval är inte förvalda. Dörrbyte bygger om editorn med endast den dörrens uppgifter. Mobil pinch och +/− fungerar; mushjulszoom är inte återinförd.

## Produktlista
Knappen Skapa PDF läser en verifierad GS-källa och exakt det tillhörande dörrkortet. PDF:en innehåller vald automatik, GS, källa och samtliga läsbara dörrkortsuppgifter, följt av originalets dörrkortssida med tabeller/bilder. Oläsbar text innebär att originalsidans information finns kvar; ingen komponentmodell gissas. Saknad verifierad GS eller flera olösta kort med samma GS stoppar generering. Ändrad GS-koppling kräver uppdaterad produktlista. Varje genererad produktlista lagras som egen bilaga i rätt dörrs SLR-mapp och följer med projekt-PDF:en; den kopieras inte till andra dörrar.

## Kontroll
- JavaScript-syntax passerade.
- Fyra verkliga blankade mallar lästa med PDF-lib och PDF.js; fält och originalens layout bevarade.
- Funktionstest med de verkliga mallarna: korrekt Maskin ID A/B, inga förvalda radio/checkbox/dropdownval, egna datum/kryss/signaturer, verifierad GS2-produktlista, spärr vid overifierad GS.
- Faktisk PDF-generering och bilagesparning/återläsning passerade: fyra gemensamma mallar och en produktlista för endast vald dörr återställdes.
- Genererade PDF-sidor renderade och visuellt inspekterade; produktlistan innehöll GS2 och inga GS1-komponenter i kontrollfallet.
- Native kalender och fullständigt Safari/iPhone/iPad-flöde kontrolleras vidare av användaren.

Test: node tests/slr-documents-v36-116.cjs

Endast separat SLR-test ändrat. Tidigare versioner, ordinarie app och TestFlight är orörda. Fast adress smartmatch-slr-test.html; version 36.116-SLR-TEST.
