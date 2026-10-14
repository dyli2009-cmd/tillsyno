# CE-märkning TEST 20 – synliga kryss

Kryssen ritas med canvas ovanpå PDF-sidan i redigeringsläget, i stället för SVG inuti transparenta knappar. PDF-radions exakta värde och rektangel hämtas från originalets pdf-lib-fält (PDF.js reserv). Förvalda kryss och manuella ändringar uppdateras visuellt direkt. PDF-exportens specialkryss 4.6.1/4.6.2 ritas som samma diagonala streck som övriga kryss. Dubbel annotation-rendering undviks. TEST 19 finns kvar; importerade TEST 19-projekt accepteras i TEST 20. Ingen förändring av SmartMatch eller Kontrollflödet.

Kodens JS-syntax validerad. Riktig iPhone/iPad-interaktion och källa PDF kräver praktisk kontroll innan buggen kan betraktas som helt löst.