# Projektering – Demo 1

Fristående exempelapp: `smartmatch-projektering-demo-v1.html`.

Syftet är att visa ett projekteringsunderlag där dörrarnas beteckningar, gemensamma dörrkort och exporterad ritning hör ihop. Befintlig Avläsning, SmartMatch, Kontrollflöde, inloggning och licensregler ändras inte. Den nya sidan använder befintlig inloggning och kräver SmartMatch-behörighet.

## Så har vi tänkt

En fysisk dörr är en position, exempelvis D001. En beteckning, exempelvis GS1, beskriver vilket dörrkort positionen använder. Fem dörrar kan därför använda samma GS1-kort. Kortets produkter fylls i en gång och alla fem positioner använder samma sparade innehåll. GS1, GS10 och GS100 är olika kort.

Demoprojektet innehåller 50 dörrar och 17 använda dörrkort. Biblioteket innehåller GS1–GS100, VC, HVC, WC, HWC, DBL, DA, DS och DADS. Egna beteckningar kan läggas till. Form väljs per beteckning: gul oval eller liten fyrkant. DA, DS och DADS får fyrkant som förval. Beteckningar som skulle bli identiska vid avläsning, exempelvis GS-1 och GS1, får inte användas för olika kort.

## Steg för steg

1. Öppna sidan och välj en dörr på exempelritningen. På telefon finns flikarna Ritning, Dörrkort och Stämplar.
2. Sök en beteckning i stämpelbiblioteket, eller skapa en egen. Under Ritning trycker du Placera för att tilldela den till vald dörr.
3. Öppna Dörrkort. Vid varje utrustningsrad väljer du en produkt. Sökningen visar produkter för den komponenttypen; vid låshus visas låshus och vid sensorlist visas sensorer. Saknas produkten kan du lägga till en egen.
4. Ange antal samt Lev av och Mont av. Tomma produktrader betyder att ingen produkt har valts. Exempelprodukterna visar arbetssättet och utgör inga verifierade produktkombinationer.
5. Tryck Spara dörrkort. Alla dörrar med samma beteckning använder nu det sparade kortet. Ett osparat kort ändrar inte andra dörrar; vid byte väljer du Spara, Lämna utan att spara eller Avbryt.
6. Välj Spara projekt för en redigerbar JSON-fil. Ändringarna lagras också separat på den här enheten. Den lokala kopian är inte ett gemensamt molnprojekt och kan försvinna om webbläsarens data rensas.
7. Välj Ritning + dörrkort för en sökbar PDF med en ritningssida och aktuella använda dörrkort. Under menyn finns även separata PDF-val för ritning och dörrkort.
8. Välj Öppna för att fortsätta från den sparade JSON-filen eller en PDF som exporterats från denna demo. Vanliga externa ritnings-PDF:er kan inte importeras som redigerbara demoprojekt.
9. Öppna den kombinerade PDF-filen i Avläsning. Markera beteckningen i första kortets översta vänstra cell, läs korten och matcha mot ritningen. Granska resultatet före godkännande. Produktläsning görs därefter med Produkt, Lev av, Mont av och utrustningsraderna inkluderade i läsområdet.

## Projekteringsprinciper

- Skriv exakt samma beteckning på ritningen och motsvarande dörrkort.
- Låt varje fysisk dörr ha en tydlig stämpel och en egen position.
- Använd riktig text, inte en skärmbild av beteckningen.
- Radera gamla beteckningar. Täck dem inte med en yta och skriv nytt ovanpå.
- Håll beteckningarna åtskilda från varandra och från andra ID:n.
- Exportera aktuella kort; ta bort gamla versioner som har samma beteckning.
- Provkör en sida och dess kort i avläsaren innan samma arbetsmetod används för hela projektet.

Demoexporten byggs om från det sparade projektet varje gång. Den innehåller en enda aktuell textbeteckning per stämpel och använder inte övermålade gamla beteckningar. De redigerbara demodata som följer med i PDF:en är separata från Avläsnings granskade projektdata: importen till Avläsning behöver därför verkligen läsa och matcha PDF-innehållet.

## Avgränsning

Detta är en projekteringsdemo med en genererad exempelplan, inte ett CAD-system. Den redigerar inte originalritningar och ändrar inte tidigare kund-PDF:er. Produktbiblioteket är ett litet exempelbibliotek, inte en ansluten leverantörskatalog. Sparning på enheten och nedladdade projektfiler ger fortsatt redigering; ingen serverlagring, delning eller samtidig redigering har lagts till.

## Verifiering

Fokuserade modelltester: `node tests/smartmatch-projektering-demo-v1-data.cjs`.

PDF-provet använder den befintliga läsarens PDF.js, kortidentifiering, hela beteckningar och produktläsning. Browserprovet använder Chromium, verklig lokal lagring, sparade filer och enbart en lokal teststub för behörighetsklienten. Produktionsinloggningen ändras inte av testerna.
