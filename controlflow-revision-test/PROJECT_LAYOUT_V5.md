# Projekt och Service – TEST v5

Beställt 2026-10-15. Endast layouten i den separata revisionstestappen ändras.

- Två tydliga kolumner från 720 px: Service till vänster, Projekt till höger.
- Service innehåller serviceföretagets kontakt-/adressuppgifter, signatur, logotyp och Ny service.
- Projekt innehåller Anläggning & jobb och Beställare. Anläggningsnummer och ordernummer är separata fält.
- På telefon visas Service följt av Projekt i en kolumn. Alla fält är synliga; ingen ny meny eller extra bekräftelse behövs.
- Kompakta fältrader med läsbara etiketter, 34 px höga inmatningsfält på större skärmar och 40 px på telefon. Telefonens inmatningstext är minst 16 px. A−/A+ kan fortfarande förstora texten.
- Befintliga fält-ID:n, datakopplingar, import, signaturfunktion, logotyp, PDF-beräkningar och lagringsnycklar är oförändrade. Samma `security-v4.js` och övriga funktionsfiler används. Inga nya projektfält skapas.
- TEST v4 finns i `v4/all-in-one.html`. Äldre runtime-filer är bevarade. Ordinarie Kontrollflöde, SmartMatch och iOS ändras inte.

## Verifiering

Webbläsarkontroll vid 1280×900, 820×1180 (iPad stående), 1180×820 (iPad liggande), 390×844 och 320×720: kolumnernas ordning, formulärets fältkopplingar, inga dubbla ID:n eller horisontellt överflöde och läsbara inmatningsfält. Skärmbilder granskades på iPad och liten telefon. Största textstorleken kontrollerades också. Grundkopians kontroll och samtliga historiska runtime-hashar är godkända. Inga fysiska enheter har testats.
