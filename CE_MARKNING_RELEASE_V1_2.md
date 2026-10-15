# Tillsyno CE-märkning v1.2 – integrerad i Kontrollflöde

- Produktion: **ce-markning.html**, med hemknapp till Tillsyno. Ingen testsiffra visas i CE-gränssnittet.
- Kontrollflöde: **Dörrautomatik / Lås → CE-märkning**, separat länk under de tre protokollcheckboxarna. CE öppnar **en egen app/sida**, inte ritningsvy.
- Förbättrade enhetliga SVG-ikoner för tre områden och samtliga nio val i Kontrollflödets protokollväljare. Brand-mappen heter nu **Brandsäkerhet**.
- **Ingen ändring av protokoll-IDs, checkbox-, PDF-, ritnings- eller kontrollpunktslogik**. Uppdaterad Tillsyno startsidesversion v2.4.294.
- CE version 1.2 använder oförändrade interna `VERSION=60`, `FORMAT='Tillsyno CE-märkning TEST 60'`, och samma IndexedDB-v7: projekt-PDF, tidigare projekt och historik bevaras. Endast synlig release-version ändras.
- CE-funktioner och mallimport, projektlista, autosparning och export från TEST60 kopieras oförändrade (förutom versionsetiketter, Hem-knappen och snäv offline-serviceworker).
- TEST60-sidan lämnas kvar som reserv/rollback, men länkas inte från Kontrollflödet.
- QA: kontrollerade JS-syntax, exakt nio protokollcheckboxar och en separat CE-länk, oförändrad DB/format, alla HTML-ID unika, scripts och cache scope. Verifiering på iPhone/iPad och publiceringen återstår.
