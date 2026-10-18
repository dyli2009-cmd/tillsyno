# SmartMatch Avläsning TEST 9.28

TEST 9.28 gör avläsningen snabbare och tydligare genom att skilja på **vad som ska läsas** och **vad som ska visas**. Den markerade tabellytan används bara för textutvinning. När en kopplad stämpel öppnas visas fortfarande originaldörrkortet.

Teknisk build: **36.171**. Synlig Tillsyno-version: **v2.4.396**.

TEST 9.27 och samtliga äldre versionsmärkta filer ändras inte.

## Markera bara området som behövs

Arbetsytan ska omfatta den del av tabellen som behövs för GS-arbetet:

- rubriken **Övrigt** eller **Produkt**
- kolumnen **Monteras av** eller den korta formen **Mont av**
- produkttexten och montörscellen på de relevanta raderna, vanligtvis rad 2 och rad 3 i den valda delen
- hela GS-texten på raden, så att benämning, typ/utförande och mängd kan hållas ihop

Det är inte nödvändigt att markera hela dörrkortet. Ett mindre område ger färre irrelevanta ord, kortare bildläsning och mindre risk att andra tabeller blandas in.

Kolumnen **Lev av** beskriver vem som levererar produkten. `Lev av = GS` eller ordet GS i en leverantörscell skapar därför inte ensamt en kontrollpunkt. En rad tillhör GS-arbetet först när **Monteras av/Mont av = GS** har lästs och kopplats till samma produktrad.

## Avläsningsyta och originalvisning är separata

Den markerade rektangeln sparas som avläsningsyta och används när appen läser om produkterna. Den får inte beskära det original som visas i arbetsläget.

När användaren trycker på en kopplad stämpel gäller:

- om PDF-sidan innehåller ett enda källdörrkort visas hela originalsidan
- om en äldre PDF-sida innehåller flera dörrkort används det sparade kortutsnittet, så rätt kort fortsätter visas
- **Passa** anpassar den originalvy som gäller för kortet och ändrar inte avläsningsytan

Det gör att avläsningen kan vara liten och snabb samtidigt som hela levererade dörrkortet finns kvar för visuell kontroll.

För stora Bluebeam-sidor som består av flera bildremsor använder förhandsvisningen samma verkliga rasterskala i PDF.js som i canvasen. Det hindrar den första vyn från att bli vit samtidigt som pixelbudgeten på 2,8 megapixlar behålls för iPad.

## Uttryckligt godkännande per kort

Om de önskade GS-raderna är rätt kan användaren kryssa i **Jag har jämfört med originalkortet** och välja **Använd kontrollerade rader**. Bekräftelsen gäller bara det aktuella kortet. Den sparar:

- tidpunkt och kortidentitet
- den avlästa råtexten och ordpositionerna
- kvarvarande varningar och de rader som accepterades

Bekräftelsen är ett granskningsbeslut och ändrar inte rådata. Den tar bara bort spärren för osäker tabelltolkning. Projektet förblir blockerat om:

- dörrkortets beteckning saknas
- avläsningen avbröts eller gav ett läsfel
- den markerade arbetsytan har ändrats sedan senaste läsningen
- ritningens koppling eller ritningsgranskning ännu inte är godkänd

Varningar som inte blockerar säker identifiering finns kvar i projektet och kan granskas senare.

## Sparning och återöppning

Avläsningsyta, hela originalkortets visningsreferens, GS-rader, granskningsbeslut, varningar och rådata sparas i projektet. En exporterad projekt-PDF ska därför öppna de färdiga kopplingarna och kontrollpunkterna direkt på samma eller en annan dator.

Återöppning startar inte OCR och läser inte om dörrkorten. Ny avläsning sker bara när användaren väljer att läsa om ett kort eller ändrar dess markerade avläsningsyta.

## Rekommenderad arbetsgång

1. Markera dörrkortets beteckning som tidigare.
2. Markera bara **Övrigt/Produkt**, **Monteras av/Mont av** och de rader som kan tillhöra GS.
3. Kör avläsningen och kontrollera att GS-raderna har rätt benämning och montör.
4. Rätta ett verkligt fel, eller kryssa i **Jag har jämfört med originalkortet** och välj **Använd kontrollerade rader** när resultatet redan är rätt.
5. Matcha och godkänn ritningspositionerna.
6. Spara projekt-PDF:en. Öppna den senare via den färdiga projektöppningen utan ny OCR.

## Avgränsning

TEST 9.28 ändrar inte Kontrollflödet, standard-SmartMatch eller Ritningsverktygets digitalisering. Den ändrar inte levererade original-PDF-sidor och gissar inte GS-ansvar från `Lev av`. Sidor med flera kort fortsätter använda sina äldre, sparade kortutsnitt för att undvika att fel kort visas.

## Verifiering

De fokuserade proven ska kontrollera att:

- OCR och textutvinning använder den lilla markerade arbetsytan
- `Monteras av/Mont av = GS` ger GS-rad, medan enbart `Lev av = GS` inte gör det
- ett ensamt källdörrkort visar hela originalsidan oberoende av avläsningsytans storlek
- den riktiga Tånga-filen visar innehåll redan i första 100-procentsvyn inom samma minnesbegränsade pixelbudget
- en sida med flera kort fortsätter visa rätt sparade kortutsnitt
- kortspecifikt godkännande sparar rådata, varningar och revisionsspår
- godkännandet inte passerar saknad beteckning, läsfel, ändrad arbetsyta eller ej godkänd ritning
- export och återöppning bevarar visningsval, kontrollpunkter och godkännande utan ny OCR
- TEST 9.27 och äldre versionsfiler förblir byte-oförändrade

En fysisk iPad med Safari och ett verkligt projekt rekommenderas som sista kontroll av zoom, helsidesvisning och minnesåtgång.
