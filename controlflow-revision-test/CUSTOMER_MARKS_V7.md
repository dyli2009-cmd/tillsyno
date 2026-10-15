# Kundprotokoll – TEST v7

Beställt 2026-10-15, endast i den separata testappens revisionsprotokoll för dörrautomatik.

- Ingår ej visas med ett centrerat, 6 mm långt och 0,5 mm tjockt streck med rundade ändar. Det ersätter det lilla bindestreckstecknet.
- Under Allmän info / anmärkning står exempelvis `1.1 Samtal med nyttjaren.` i stället för `1.1 – Samtal med nyttjaren.`. Bara den automatiskt tillagda avskiljaren tas bort. Användarens anmärkningstext ändras inte.
- Samma kundprotokoll används i Kundmall och sparad PDF. Anmärkningsöversikten och övriga protokolltyper är oförändrade.
- Ingen ändring av kontrollsvar, punktnummer, signatur, ritningsmärkningar, projektdata eller import. TEST v6 finns i `v6/all-in-one.html`; äldre runtime-filer är bevarade. Ordinarie Kontrollflöde och iOS ändras inte.

## Verifiering

En verklig kund-PDF med både Ingår ej och en anmärkning skapades i webbläsaren. PDF-geometrin verifierades: exakt 6 mm långt och 0,5 mm tjockt streck, anmärkning utan separator. Anmärkningsöversiktens text och renderade pixlar jämfördes med v6 och var identiska. Kundmall, export och bevarade kontrollsvar kontrollerades. Protokollet renderades och granskades visuellt. Grundkopians test och samtliga äldre runtime-hashar är godkända.
