# SmartMatch Avläsning TEST 9.26

TEST 9.26 gör det möjligt att skapa ett riktigt dörrkort när en beteckning finns på ritningen men något dörrkort inte har levererats. Kortet skapas som en ny sökbar vektor-PDF-sida, kopplas till ritningspositionerna och sparas i samma projekt-PDF. Ingen OCR behövs för det skapade kortet.

TEST 9.25 och äldre versionsmärkta filer ändras inte.

## Arbetsgång

1. Öppna ett färdigavläst projekt och visa positionerna på ritningen.
2. Öppna menyn **⋯** för gruppen som visar **Saknar dörrkort**.
3. Välj **Koppla dörrkort**.
4. När inget matchande kort finns väljer du **＋ Lägg till dörrkort**.
5. Kontrollera ritningsbeteckningen. Den är låst till den valda gruppen så att kortet inte kan råka kopplas till en annan kod.
6. Ange dörrkortets namn eller nummer och, om det behövs, en beskrivning.
7. Lägg till en eller flera rader. Varje rad innehåller:
   - avsnitt: Daglåsning, Nattlåsning, Övrig utrustning eller Larm-Passer
   - benämning
   - typ eller utförande
   - antal
   - montör: GS, DT, EL eller Annan
8. Välj **Skapa och koppla**. Appen skapar sidan, verifierar den, kopplar positionerna och öppnar det nya kortet.
9. Kontrollera GS-punkterna och välj **Spara PDF** när projektet är klart.

Formuläret tillåter 1–18 rader. Om samma ritningsbeteckning förekommer på flera fysiska dörrar kopplas samtliga till samma skapade källdörrkort. Varje fysisk dörr behåller ändå egna avbockningar, tider, beställningar och anmärkningar.

## Det som läggs till i PDF-filen

Funktionen skapar en riktig A4-sida med vektortext och en ritad tabell. Sidan innehåller dörrkortets namn, ritningens beteckning, beskrivning och alla inmatade rader. Texten går därför att markera och söka utan bildläsning.

Sidan läggs fysiskt sist i projektets PDF och får en intern sidmarkör. Den registreras samtidigt i SmartMatchs dörrkortsindex med ett giltigt kodområde och tabellområde. Det innebär att samma ordinarie kortvy används när positionen öppnas; kortet är ingen tillfällig HTML-ruta och försvinner inte när filen flyttas till en annan dator.

Det skapade kortet har redan strukturerade rader. **Läs om detta kort** visas därför inte för det kortet, eftersom en OCR-omläsning skulle vara långsammare och mindre exakt än den sparade strukturen.

## GS-regeln

Alla rader, även DT, EL och Annan, skrivs på den sökbara PDF-sidan och sparas som kortets strukturerade innehåll. Endast rader där **Monteras av** är **GS** blir arbets- och kontrollpunkter i SmartMatch.

Exempel:

- Övrig utrustning · Dörrstängare · DC700 · 2 · GS blir en kontrollpunkt med antal 2.
- Nattlåsning · Cylinder · C10 · 1 · DT syns på kortet och är sökbar, men blir ingen GS-kontrollpunkt.

Regeln gör att det skapade kortet följer samma ansvarsfördelning som avlästa dörrkort utan att appen behöver gissa från fri text.

## Sammanhållen och säker sparning

Skapandet behandlar PDF-sidan, kortregistret och ritningskopplingen som en sammanhållen ändring:

- den nya sidan skapas och läggs till med det befintliga, verifierade flödet för dörrkortssidor
- appen läser tillbaka sidans interna markör innan kortet registreras
- kopplingen kontrolleras mot det nya sidnumret
- projektutkastet skrivs färdigt lokalt
- PDF-bytes med den nya sidan sparas i den lokala projektcachen

Om något steg efter sidbilagan misslyckas återställs föregående PDF, projektdata, aktiv sida och zoom. Därmed ska projektets metadata aldrig peka på en sida som inte finns, och en ny sida ska inte lämnas kvar utan motsvarande kortdata.

När **Spara PDF** har slutförts innehåller filen både den fysiska dörrkortssidan och SmartMatch-projektets data. Filen kan öppnas som ett färdigt projekt på en annan dator. Kortet, ritningskopplingen, GS-listan och avbockningarna återställs direkt utan OCR, produktsökning eller ny matchning.

## Lokal historik

TEST 9.26 har en egen lokal databas. Förstasidan läser även projekt som sparats lokalt i TEST 9.25 och visar dem tillsammans med den nya versionens projekt. Listningen kopierar inte stora PDF-filer. När ett äldre projekt öppnas läses dess befintliga bytes och arbetsutkast från källdatabasen.

När ett projekt från TEST 9.25 öppnas och får ett skapat dörrkort sparas fortsättningen i TEST 9.26:s arbetsutkast eller i en exporterad projekt-PDF. Källdatabasen för TEST 9.25 ändras inte.

## iPad

Skapa-dialogen är byggd som en separat, begränsad arbetsyta så att hela projektvyn inte behöver göras större:

- innehållet rullar inne i dialogen
- rubrik och sparknappar ligger kvar runt den rullande delen
- inmatningar och knappar har minst 44 pixlars tryckyta
- formulätsrader staplas på smalare skärmar
- nederkanten tar hänsyn till iPadens safe area
- fälten använder 16-pixelstext för att undvika oönskad Safari-zoom vid fokus

Att lägga till en fysisk sida kräver att projektets PDF skrivs om en gång. På mycket stora kundfiler bör användaren vänta tills beskedet om färdig lokal sparning visas innan Safari stängs eller enheten byter app.

## Verifiering

Det fokuserade browserprovet för TEST 9.26 bygger en projekt-PDF med en omatchad ritningskod och kontrollerar hela flödet:

- **Lägg till dörrkort** visas endast när gruppen saknar ett befintligt kort
- exakt en fysisk sida läggs till
- dörrkod, avsnitt, produkter och montörer finns som sökbar vektortext
- det nya kortet läggs in i dörrkortsindex och öppnas i den ordinarie kortvyn
- endast GS-raden blir kontrollpunkt; DT-raden ligger kvar i kortets dokumentdata
- antal och avbockning sparas per fysisk position
- arbetsutkastet och den lokala PDF-cachen innehåller den nya sidan
- exporterad projekt-PDF innehåller både sidan och den strukturerade kortinformationen
- filen öppnas i en ny webbläsarsession med koppling och avbockning kvar, utan OCR

TEST 9.26 kör även de befintliga regressionsproven för arbete, material/tid, egna punkter, beställningar och anmärkningar, DS/DA, stor PDF-export, lokal historik, offlinecache och iPadens minnes- och stämpelbeteende mot den nya separata snapshoten. En fysisk iPad med Safari och en stor kundfil bör fortfarande användas som slutprov av WebKits verkliga minnesgräns.

## Avgränsning

TEST 9.26 skapar ett nytt kort för en redan placerad, omatchad ritningsbeteckning. Den ändrar inte ett befintligt avläst dörrkorts original-PDF-sida och ersätter inte projekterarens levererade kort. Korrigering av befintliga kort, fria layouter eller obegränsat antal rader kräver ett separat redigeringsflöde.
