# Införande av godkända TEST v16 – Tillsyno v2.4.309

## Meny och avgränsning

På användarens uttryckliga godkännande av TEST v16 ersätts den vanliga vägen för Dörrautomatik / Lås av den godkända koden i controlflow-revision/all-in-one.html. Ordinarie meny och Hem-adress används. Val av revision dörrautomatik, egenkontroll dörrautomatik eller revision lås skickar redan valda protokoll till produktionsmodulen utan ett andra valsteg. Kombinerade val följer tillsammans till samma PDF. Val som enbart gäller Säkerhetsservice/Brand behåller tidigare runtime. Delade root security.js/all-in-one.css och fristående arbetsområdens funktioner är oförändrade.

## Godkänd funktion och data

Modulen kopieras från aktiv TEST v16, med samma kontrollpunkter, importer, pilkoordinater, –/✓/×-tabell, inline egna punkter, direkt borttagning/Ångra, projektsignatur, fältkoppling, kundmall/PDF och valfri serviceöversikt. Testfilerna ändras inte. legacy-door-import.js är byteidentisk med den låsta profilen.

Produktion återanvänder vanliga doorservice-all-in-one-projektnycklar, UI-inställningar, tillsyno-offline-work och drawing-transfer. Testets lokala data berörs inte; öppna sparad test-PDF i ordinarie modul för att föra över testarbete. Arbets-PDF-identifierare och format v2 är samma. Ingen fil laddas upp eller ersätts på disk utan användarens vanliga filval. Produktionens root-service-worker cachar alla modulresurser och registeras med root-scope från underkatalogen.

## Webb och iOS

Webbversion v2.4.309. iOS-repot dorrservice-ios speglar modulen och menyvägen, med lokal project-vendor PDF-runtime från befintligt buildskript. Nytt native export-adapter använder befintliga Capacitor Filesystem/Share-pluginer och behåller PDF-basnamnet genom en unik överordnad katalog. iOS sidhuvud/safe-area återanvänds. Den separata CE-länk som saknar mål i detta iOS-repo visas inte i modulens reservväljare. Ingen auth-/licensregel ändras. Marketing-versionen i Codemagic sätts till 2.4.309. Publicerad webb, källkodsspegling och faktisk TestFlight-build är separata verifieringssteg; ingen fysisk enhet eller signerad iOS-build har körts i denna miljö.

## Verifiering

- Ordinarie meny → alla tre Door/Lock-val, blandat val, andra-val-kvar och inget dubbelt protokollval.
- Befintlig vanlig lokal arbetsdata/anmärkning/kund/order bibehålls och testnycklar lämnas orörda.
- Importprofiler: verifierade och avvikande ID, roterad ritning, bokstavsprefix, projektfält/konflikter, manuell koppling, ångra och arbets-PDF återöppning. Låst P/GoTo-import och exakta pilpositioner passerar oförändrat. Samma import fungerar efter offline-reload.
- 320/390/768/1200 px, textstorlekar, mindre symboler, egna kontrollpunkter och knappar. Samma kundmallsbild som exporterad PDF, länkar, översiktsformat/flytt/storlek, ny service, borttagning, återöppning och offlineexport.
- Native Filesystem/Share-anrop körda med mockade iOS-pluginer: PDF-data, en export/en delning och originalfilnamn. Detta ersätter inte ett fysiskt iOS-test.
- TEST v1–v16 och historiska runtime-hashar är bevarade. Grundkopians isoleringskontroll passerar. Native-modulens kod är samma som webb utom dokumenterade plattformsanpassningar.

Regressionsstart: tests/controlflow-production-v309.cjs. IOS_NATIVE_EXPORT kan peka på iOS-repots www/controlflow-revision/native-export.js för kontraktstest av native delning. Övriga fulla v16/import/serviceöversiktskörningar genomförda mot produktionsadressen. release.json innehåller runtime-hashar och ändringar från godkänd källa.
