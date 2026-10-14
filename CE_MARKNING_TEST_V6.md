# CE-märkning TEST 6 – dörruppgifter, produktlista, signering och sparning

Beställt 14 oktober 2026. Den senare korrigeringen om sensorval direkt i PDF:ens Typ-fält och objektadress → beställaradress gäller framför den första formuleringen.

- Dörrnummer/beteckning i PDF visar sista delen (exempelvis 1). Maskin-ID och full automatikmärkning behåller hela numret.
- Projektets objektnummer fylls i för nya dörrar. Välj maskintyp från samma 38 poster som SmartMatch TEST v36.106 och ange antal/beteckning. Nästa nummer föreslås per objekt/maskintyp och kan ändras. Placering skrivs per dörr. Modell och fabrikat kan ändras per dörr.
- Fabrikat/modell förs över till Loggbok och Egenkontroll. ED-familjen kopplas till Dorma, SW/SV-familjen till Assa; historiska Besam/Entramatic-poster i SmartMatch-listan normaliseras till Assa i fabrikatfältet. Egen modell/fabrikat går att skriva.
- Loggbokens första sida fylls. Servicesidorna lämnas tomma och får inga automatiskt kopierade signaturer. Eventuell äldre serviceinformation ligger kvar i arbetsdata men skrivs inte in i nya CE-exporter.
- Typ-fälten för säkerhetssensorer i Riskanalys och Egenkontroll har en liten väljare direkt i PDF-rutan. Snabbval: 4SAFE, Flatscan, Flatscan 3D, eller egen text. Valen öppnas från Typ-fältet; markering av hög risk/sensor öppnar ingen sensorväljare. Extra informationsrader om markerat alternativ/sidnummer och externa sensorverktygsrader visas inte.
- Vid markerad huvudpunkt i 10.5 öppnas signering om punktens signatur saknas. Varje punkt/dörr har en uttrycklig signaturreferens. En sparad signaturbild kan återanvändas efter aktivt val, men fyller inte andra punkter automatiskt. Saknade punktunderskrifter stoppar Kontroll/Klart och komplett mappexport. När en huvudpunkt ändras eller avmarkeras återställs dess underskrift. Att redigera text återöppnar dokumentkontrollen.
- Stäng redigering finns alltid i dokumentdialogens övre rad. PDF-zoom från TEST 4 behålls. Projektuppgifter är kompaktare; datumfält hålls inom samma kolumnbredd. Objektets adress/postort kopieras till beställaren när objektuppgiften ändras.
- Produktlista har ett eget redigerbart formulär per dörr med produkt, modell/beskrivning, antal och kommentar. Automatik och uttryckligt valda sensorer kan användas som förslag. Lås, handtag och övrigt skrivs manuellt. Spara PDF skapar en vanlig produkt-PDF. Ett ändrat utkast måste sparas igen före kontroll/komplett export.
- Ifyllda enskilda PDF:er kan sparas från dokumentets meny eller Visa → Spara fil. Kompletta dörrmappar exporteras som ZIP med samma dörr-/dokumentstruktur som tidigare.
- Arbets-PDF lagrar komprimerad JSON, en gemensam mall per dokument samt egna fältdata och bild-/signaturreferenser. Genererade produkt-PDF:er lagras som produktrader och skapas vid behov; externa produkt-PDF:er bäddas in en gång. Riskanalys, Loggbok, Egenkontroll med flera skapas inte som nya PDF-kopior för varje dörr under arbetet.
- Sparfelet Maximum call stack size exceeded reproducerades med stora PDFHexString-textfält i pdf-lib. Ny lagring använder en komprimerad UTF-8-ström; äldre UTF-16-projekt läses utan bibliotekets stora fromCodePoint-anrop. TEST 2–5 kan öppnas. Tidigare ifyllda svar och mallar bevaras; saknade uttryckliga egenkontrollsignaturer återöppnar klarmarkering vid import.

## Verifiering

`tests/ce-markning-v6.cjs`: riktiga pdf-lib/PDF.js/JSZip, spara/återöppna tre gånger utan dokumentackumulering, glasstandard/egna undantag, äldre projekt, dokumentkopplingar och verktygsrad.

`tests/ce-markning-v6-features.cjs`: SmartMatch-lista, automatisk märkning/ändrat antal, fabrikat/modell, sensorval i rätt Typ-fält, egen text, signeringsanrop, endast uttryckliga punktunderskrifter, tomma servicesidor, manuell produkt-PDF, långa rader över flera sidor och produktgenerering vid återöppning. Samma kontroller kördes dessutom mot användarens faktiska Loggbok- och Egenkontrollmallar. Produkt-PDF och tom servicesida renderades och granskades visuellt.

`tests/ce-markning-v6-storage.cjs`: reproduktion av stackfelet, stort äldre UTF-16-fält samt ny komprimerad PDF-rundtur med stora bild-/signaturdata och Unicode. `tests/ce-markning-v6-zoom.cjs` kontrollerar tidigare zoomlogik.

Inga privata mallar publiceras. TEST 5 och ordinarie SmartMatch/SLR/Kontrollflöde/inloggning/iOS/TestFlight ändras inte. Faktisk mobilinteraktion behöver provas på enheten.

Nästa steg enligt användarens senaste beställning: sparade uppgifter per användare samt adminmallar med glas/utan glas, med mätvärden och individuella risktexter som manuella fält.
