# SmartMatch SLR TEST v36.120 – riktig rättning av PDF-exportens metadataordning

## Reproducerad användarrapport
I v36.119: `PDF-exporten stoppades: Alla projektändringar kunde inte läsas tillbaka från PDF-filen.`

## Verifierad grundorsak
`makeProjectPayload()` innehåller `slrTestData.answers` genom referens till aktuell SLR-state. `buildPortableProjectPdf()` skrev metadata innan `SmartMatchSLRTest.saveTo()` komponerade SLR-dokumenten. `compose()` anropar `saved(automation, category)`, som kan skapa tomma answer-containrar för en fysisk automatik. Således jämfördes den ursprungligen inbäddade JSON:en med en modifierad `expected`-referens. Exporten stoppades trots att projekt-PDF:en var giltig.

## Ändring
I enbart `smartmatch-slr-test-main-v36-120.js` ligger anropet `SmartMatchSLRTest.saveTo(doc,payload)` nu före skapande/inbäddning av projektets V36/V30 metadata. Allt som SLR-kompositionen initierar följer därmed med i båda metadatafälten. Den strikta kontrollen `JSON.stringify(expected) === JSON.stringify(actual)` behålls: bortfall av uppgifter får fortfarande stoppa export. GS-logik, dörrkort, PDF-sidor, protokoll, mallar, produktlistor och Kontrollflöde är orörda.

## Verifiering
Reproduktion körd med pdf-lib och den verkliga v36.119 SLR-modulen, med exakt källkod för `buildPortableProjectPdf` och `verifyPortableProjectPdf` från testversionen. Före ändring: exakt användarens felmeddelande. Efter ändring: passerar.
- Två separata fysiska automatiker med egna SLR-svar.
- Ifyllt Loggbok-datum för A kopieras inte till B.
- Både V36 och äldre V30 projektmetadata roundtrip-parsas och motsvarar `expected`.
- En gemensam SLR-mall och separata PDF-dokumentbilagor för båda automatikerna finns kvar.
- Originalets sidantal påverkas inte av bilagorna.
- Återöppning av sparade SLR-svar fungerar.
- Avsiktligt förändrad sparad metadata blockeras fortfarande av kontrollen.
- Syntaxkontroll av nya JS-filer.

Testet använder en liten syntetisk PDF och stubs för övriga sidlager; kontroll med användarens riktiga stora PDF i Safari/iPad återstår. v36.119 finns kvar som snapshot. Fast adress `smartmatch-slr-test.html` pekar på v36.120. Ingen TestFlight/iOS-version ändrades.
