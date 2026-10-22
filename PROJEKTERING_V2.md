# Tillsyno Projektering 2

Separat projekteringsapp med fast adress: `smartmatch-projektering.html`. Versionsarkiv: `smartmatch-projektering-v2.html`. Den fasta adressen är en full kopia av versionssidan och laddar samma versionsmärkta resurser. Tidigare demo, befintlig Avläsning, SmartMatch, Kontrollflöde, startsida, service worker och inloggning lämnas oförändrade. Sidan använder Tillsynos befintliga SmartMatch-behörighet.

## Så fungerar projektet

En originalritning ligger som underlag. Stämplar läggs som egna redigerbara placeringar ovanpå underlaget. Varje fysisk dörr får en placering, men alla placeringar med samma beteckning använder ett gemensamt dörrkort. GS65 behöver därför fyllas i en gång även om beteckningen finns vid flera dörrar eller på flera sidor.

DA, DS och DADS finns som fristående symboler. GS1–GS100, DGS100, WC, HWC, VC, HVC och DBL finns som dörrkortsstenciler. En egen stencil kan vara en dörrstämpel eller en symbol. Namn, form, färger, mått och textstorlek väljs när stencilen skapas.

## Steg för steg

1. Välj **Öppna ritning** och välj din PDF. Du kan i stället öppna det redigerbara 50-dörrarsexemplet via menyn eller startvyn.
2. Sök önskad beteckning i **Stenciler**. På dator kan du dra stencilen till dörren. På telefon/iPad väljer du stencilen och trycker på ritningen. Med verktyget Placera kan du sätta samma beteckning flera gånger.
3. Byt till Välj för att flytta en placerad stämpel. Dra den till rätt plats. Shift väljer flera på dator; du kan också dra en markeringsruta. Sidknapparna och sidfältet bläddrar i ritningen.
4. Zooma med mushjulet eller knapparna. Två fingrar zoomar på touchskärm. Panorera med handverktyget, mellanslag eller musens mittknapp. Anpassa visar hela sidan.
5. Under den valda stämpelns egenskaper kan du ange läge, bredd, höjd och rotation. Beteckningen hålls läsbar när stämpeln vrids i stället för att vändas upp och ned. Måtten anges i PDF-punkter och läget som procent av sidan. Låsning skyddar mot oavsiktlig flytt och borttagning. Fäst rundar placeringen till ett rutnät på fem punkter.
6. Öppna **Dörrkort** för vald GS-beteckning. Fyll i littera, hängning, dörrtyp, brandkrav och övriga grunduppgifter. Välj produkter i Daglåsning, Nattlåsning, Dörrstängning och Larm/Passer. Ange antal och ansvar under Lev av och Mont av.
7. **Spara dörrkort** gör ändringarna gemensamma för alla dess dörrpositioner. Byter du kort med osparade ändringar kan du spara, lämna utan att spara eller avbryta.
8. Skapa eller kopiera dörrkort med knapparna vid kortet. Borttagning av ett använt kort kräver bekräftelse och tar då också bort dess placeringar. Låsta placeringar måste först låsas upp. Stenciler och dörrkort hanteras separat; en kvarvarande stencil kan användas för att skapa ett nytt kort igen.
9. **Spara projekt** hämtar en redigerbar projektfil som innehåller original-PDF, stenciler, placeringar, produkter och sparade kort. **Öppna projekt** fortsätter från denna fil eller från en PDF som exporterats av Projektering 2.
10. **Exportera PDF** skapar ritning med aktuella stämplar och dörrkort. Menyn erbjuder även enbart ritning, enbart kort och en mängdförteckning som CSV. Öppna PDF:en i Avläsning och granska kort och matchning innan du godkänner.

På mindre skärmar visas en arbetsyta i taget: Ritning, Dörrkort eller Stenciler. Val av en stämpel behåller ritningen framme så att den kan dras utan avbrott. Byt till Dörrkort när du vill redigera kortet.

## Verktyg och kortkommandon

| Verktyg | Kommando |
| --- | --- |
| Välj/flytta | V |
| Panorera | H eller håll mellanslag |
| Placera | P; S fungerar också |
| Radera | E |
| Välj flera | Shift+klick eller markeringsruta |
| Välj alla på sidan | Ctrl/Cmd+A |
| Kopiera/klistra in | Ctrl/Cmd+C / Ctrl/Cmd+V |
| Duplicera | Ctrl/Cmd+D |
| Flytta markerade | Piltangenter; Shift flyttar tio punkter |
| Ta bort | Delete/Backsteg |
| Ångra/gör om | Ctrl/Cmd+Z / Ctrl/Cmd+Skift+Z; Ctrl/Cmd+Y |
| Byt sida | Page Up / Page Down |

Kortkommandon för ritningen används inte medan du skriver i ett formulär. Ångra/gör om gäller sparade projektändringar i det aktuella arbetspasset. Byte av originalritning eller öppning av ett annat projekt startar en ny ändringshistorik.

## Ritning och sparning

Originalritningen sparas separat från placeringarna. När en export öppnas för fortsatt projektering används det sparade rena originalet igen. Flyttade och borttagna appstämplar lämnar därför ingen gammal beteckning kvar vid nästa export. Befintlig text och befintliga markeringar som redan ingår i en importerad original-PDF är fortfarande del av underlaget; appens verktyg redigerar de stämplar du har lagt till här.

Varje genomförd projektändring sparas atomiskt i en separat lokal IndexedDB-databas. Misslyckad sparning ersätter inte det senast sparade projektet. Original-PDF:en kontrolleras mot projektets siduppgifter före import. En felaktig import ersätter inte befintligt arbete. Projektfilen behövs för att flytta arbete mellan enheter och för en egen säkerhetskopia. Ingen molnlagring eller samtidig redigering har lagts till.

Gränser: original-PDF högst 50 MB och 200 sidor; portabel projektfil högst 80 MB. Projektmodellen stöder upp till 500 dörrkort och 5 000 placeringar. PDF-renderingen begränsar bildminnet och renderar en sida i taget. Produktbiblioteket är ett exempelbibliotek med möjlighet till egna produkter; produktkombinationer är inte automatiskt tekniskt verifierade.

## Kontroll av export

Använd samma entydiga beteckning på ritning och kort. Håll stämplarna åtskilda och använd ett rent underlag. Ursprungliga övermålade beteckningar i en extern PDF försvinner inte genom att lägga en ny stämpel ovanpå.

Exporten skapar sökbar text, behåller kortets ID i översta vänstra cellen och använder aktuella sparade kort. Roterade originalritningssidor återges med samma synliga beskärning och orientering i en normaliserad export, samtidigt som det oförändrade originalet följer med för fortsatt projektering. Synliga originalmarkeringar får inte tyst försvinna; en markering vars utseende inte går att bevara stoppar exporten med ett meddelande.

## Verifiering

Separata genererade tester för modell, IndexedDB, ritningsyta, PDF-export och hela browserflödet finns under `tests/smartmatch-projektering-v2-*.cjs`. Inga privata kundfiler används som publicerade testdata. Browserprov använder den verkliga sidan och den oförändrade behörighetskontrollen; endast inloggningsklienten ersätts lokalt i provet.
