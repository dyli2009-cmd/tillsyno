# CE TEST 60 – Importera mallar direkt under glasvalet

- **Importera CE-mallar** finns nu direkt **under** Med glas/Utan glas i CE-dokumentfönstret. Det är samma fungerande knapp och samma importdialog för PDF/ZIP som TEST 59.
- Importknappen togs bort från huvudmenyn Dokument & export. Den skapas som en enda DOM-knapp som flyttas när CE-dokumentfönstret öppnas, utan att ändra import-/matchningslogik.
- De fem CE-mapparnas synliga Mall-knappar togs bort för renare översikt. Man kan fortfarande byta en enda fil via respektive CE-mapps **Fler alternativ → Byt PDF-mall**.
- Produktlista och CE-skylt behåller alla sina egna knappar; de importeras inte med de fem CE-mallarna.
- **Optimera PDF-mallar** finns kvar för behov men flyttades till **Dokument & export → Avancerat**, inte som huvudval.
- Befintliga PDF-/ZIP-funktioner, filer, mallstrukturer, lokal historik och IndexedDB är oförändrade.
- Kodkontroll: controller/module/optimizer-syntax, unika ID, knappfunktion, versionslänkar och service worker. Faktisk visuell kontroll på iPad återstår.
