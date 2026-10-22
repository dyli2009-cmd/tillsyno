# Projektering 2.8 – redigerbart bibliotek och produktförslag

Grupper, stencilmallar och produktbibliotek sparas som data i appen. Källkoden skrivs inte om när en användare ändrar sitt bibliotek. Denna version sparar biblioteket på den aktuella enheten, separat från projekt och per inloggad användare när ett verifierat användar-ID finns. Den synkroniserar inte bibliotek mellan enheter.

## Redigera biblioteket

Öppna Stenciler → Bibliotek.

- Grupper: byt namn på huvudgrupper och undergrupper, skapa grupper, ändra vilka beteckningar som hör till dem och visa eller dölj stenciler. När en grupp tas bort väljs vilken grupp som tar över dess stenciler och regler. Dörrkort och symboler behåller sina olika funktioner.
- Produkter: lägg till, ändra eller ta bort produkter, välj komponentkategori och ändra kategoriernas visningsnamn. Redigering av exempelprodukter sparas som egna biblioteksval. Produktnamn kan även skrivas direkt på dörrkortet.
- Säkerhetskopia: exportera hela biblioteket eller granska en importerad biblioteksfil. Sammanfoga behåller befintliga val vid konflikter; Ersätt kräver ett uttryckligt val innan något skrivs. Projektimport ändrar inte det personliga biblioteket.

Spara i stencilredigeraren sparar stencilen i projektet och som återanvändbar mall. Nya projekt får bibliotekets stencilmallar, färger, mått, grupper och produkter. Befintliga projekts sparade stenciler och dörrkort skrivs inte om av biblioteksändringar. Äldre egna produkter och ändrade stenciler tas med när biblioteket skapas första gången.

## Skriv och välj produkter

Varje produktrad på dörrkortet har ett textfält. Skriv egen text eller välj ett förslag. Namn som börjar med sökningen visas först; en bokstav eller ett nummer räcker. Exempel: S föreslår S-produkter och sw 3 hittar SW300 i rätt komponentkategori. Beskrivningar och interna ID:n ger inte orelaterade enbokstavsträffar.

Använd piltangenter och Retur för att välja, Escape för att stänga förslagen eller Tab för att behålla den egna texten. På pekskärm kan listan rullas utan att ett fingerdrag väljer en produkt. Ett tryck väljer produkten. Antal och leverans-/monteringsval behålls.

Biblioteksknappen vid raden öppnar kategorins produktval. Lägg till där sparar produkten i biblioteket. Vanlig fri text på dörrkortet läggs inte automatiskt i biblioteket, så att skrivfel inte blir permanenta produktval. Spara dörrkortet sparar dess egna produkttexter som tidigare.

## Sparning och projektdata

Biblioteket använder en egen IndexedDB-databas och påverkar inte den befintliga projektlagringens version. Sparat visas först när transaktionen har avslutats. Samtidiga ändringar från en annan flik upptäcks; en äldre kopia skriver inte tyst över den nyare. Lagringsfel behåller tidigare sparade uppgifter och redigeringsformuläret kan användas för ett nytt försök.

Ändrade eller borttagna biblioteksprodukter påverkar framtida val, inte produkttexter på redan sparade dörrkort. Materiallistan beräknas fortsatt från sparade dörrkort och placeringar, med armbågskontakter gånger två. Projekt-PDF/JSON behåller projektets innehåll; biblioteket har en separat säkerhetskopia för överföring till en annan enhet.

Nya versionerade app-, skal-, biblioteks-, biblioteksdialog- och förslagsfiler används. Data 2.7 samt canvas/PDF/material 2.6 och projektlagringen återanvänds. Äldre filer, behörigheter och andra arbetsområden är oförändrade. Inga bilder eller skärmbilder har skapats.

Verifiering: modell-/IndexedDB-tester, fristående förslagstester och integrerade webbläsartester för dator samt emulerad iPhone/iPad i Chromium. Grupper, mallar, produktändringar, prefixförslag, pekrullning, sparfel, samtidiga ändringar, bibliotekskopior, nytt projekt, material och projektåteröppning kontrolleras. Fysisk Safari har inte kunnat verifieras i miljön.
