# CE TEST 38 – projektunderskrift, responsiv förhandsvisning och blå pennstil

## Projektuppgifter → Projektunderskrift
- Ny liten tydlig förhandsvisning: Underskrift, Sparad/Inte sparad, faktisk signatur och datum under.
- Vyn uppdateras direkt när signaturen skrivs/sparas, datumformat/datumstil ändras, projekt laddas eller underskriften rensas.
- Rensa underskrift inaktiveras när inget finns lagrat.
- Sparad signatur centreras horisontellt, datumet centreras precis under.
- Ingen fetstil i signatursektionen, små etiketter, två små knappar Skriv underskrift och Rensa underskrift.
- Äldre sparade signaturer får ett ljusblått pennutseende i förhandsvisningen (utan att originalbilden eller lagrad underskrift ändras).
- Signeringspennan använder ljusblå färg #529ac6 för nya signaturer.
- Datum har samma ljusblå färg och stilval Handstil/Kursiv/Vanlig/Skrivmaskin.
- Dator: tre kompakt uppradade datumfält. iPad/smalare dator och telefon: datum hela bredden + två mindre fält under. iOS minsta inputfont 16px för att undvika oavsiktlig Safari-zoom.

## Kund-PDF
- Underskrift och datum centreras i PDF-signaturrutorna.
- Datum får ljusblå färg och inga feta tecken.
- Tidigare sparade signaturbilder färgas ljusblå enbart för visningen/exporten; det sparade originalet skrivs inte över.
- Den delade underskriftslogiken för Riskanalys och Egenkontroll förblir intakt.

## Tester
- JS-syntax och versionslänkar kontrollerade.
- Simulerad uppdatering av signaturförhandsvisning: sparad → byte av datumformat → rensad, alla tillstånd korrekt synliga.
- CSS för centrering/fetstil och responsiva media queries kontrollerade.
- Faktisk visuell kontroll av iPad/iPhone och genererad kund-PDF återstår.