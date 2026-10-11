# SmartMatch – sparad protokollmall: Egenkontroll (v1)

**Status:** Återanvändbar kund-PDF-layout. Sparad separat från projektets kontrollpunkter.
**Mallnyckel:** `egenkontroll-v1`.
**Koden som använder mallen:** `smartmatch-protocol-templates.js` och `createAutomationSelfcheckPdf` i `project-workspace-smartmatch-v36-71.js`.
**Historisk säkerhetskopia före ändring:** `project-workspace-smartmatch-v36-70.js`.

## Utseende som ska återanvändas
- A4 stående, vit bakgrund, tunn grå tabellram och föregående kundmalls typografi.
- Logo uppe till vänster, bara **EGENKONTROLL** centrerat som rubrik i huvudramen. Ingen dubbel ”Egenkontroll”, ingen ”Checklista revision dörrautomatik” på kund-PDF.
- Anläggning, datum, anläggningsnummer, kund, utförare, kontakt, ID/märkning, placering, AO och signaturfält i samma ursprungliga design.
- Sex tabellkolumner med exakta bredder **9 / 101 / 14 / 23 / 23 / 16 mm**. Resultatkolumner är båda **23 mm**.
- Kontrollpunkter skrivs med id, beskrivning och svar; full text för 1.5/1.6/1.12 på en rad.
- Allmänna anmärkningar och sidfot ska finnas kvar.
- Kundmall/förhandsgranskning och PDF-export använder samma generator.

## Återanvändning
När användaren säger **”mall för egenkontroll”** eller **”mall för checklista revision dörrautomatik”**, börja från den här sparade layouten. Byt kontrollpunkternas texter och fält för det nya kontrollflödet utan att ändra originalmallens geometri eller färgsystem. Varje nytt dokument får egen mallnyckel/version så ändringar inte slår på befintliga kundprotokoll.

Observera: detta är en **separat layoutmall i källkoden**, inte en ny användarvald mallfunktion, och det är inte en fristående nedladdningsbar blankett. Bygg ny generator/val vid behov senare.
