# Kundrapport och filnamn – TEST v9

Beställt 2026-10-15, endast i den separata revisionstestappen.

- Ingår ej-strecket kortas från 6 till 2,8 mm. Tjockleken minskas från 0,5 till 0,22 mm och färgen blir normal mörkgrå. Ingen fetstil används för strecket.
- Automatikmärkningar på kundens ritning minskas från 16,2/13,8 till 14/12 punkter (kort/långt ID), cirka 14 procent. Samma PDF-rendering används i kundmall och export. Markeringarnas centrum och pilspetsar flyttas inte.
- PDF sparas normalt med samma namn som den öppnade filen, inklusive mellanslag, svenska tecken och filändelsens skiftläge. Den öppnade filens namn sparas i `project.sourceFileName`. Vid återöppning av en omdöpt arbets-PDF gäller dess nuvarande filnamn. Även dialogen Skapa ny PDF föreslår detta namn; användaren kan fortfarande ange ett eget.
- Projektfältet Ordernummer / AO heter nu Ordernummer. Det använder fortsatt `project.order` och visas under ORDERNUMMER i anmärkningsöversikten.
- Det tidigare synliga Avtalsnummer-fältet heter AO-nummer och använder ett separat `project.aoNumber`, tomt från början. Ordernummer eller äldre avtalsnummer kopieras inte dit. Kundprotokollets AO-ruta är tom tills användaren själv fyller i AO-numret. Ny service tömmer order och AO. Äldre `agreement`-data behålls i arbetsfilen för kompatibilitet.
- Postadress heter Ort i båda projektkolumnerna. Kundrapportens båda adressrader heter Postnummer / Ort.

TEST v8 finns i `v8/all-in-one.html`. Zoom och dubbeltryck från v8 är kvar. Alla äldre runtime-filer, importprofiler och den låsta grundimporten är bevarade. Ordinarie Kontrollflöde och iOS/TestFlight ändras inte.

## Verifiering

`tests/controlflow-customer-v9.cjs` kontrollerar verkliga nedladdningsnamn för båda sparvägarna, inklusive svenska tecken och `.PDF`, återöppning under nytt namn, separata order-/AO-/äldre avtalsvärden, tom och manuellt ifylld AO-ruta, ortetiketter, nya teckenstorlekar och streckets PDF-geometri. Testet omfattar även oförändrad signatur, kontrollsvar, arbets-PDF, ny service och tillbaka-länk. Förhandsvisning och exporterad ritning jämförs pixel för pixel för stående/roterad ritning, korta/långa märkningar och telefon. Kundprotokollet har renderats och granskats visuellt. Historiska runtime-hashar och grundkopians test är godkända.
