# CE TEST 49 – reparerad öppning av projekt-PDF på dator/iPad

## Felorsak
I v48 kallade `loadTemplates()` på `prepareTemplate()`, men funktionen hade försvunnit ur CE-modulen. Det gav `prepareTemplate is not defined` direkt när en överförd projekt-PDF innehöll inbäddade mallar.

## Åtgärd
- Återinfört `prepareTemplate(source,cat)`.
- Funktionen läser in och validerar PDF-strukturen och sidantal, men returnerar **originalbytes utan omsparning**.
- En PDF-mall behåller alla formulärfält, typsnitt, bilder, kryss, signaturfält och andra PDF-objekt. Den ändrar inte projektdata, ZIP eller den frivilliga optimeringen.
- Gäller både när projekt-PDF öppnas (mail/iPad/dator) och när en ny mall laddas upp.
- Allt per dörr hålls separat i projektets JSON. Existerande projekt-PDF som skapats i TEST 47/48 behöver inte göras om på grund av den här buggen.
- Förhindrar inte möjliga *andra* fel i enskilda PDF:er. Behöver användartestas genom iPad → spara → dator → öppna.

## Kontroll
- Syntax för modulen, kontrollern och PDF-optimeraren.
- Versions- och offline-cachekopplingar till TEST 49.
- JS-sanity-test av `prepareTemplate()` med en PDFLib-stub och kontroll att returnerade bytes inte ändras.
