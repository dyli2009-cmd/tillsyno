# Projektering 2.14 – manuell tid i timmar och minuter

## Skarp ritningszoom – rättning 2.14.1

Ritningen behåller en begränsad översiktsbild och renderar den synliga delen direkt från original-PDF:en när den vanliga helsidesbilden inte längre räcker. Detaljvyn följer zoom, panorering och skärmens pixeltäthet. Varje canvas begränsas till 10 miljoner pixlar och 8192 pixlar per sida. Ersatta bildytor frigörs, och avbrutna renderingar kan inte ersätta en senare sida eller zoomnivå.

Projektering 2.14, den stabila projekteringsadressen och 2.15 använder `smartmatch-projektering-v2-14-canvas.js?v=2.14.1`. 2.15:s WC/HWC-symboler finns kvar. PDF-original, stämpelkoordinater och export ändras inte. Offlinecachen får den nya renderaren och ett nytt versionssuffix.

Verifiering: `node tests/smartmatch-projektering-v2-14-sharpness.cjs` använder riktig PDF.js och `@napi-rs/canvas` med en liten DOM-adapter. Testet kontrollerar svarta/vita pixlar i 0,25-punktslinjer vid 1600 %, Retina- och telefonupplösning, panorering, roterad CropBox, sena sidresultat, snabb zoom, minnesgränser, stängning och oförändrade originaldata/stämpelkoordinater. Webbläsarens layout och fysiska Safari har inte körts i denna miljö; Chromium-installationen kunde inte slutföras. Skannade bilder kan bara visa den detalj som finns i originalet.

## Tidsfält i materiallistan

Materiallistans Tid per styck har separata fält för timmar och minuter. Tre timmar anges som 3 i timfältet; tjugo minuter anges som 20 i minutfältet. Båda fälten kan användas för exempelvis 1 timme och 30 minuter. Ett tomt delfält räknas som noll när det andra är ifyllt. Två tomma fält betyder att tiden saknas; uttryckligt 0 är en angiven tid.

Radens tid och projektets totalsumma visas som timmar och minuter, exempelvis 12 tim eller 12 tim 30 min. Samma visning används i material-PDF. CSV har tydligt märkta läsbara tider och behåller numeriska minuter för kalkylblad. Befintliga delminuter bevaras, exempelvis 7,5 min. Beräkningen använder fortfarande sparade minuter per styck och antalet produkter från placerade GS-dörrkort.

Tider fylls i manuellt och sparas endast i aktuellt projekt. Inga fasta produkttider, automatiska förslag eller tider för kommande projekt införs. En framtida produktlista med beslutade tider kräver en separat uppdatering.

Ändringar i båda tidsfälten köas tillsammans. Export väntar på sparning och fångar även det fokuserade tidsfältet. Ogiltiga värden eller misslyckad sparning behåller ett markerat utkast och stoppar export tills tiden rättats eller sparats. Utkast finns kvar vid filtrering; ett lyckat projektbyte eller återöppnande av samma projekt ersätter dem. Timmar är heltal, minuter kan behålla äldre decimalvärden, och den sammanlagda gränsen är fortsatt 100000 minuter per styck.

Nya HTML-, CSS-, huvud- och materialfiler används för 2.14. Stabil projekteringsadress är en full kopia av 2.14-sidan. Data, bibliotek, projekt-PDF, projektformat och beräkningsunderlag återanvänds från 2.13. Tidigare versionsfiler bevaras. Home och service workerns versionsprefix uppdateras till v2.4.484; cachelistan och övriga moduler ändras inte. Ingen native- eller TestFlight-build ingår.

Verifiering: data-/biblioteks- och projekt-PDF-regressioner, materialtester för timmar/minuter, mängder, GS-underlag, tom/noll, äldre delminuter samt sökbar och sidindelad material-PDF/CSV. Webbläsarflöden kontrollerar inmatning, sparning, export och återöppning på dator och emulerad iPad/iPhone. Fysisk Safari ingår inte i verifieringen.

