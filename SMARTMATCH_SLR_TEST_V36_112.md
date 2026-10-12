# SmartMatch SLR TEST v36.112 – mushjulszoom och datumkalender

Användaren bekräftade att kryssplaceringen i v36.111 fungerar och beställde zoom med musen och kalender vid signaturdatum. Sensoruppgifter får tills vidare fyllas i manuellt.

## Beteende
- Mushjulet zoomar direkt över SLR-PDF:en kring pekarens position; Ctrl/Cmd fungerar fortsatt.
- Shift + mushjul scrollar. Vanligt mushjul över text-/datumfält eller utanför PDF-sidan fångas inte av zoom.
- Riskanalysens originalfält 4.7 Datum (PDF-sida 5) använder webbläsarens datumväljare. Tryck på fältet för kalender; tangentbordsinmatning fungerar också.
- Datum sparas som YYYY-MM-DD i samma befintliga fält per automatik och används i PDF-export. Äldre ISO-datum och svenska numeriska datum normaliseras för visning. Ett tomt datum fylls inte automatiskt.
- V36.111:s kryssrättning är bevarad. Sensordata och GS-matchning är oförändrade.

## Kontroll
JavaScript-syntax passerade. Faktiska datum-/navigationsfunktioner körda i isolerad JS-miljö: giltiga datum inklusive skottdag, avvisat ogiltigt datum, normalisering, befintligt datum, kalenderanrop, oförändrat manuellt sensorfält, vanlig mushjulszoom, pekarankare, Shift-scroll och skydd för formulärfält passerade. Native kalender och det fullständiga Safari/iPhone/iPad-flödet återstår att kontrollera visuellt.

Separat SLR-test; ordinarie app/TestFlight är inte ändrade. Fast adress: smartmatch-slr-test.html. Version: 36.112-SLR-TEST.
