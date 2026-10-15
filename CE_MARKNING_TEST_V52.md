# CE TEST 52 – visuellt samspel med Tillsynos startsida

Visuell jämförelse gjord mot repo `index.html`, godkända Tillsyno-stilen v2.4.287 (mörk marinblå #112f42/#0b2637/#091e2b, tunn ram, transparent mörka kort, små 32px-ikoner).

Projektväljaren i CE-märkningen:
- Ny, kort rubrik **Välj CE-projekt** och underrad **Fortsätt, öppna eller skapa ett projekt.**
- Tre kompakt staplade val med ikon, **rubrik på första raden** och mindre beskrivning under: **Fortsätt senaste projekt**, **Öppna projekt-PDF**, **Nytt projekt**.
- Max 350 px kortbredd på desktop/iPad, mobilanpassad. Historikrader också mörka och kompakta.
- CE-märkningens bakgrund följer samma Tillsyno-palette, subtila hörnlinjer och transparenta ytor; befintlig dokumentyta behåller ljust skrivunderlag för PDF-formulär och text.
- Alla befintliga knapp-ID:n, projektflöden, historik, offline-lagring, nedladdning, PDF/ZIP-funktioner och glas/utan glas-profilval oförändrade. Bara visuella CSS/HTML och två CSS-tillståndsklasser ändras.

Inga projektdokument eller PDF-mallar laddas upp till GitHub; endast versionskod.
Kontroll: JS-syntax, unika ID, offline-cache, versions- och skriptkopplingar. Äkta browser/iPad-rendering behöver användartestas.
