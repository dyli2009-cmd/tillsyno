# SmartMatch – Avläsning TEST 9.13

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-13.html`. Intern version: `36.156-READ-TEST`. Tillsyno-version: `v2.4.380`.

## Hitta en lokal sparning efter en uppdatering

Första sidan söker automatiskt efter lokalt sparade projekt från TEST 9.1–9.12. Ett återfunnet projekt visas under **Lokalt sparade projekt** med texten **Återfunnet från TEST …**. Klicka på projektnamnet för att öppna samma PDF, kopplingar, produkter, bockningar och tider utan ny OCR eller matchning.

Om listan inte syns väljer du **Hitta tidigare lokalt sparade projekt**. Sökningen läser bara lagringen i samma webbläsare på samma dator. Äldre lagringar ändras inte, och stora PDF-filer kopieras inte bara för att visas i listan.

En äldre rad saknar knappen **Radera** eftersom källan hålls skrivskyddad. Öppna projektet och välj **Spara lokalt nu** om du vill skapa en ny kopia i aktuell TEST-version. För överföring till en annan dator används fortfarande **Spara PDF**.

## Verifiering

- En riktig lokal sparning från TEST 9.12 visas och öppnas trots att TEST 9.13 redan har en aktiv fil och ett annat lokalt projekt.
- Ett direkt hopp från TEST 9.11 till TEST 9.13 hittar projektet utan att TEST 9.12 först behöver öppnas.
- PDF-bytes, arbetsutkast, kopplingar och bockningar återställs exakt. Ingen OCR, ritningsmatchning, produktläsning eller förberedelseguide startas.
- Äldre IndexedDB-lagring är oförändrad efter både sökning och öppning.
- TEST 9.12 och tidigare snapshots, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth är oförändrade.
