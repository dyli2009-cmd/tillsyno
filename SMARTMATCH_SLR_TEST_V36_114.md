# SmartMatch SLR TEST v36.114 – endast manuella kryss, möjliga att avmarkera

Användaren vill inte ha automatiska kryss/sensorval och behöver kunna ta bort ett markerat sensorval.

## Rättning
- Ett tryck på ett radioval markerar det. Ett nytt tryck på samma val tömmer gruppen. Andra alternativ i samma grupp avmarkeras när ett nytt väljs.
- Riskanalysmallar rensas från förvalda fält när de importeras och när äldre projektbilagor läses. Kryss/radiovals standardvärden (DV) tas bort.
- PDF-genereringen nollställer mallens riskval innan den applicerar enbart den aktuella automatikens sparade uppgifter. Ett saknat manuellt val kan därför inte ärva mallens ursprungliga sensorval.
- Sparade manuella val och datum bevaras; nya automatiker ärver inte andra dörrars svar.

## Kontroll
Syntax passerade. Faktiska modulens PDF-generering körd med PDF-lib mot en femsidig testmall med förvalda radio-/checkboxfält: tomt resultat för ny dörr, manuella val sparas, ny andra dörr är blank, valt radioval kan avmarkeras genom klick och blir blankt även i exporterad PDF, nytt klick markerar igen, datum består. Ingen mushjulszoom återinförd; kalender, +/- och pinchzoom är kvar.

Endast separat SLR-test ändrat. Fast adress: smartmatch-slr-test.html; version 36.114-SLR-TEST.
