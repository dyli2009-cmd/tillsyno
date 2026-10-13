# SmartMatch SLR TEST v36.123 – dokumentmappar och fullständiga dörrstandarder

## Användarbeslut 13 oktober 2026

SLR ska fungera som dokumentmappar. Med glas och Utan glas får varsin standard med kryss, radioval, text, sensoruppgifter och datum. Ändra bara denna dörr sparar individuella fältvärden. Dörrens identitet, GS-koppling och produktlista följer dess egna uppgifter. Projektets sparade underskrift används direkt efter ett tryck på Signera i nästa dokument.

Detta ersätter v36.122:s regel att endast kryss/radioval fick ingå i standarden. Standarduppgifter klarmarkerar ingen dörr automatiskt.

## Byggt

- Sju dokumentmappar: Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran – tillverkare av maskin, Produktlista, Egenkontroll, CE-skylt.
- Försäkringscertifikat, Godkännande och Egenkontroll – brukaransvarig visas inte i den nya mappvyn. Tidigare sparat material bevaras i arbetsfilen.
- Dokumentknappar ligger inne i respektive mapp: Visa PDF, Ersätt fil och Ändra bara denna dörr. PDF-redigeringen ligger direkt under samma dokument och kan stängas där. Ersätt fil gäller fortfarande projektets gemensamma mall, medan Ändra bara denna dörr gäller individuella uppgifter.
- Standardinställningarna är kompakta och kan fällas ut. Hela ifyllnaden för de fem formulärdokumenten sparas; även avmarkerade kryss och tomma egna fält kan överstyra en standard. Produktlista och CE-foto är individuella.
- Ta bild/Välj bild för CE-skylt. Fotot hör till vald dörr och lagras i projektdata; bilden skalas till högst 1600 pixlar på längsta sidan och JPEG 85 % för att begränsa filstorleken.
- Signaturbilden lagras en gång per projekt. Ett tryck på Signera på ett ännu osignerat dokument använder den sparade bilden direkt. Befintliga underskrifter kan öppnas och ersättas; en tom signaturruta sparas inte.
- Klart kräver att de sju dokumentkällorna finns och att produktlistans GS-källa fortfarande stämmer. Det är teknikerns manuella genomgång, inte automatisk bedömning av formulärsvaren. Klart ger 100 % på dörrens SLR-halva. Fält-, foto- och signaturändringar öppnar dörren igen; standard-/malländringar öppnar berörda klarmarkerade dörrar igen.
- Spara visar Projekt, Egenkontroll och SLR. SLR visar klarmarkerade dörrar för individuellt urval. Skapa mapppaket bygger en ZIP; Spara filer delar endast själva ZIP-filen på mobil eller laddar ned den på datorn.
- ZIP-struktur: projekt / dörr-ID / numrerad dokumentmapp / PDF eller CE-bild. Alla sju dokumenttyper följer med per vald dörr. Dörrar utan Klart kan inte exporteras som färdiga paket.

## Sparformat och avgränsning

SLR JSON schema 3 lägger till completedDoors och doorPhotos; tidigare svar, glasprofiler och signaturbibliotek läses fortsatt. Projektmanifest schema 7 behåller en delad mall per kategori och individuella produktlistor. Färdiga kundformulär genereras vid öppning/export och läggs inte in som en ny PDF för varje dörr i arbetsprojektet. CE-foto lagras en gång per dörr i komprimerad projektmetadata.

Versionen har en separat lokal arbetsnyckel. Den fasta SLR-testadressen är smartmatch-slr-test.html; tidigare v36.122-filer är bevarade. Ordinarie Kontrollflöde, SmartMatch TEST v36.106, inloggning och iOS/TestFlight ändras inte. DA-modulen skiljer sig bara genom SLR-listan och kopplingen till den nya SLR-statusen; GS-reglerna är identiska.

## Verifiering

tests/slr-folders-v36-123.cjs använder verklig pdf-lib och JSZip med syntetiska PDF-formulär. Kontroller: två separata profiler; sensor/text/datum/kryss; dörrspecifik datumändring; false/tom överstyrning; rätt maskin-ID; aktiv återanvändning av signatur; sju fällbara mappar; editor under rätt mapp; manuell Klart; ändrad dörr blir inte 100 %; ZIP med 14 filer för två dörrar; platta kund-PDF:er; CE-bild och signatur följer sparad projektmetadata; äldre kryssprofiler.

De verkliga buildPortableProjectPdf och verifyPortableProjectPdf kördes tre gånger med en syntetisk projektfil: 14 501, 14 503 och 14 510 byte. En mall per formulärkategori och två produktlistor bibehölls, kundens fristående bilaga bevarades och ursprunglig ritning fick inga extra sidor. ZIP verifierades också med Pythons zipfile/CRC-kontroll.

JavaScript-syntax och avgränsad DA/GS-diff är kontrollerade. Faktisk kamerainmatning och visuellt test av den kompletta appen på iPhone/iPad återstår i användarens miljö. Testresultaten med syntetiska data är inte en mätning av storleken på ett riktigt kundprojekt.
