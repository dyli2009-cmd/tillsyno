# SmartMatch Avläsning TEST 9.29

TEST 9.29 visar fristående **DS** och **DA** tydligt utan att skapa en extra DS ovanpå en redan kopplad VCDS- eller WC-stämpel.

Teknisk build: **36.172**. Synlig Tillsyno-version: **v2.4.397**.

TEST 9.28 och samtliga äldre versionsmärkta filer är oförändrade.

## Vilka PDF-stämplar som visas

Modulen använder det redan förberedda PDF-stämpelregistret. Stämpelns `/Subj` är auktoritativ när den finns och måste vara exakt något av:

- `DS`
- `DA`
- `Dörrstängare`
- `Dörrautomatik`

Endast när `/Subj` är tomt får samma exakta värden läsas från `/Contents`. Skillnader i stora och små bokstäver samt svenska tecken normaliseras, men extra ord eller tecken godtas inte.

Det innebär att bland annat `WC dörrstängare`, `VCDS`, `DBL-DS`, `DS1` och `Dörrstängare freeswing` inte skapar en fristående DS-symbol. Om `/Subj` är `VCDS` och `/Contents` är `Dörrstängare` vinner `/Subj`, så den kopplade stämpeln dubbleras inte.

Identiska registerposter tas bort per PDF-sida och symboltyp. Samma annoterings-id eller samma rektangel visas därför bara en gång.

## Utseende och zoom

Båda symbolerna är passiva kvadrater på **14 × 14 CSS-pixlar** med 8-pixelstext och mörk kant:

- DS har orange bakgrund `#f59e0b` och svart text.
- DA har mörkröd bakgrund `#dc2626` och vit text.

Symbolens mittpunkt följer PDF-annoteringens rektangel. Själva symbolen behåller samma skärmstorlek vid Passa, översikt och detaljzoom, så den varken växer över ritningen eller försvinner. Lagret har inga pekhändelser och hindrar därför inte tryck på en SmartMatch-position.

## Prestanda och avgränsning

Visningen läser bara det befintliga stämpelregistret. Den startar inte OCR, helsidestext, produktavläsning eller ritningsmatchning. Dörrkortssidor får inga DS/DA-symboler.

## Verifiering

Automatiska tester kontrollerar:

- exakt klassificering och att `/Subj` har företräde
- avvisning av WC, VCDS, DBL-DS, DS1 och freeswing
- innehållsreserv endast vid tomt `/Subj`
- dubblettskydd för samma annoterings-id eller rektangel
- en DS och en DA trots en stor falsk WC/VCDS-stämpel och en likadan dubblettpost
- exakt 14 × 14 pixlar, rätt färger och centrerad placering vid Passa, översikt och detaljzoom
- dator samt iPad i stående och liggande vy
- inga anrop till OCR, helsidestext, produktläsning eller matchningssökning under zoom och sidbyte

Chromium emulerar iPad-signalerna. En fysisk iPad med Safari rekommenderas som sista visuell kontroll.
