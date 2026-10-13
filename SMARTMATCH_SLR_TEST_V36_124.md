# SmartMatch SLR TEST v36.124 – mappkontroll, delad signatur och två redigeringslägen

## Avgränsning
Separat SLR-test, byggt på v36.123. Ordinarie SmartMatch v36.106, Kontrollflöde och iOS lämnas oförändrade. Fast testadress: smartmatch-slr-test.html. Snapshot: smartmatch-slr-test-v36-124.html. Föregående testversion v36.123 är bevarad.

## Funktion
- Sju mappar behålls. Varje mapp visar grå 0 % före arbete, ljusgrön 50 % vid manuellt påbörjat arbete och grön 100 % efter explicit "Markera kontrollerat". Mappstatus sparas separat per dörr.
- Dörrens SLR-procent är genomsnittet av de sju mapparna. Klart/100 % kräver samtliga sju mappar genomgångna, att dokumentkällorna finns och att produktlistans GS/dörrkortskoppling fortfarande är giltig. Tidigare färdiga v36.123-dörrar får behålla sin status tills de öppnas igen.
- Ändra = redigera gemensamma standardfält för samma dörrtyp (Med glas eller Utan glas), med bibehållna dörrspecifika överstyrningar. Kräver vald profil. Individuell Klart-status och kontroll av berörd mapp öppnas igen för samma profil.
- Ändra endast denna dörrautomatik = redigera bara den valda dörrautomatiken.
- Maskin-ID/dörrnummer och GS/projektidentitet kopieras inte som gemensamma profildata. Produktlista och CE-foto är alltid individuella. Ersätt fil byter fortfarande gemensam mall för projektet och kräver omkontroll.
- En signaturbild sparas en gång i projektets signaturbibliotek. Vid aktiv signering kopplas bilden dessutom till aktuell dörr (doorSignatures) och återanvänds automatiskt i denna dörrs riskanalys och igenkända PDF-signaturfält i andra SLR-dokument vid visning/export. Det signerar INTE andra automatiker och markerar inte någon kontroll klar. Äldre signaturfält/referenser läses som tidigare.
- Visa PDF öppnar ett separat internt visningsfönster och renderar PDF-sidorna rullbart med PDF.js. CE-bild visas i samma fönster. Ingen ny webbläsarflik används.
- Projektdata schema 4 tillför doorSignatures och reviewedFolders. Gemensamma mallar och kompakta projektexporter behålls utan en fullständig dokumentkopia per dörr.

## Begränsningar att verifiera på riktiga mallar
Signatur placeras automatiskt i befintliga PDF-signaturfält och namngivna underskriftsfält. Om underskriften endast är tryckt som vanlig text utan interaktivt fält kan placeringen inte bestämmas säkert utan separat mallkontroll. Testa riktiga egenkontroll- och loggboks-PDF:er innan produktionsbruk. Testsviten tests/slr-folders-v36-124.cjs är uppdaterad men har inte körts i denna miljö; även iPhone/iPad-test återstår.

## Versionsfix
Huvudskriptet `smartmatch-slr-test-main-v36-124.js` använder `SMARTMATCH_RELEASE='36.124-SLR-TEST'` och är kopplat från både den fasta testadressen och v36.124-snapshoten. Detta undviker att huvudskriptet skriver över versionsindikatorn med 36.123.
