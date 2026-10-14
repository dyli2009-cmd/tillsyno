# CE-märkning TEST 2 – kompakt telefonflöde

Beställt 14 oktober 2026: manuell inmatning av automatiknummer och placering, SmartMatch SLR-testets dokumentlogik utan ritningar, kompakt telefonvy, Med glas/Utan glas, gemensam ifyllnad från första till nästa dörr, 50 % för förberedd ifyllnad och dörrspecifika undantag. Separat test, publicering inom tidigare beställd omfattning.

## Byggt

- Fast testadress `project-ce-markning-test.html`, full kopia av `project-ce-markning-test-v2.html`. TEST 1 bevaras som `project-ce-markning-test-v1.html` med ursprunglig lagring oförändrad. TEST 2 har egen IndexedDB-databas; TEST 1:s lokala JSON/anteckningar migreras inte automatiskt.
- Kompakt dörrlista, små ikoner, korta fält/rubriker, fällbara projektuppgifter och dokumentmappar. Föregående/nästa dörr behåller öppnad dokumenttyp. Original-PDF:s fält, kryss, radioval, datum, signatur och pinch-zoom återanvänds från en isolerad kopia av SLR TEST v36.132. Ingen ändring av originalmodulen.
- Fyll i ändrar direkt standarden för valt glasutförande. Nästa dörr med samma val läser gemensamma svar utan kopiering. Bara denna dörr sparar individuella fältvärden, inklusive avmarkerade kryss och tomma fält. Standardändringar bevarar undantag även på den aktiva dörren och öppnar endast kontroller vars effektiva svar ändrades.
- Automatikens fullständiga nummer och placering följer alla PDF-sidor och dokument. Dessa uppgifter återanvänds inte mellan dörrar. Projektuppgifter följer alla dokument. Delade Riskanalys/Egenkontroll-uppgifter använder samma koppling som SLR-modulen.
- Dokument med egna eller gemensamma ifyllningar visas som 50 %. Kontrollmarkeringar görs per dörr. Fem dokument kan markeras direkt, medan Produktlista och CE-skylt kontrolleras separat. Dörren blir 100 % först efter Klart; sju kontrollerade mappar utan Klart visas som 99 %.
- PDF-mallar läggs in en gång per projekt. Produktlista laddas upp som PDF för den aktuella dörren eftersom denna arbetsyta saknar ritningar/dörrkort och GS-skanning. CE-skylt kan fotograferas; befintlig komprimering (max 1600 pixlar, JPEG 85 %) används.
- Signaturbiblioteket sparar en bild per signatur, med referenser per dörr/dokument. Signering återanvänds efter ett aktivt tryck. Gemensamma ifyllningar klarmarkerar eller signerar ingen annan dörr automatiskt.
- Spara lokalt lagrar arbetsdata och delade mallbytes direkt, utan PDF-generering. Spara PDF skapar och läser tillbaka en liten arbets-PDF med dörrlista, projektdata och en inbäddad mall per kategori; individuella ifyllda dokument genereras vid visning/kundexport. PDF-exporten kontrollerar metadata och mall-/produktbytes och avbryter om projektet ändrades under exporten.
- Öppna PDF återställer TEST 2-projektets dörrar, standarder, undantag, signaturer, foto, status och mallar. Mallberedningen är idempotent så att upprepade återöppningar inte lägger till samma maskning/utseende igen.
- En separat service worker har två smala CE-adress-scope och cache för endast CE-resurser och nödvändiga befintliga beroenden. Övriga Tillsyno-sidor och befintlig service worker ändras inte. Gällande inloggning/licens/offlinekontroll återanvänds oförändrad.

## Verifiering

`tests/ce-markning-v2.cjs` kör den verkliga isolerade modulen, pdf-lib, den befintliga PDF.js-versionen och CE-skalets PDF-generator med syntetiska PDF-formulär. Ingen kundfil publiceras.

Kontroller: separata glasprofiler; direkt återanvändning av text/datum/kryss; 50 % på nästa dörr; egna text-, false- och tomma överstyrningar; rätt automatiknummer och placering på tre PDF-sidor; delade riskuppgifter; platt PDF-export; manuell produktlista; Klart per dörr; ändring öppnar tidigare Klart; endast en signaturbild; en mall per kategori och endast produktlista som separat dörrbilaga; återöppning och tre sparrundor utan ackumulerade dokument.

Senaste syntetiska arbets-PDF-storlekar: 17 971, 17 972 och 17 970 byte. Detta är testfixturens storlek, inte en mätning på ett riktigt kundprojekt. JavaScript-syntax, unika HTML-ID, versionsreferenser och avgränsning är kontrollerade. Lokal Chromium saknas; faktisk telefonlayout, kamera, filhämtning/delning och offlineåteröppning behöver provas på iPhone/iPad.

## Omfattning

CE TEST 2 är en egen fristående testversion, på samma sätt som SLR/SmartMatch TEST. Tillsynos globala appversion, Kontrollflöde, ordinarie SmartMatch, SLR TEST v36.132, autentisering och iOS/TestFlight ändras inte. Verkliga CE-mallar läggs in av användaren lokalt och sparas i dennes projekt-PDF, aldrig i det offentliga repot.
