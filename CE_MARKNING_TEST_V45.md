# CE TEST 45: filstorlek direkt i varje CE-dörr

- Varje av de sju CE-dokumentmapparna visar aktuell storlek i MB, avrundad till två decimaler.
- Ovanför dokumentmapparna visas total storlek för **den öppna dörren**. Storleken avser faktisk genererad PDF/bild som skulle läggas i ZIP, innan själva ZIP-komprimeringen.
- Mätning startar automatiskt vid öppning och efter projektändringar/foton. Manuell Uppdatera storlek finns.
- Mätning sker sekventiellt, avbryts logiskt när användaren byter dörr och görs inte vid varje tangenttryck (debounce 650 ms).
- Saknade dokument visas som saknas; mätfel visas tydligt. Mätvärden sparas inte i projekt-PDF.
- CE-skylt mäts efter samma bildoptimering som ZIP-exporten, men själva projektfotot ändras inte.
- ZIP-totalen efter komprimering finns kvar i Exportera CE-underlag; mappsumman före ZIP är inte identisk med ZIP-storleken.
- Övriga Tillsyno-delar är oförändrade.

Test: kodsyntaktiskt och versionslänkar kontrolleras; verkliga iPad- och projekttester återstår.
