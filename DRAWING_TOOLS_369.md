# Ritningsverktyg v2.4.369 – svensk bildtext i sökbara dörrkort

Den lokala bildläsningen i **Förbered sökbara dörrkort · TEST** använder nu svenska och engelska tillsammans. Tidigare användes enbart engelska, vilket gav sämre förutsättningar för ord som **Dörrstängare**, **Karmöverföring**, **Övrigt**, **Dörrautomatik**, **Dörrmagnet** och **Dörrcentral**. Den svenska språkmodellen har lagts till i projektets lokala filer och offlinecache. Samma språkval används i nya SmartMatch Avläsning TEST 9.2; äldre testsidor behålls som de var.

Originalbilden behålls. Denna rättning ändrar språkstödet för OCR, inte markeringarnas koordinater, PDF-exportens geometri eller reglerna för granskning och osäkra ord.

## Prova på nytt

1. Ladda om Tillsyno med internet och kontrollera **v2.4.369**. Offline kräver att den nya svenska språkfilen först har hämtats till enheten.
2. Öppna **Ritningsverktyg** och välj **original-PDF:en**, före den tidigare textförberedelsen. Redan inlagd sökbar text återanvänds och rättas inte automatiskt genom att läsa samma kopia igen.
3. Visa ett dörrkort och välj **Verktyg → Förbered sökbara dörrkort · TEST**.
4. Tryck **Markera hela dörrkortet**, markera rubrik och tabell och välj sidorna som ska läsas. Börja med en sida för att jämföra resultatet.
5. Tryck **Läs markerade områden** och följ sida, område, procent och tid i statusrutan.
6. Granska orden mot **Visa originalsida**. Kontrollera särskilt å, ä, ö, produktkoder och ansvarskolumner. Rätta eller välj osäkra ord innan de tas med i textlagret.
7. Godkänn granskningen och tryck **Spara sökbar PDF**. Öppna den nya **-sokbar.pdf** i SmartMatch och välj textsökning för att prova resultatet utan ny bildläsning.

Ett ord kan fortfarande flaggas som osäkert även när texten är rätt. Säkerhetströskeln har inte sänkts för att dölja osäkerheten. Små bokstäver, suddiga skärmbilder, tabellinjer och låg upplösning kan fortfarande kräva granskning. Osäkra ord utelämnas från PDF-textlagret tills du väljer eller rättar dem.

All läsning sker med lokala språkfiler. Inga dokument skickas till en OCR-tjänst. Den första läsningen behöver fortfarande bearbeta bilderna och kan ta tid; språkstödet är inget löfte om snabbare första avläsning eller om stöd för användarens ej tillgängliga 251 MB-fil.

För hela arbetsgången, PDF-bevarande och avgränsningarna i testverktyget, se [ursprungliga förberedelseguiden](DRAWING_TOOLS_367.md). Språkfilens källa, licens och kontrollsumma finns i [Tesseract-notisen](vendor/tesseract/NOTICE.md).

## Verifiering

`node tests/drawing-ocr-swedish.cjs` verifierar riktig lokal OCR på en läsbar bild med svenska komponentnamn och produktkoder. I språkmodellernas direkta jämförelse återgav den tidigare engelska modellen inget av åtta svenska testord exakt med rätt accenttecken. Svenska och engelska tillsammans återgav alla åtta: **Övrigt, Dörrstängare, Karmöverföring, Dörrautomatik, Dörrmagnet, Dörrcentral, Återställning och Låshus**, med rapporterad säkerhet **90,1–96,7** i just detta prov.

Koderna **GS23, DC700, 6696 och DBL** bevarades. PDF-exporten innehöll 43 sökbara ord utan osparbara tecken; PDF.js kunde läsa tillbaka de svenska tecknen och den synliga sidan var pixelidentisk före och efter textlagret. Testet hämtade modellerna från projektets lokala filer och gjorde inga externa nätverksanrop.

Genom Ritningsverktygets faktiska markerings- och granskningsflöde gav ett beskuret kort **sju av åtta** exakta svenska testnamn. **Dörrcentral** lästes som **Ddrrcentral** med säkerhetsvärdet 34, flaggades som osäkert och utelämnades korrekt som standard: 41 säkra ord av totalt 42. Testet rättade ordet till **Dörrcentral** i det verkliga granskningsfältet och sparade PDF:en. Därefter kunde alla åtta godkända svenska namn läsas tillbaka som PDF-text, med pixelidentiskt synligt innehåll. Granskningsbilden är kontrollerad. Detta visar att svenskt språkstöd förbättrar förutsättningarna samtidigt som kontrollsteget fortfarande behövs.

Hela `node tests/drawing-ocr-swedish.cjs` passerade, inklusive det faktiska verktygets språkval, manuell rättning och PDF-export. Resultaten avser skapade, läsbara testbilder och garanterar inte samma säkerhet i varje kundskanning eller vid varje beskärning. Inget säkerhetsvärde höjdes artificiellt och alla modellanrop gick till lokala projektfiler.
