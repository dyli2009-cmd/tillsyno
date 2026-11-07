# Kontrollflöde – gemensam PDF-design

Kontrollflödet är **upplåst** sedan v2.4.581. **Inga förslag i det här dokumentet är införda**, och PDF-designen lämnas orörd tills ägaren beställer en ändring (beslut 7 november 2026).

## Regel (användarbeslut 7 november 2026)

Alla checklistor och kundprotokoll i Dörrautomatik, Lås, Säkerhetsservice och Brand ska ha **samma visuella utformning**:
- rubriker, färger och typsnitt,
- sidhuvud och sidfot,
- kunduppgifternas placering och layout,
- tabellernas utseende och utskriftsformat.

**Varje undermodul behåller sitt eget innehåll**: kontrollpunkter, protokoll, funktioner och bedömningsregler. Protokollen ska alltså **inte** bli identiska. Bara den visuella utformningen ska vara konsekvent.

**De två motorerna behålls**, med samma uppdelning som i dag (se [README.md](README.md)):
- `security.js` för Säkerhetsservice och Brand,
- `controlflow-revision/security-v335.js` för Dörrautomatik och Lås.

De slås inte ihop, och funktioner flyttas inte mellan dem. En godkänd designändring görs **i båda motorerna** och testas på båda sidorna.

## Fyra lager

| Lager | Ska vara | Var i koden (båda motorerna) |
|---|---|---|
| 1. Visuell design | Lika i alla undermoduler | `reportDoc()`: `summaryHeader`, `field`, `cell`, `protocolTop`, `checkHeader`, `issueTableHeader`, sidfoten (`Sida i av n`) |
| 2. PDF-generering och export | Samma arbetssätt | `buildSecurityDrawingPdf`, `exportPdf`, stämplar via `controlflow-stamp-style-v549.js` |
| 3. Kontrollpunkter och protokoll | Egna per undermodul | `SYSTEMS.<typ>.checks` och `.faults`, protokollrubriker per typ |
| 4. Funktioner och bedömning | Egna per undermodul | t.ex. `isDoorAutomationItem`, detektorernas identitet, signatur i revisionen |

## Nuvarande design, lika i båda motorerna (avläst 7 november 2026)

- **Format:**
  - A4 stående, jsPDF i millimeter.
  - Vänstermarginal 12 mm, innehållsbredd 186 mm, nedre gräns 277 mm.
  - Typsnitt Helvetica. Signaturen skrivs i Times kursiv.
- **Sidhuvud:** ram 186 × 18 mm, med logotypen i en 58 mm bred ruta till vänster och rubriken centrerad (11,9 pt fet).
- **Sidfot:**
  - linje vid 284 mm,
  - till vänster *Serviceföretag · Anläggning*,
  - till höger *Sida i av n*, 7 pt, grå (89,110,123).
- **Kundfält:**
  - fältrutor med grå bakgrund (252,252,252) och kant (150,150,150),
  - etikett 7,4 pt fet i grått (82,82,82).
- **Statusfärger** (`COLORS`):

  | Status | RGB |
  |---|---|
  | ok | 35,131,84 |
  | action | 199,124,19 |
  | fail | 189,63,70 |
  | untested | 119,133,142 |

## Granskning: skillnader mellan de två motorerna

`reportDoc()` jämfördes rad för rad. Cirka 130 rader skiljer, i 15 områden. Granskningen gjordes på v2.4.579 och kontrollerades igen på v2.4.581: kundprotokollet ändrades inte i v2.4.580–581.

### Designskillnader (lager 1), som enligt regeln bör vara lika

| # | Område | `security.js` (SS, Brand) | `security-v335.js` (DA, Lås) |
|---|---|---|---|
| D1 | Fält i anmärkningsöversikten | `ORDER` | `ORDERNUMMER` |
| D2 | Ordernummer i protokollet | `Ao nummer:` och `AO nummer:` (två olika stavningar i samma motor) | `AO-nummer:` |
| D3 | Adressfält | `Postnummer / Postadress:` | `Postnummer / Ort:` |
| D4 | Teckenstorlek i översiktstabellen | 7,3 pt | 7,2 pt |
| D5 | Färg på signaturtext | 55,112,165 | 59,130,196 |
| D6 | Objektnamn i översikten | alla rader visas | högst 2 rader |
| D7 | Långa egna protokollnamn i sidhuvudet | krymps så att de ryms | krymps inte, och kan gå utanför |
| D8 | Kundstil (`revisionCustomerStyle`) | finns inte | bara för `automation`: fältetiketter i normal vikt och N/A som ett streck i stället för "-" |

D8 betyder att även protokollen på **samma** revisionssida ser olika ut. *Checklista revision dörrautomatik* har kundstil. *Egenkontroll dörrautomatik* och *Checklista revision lås* har inte det.

### Innehålls- och funktionsskillnader (lager 3–4), som ska vara kvar

| # | Område | Varför de är olika |
|---|---|---|
| F1 | AO-nummer hämtas från `project.aoNumber` för dörrautomatik och från `project.order` för övriga | Dörrautomatiken har ett eget AO-fält |
| F2 | Objektnamn *"Dörrautomatik N"* | Dörrautomatikens numrering |
| F3 | Detektorns ID-cell (`detectorIdentityCell`) finns bara i `security.js` | Detektorer finns bara i Säkerhetsservice |
| F4 | Ritad signatur (`RevisionSignature.drawPdf`) i revisionen | Revisionens signaturfunktion |
| F5 | Returlänk till ritningen alltid för `automation` | Revisionens arbetsflöde |
| F6 | Anmärkningstext: `1.5 text` för dörrautomatik, `1.5 – text` för övriga | Formatet ser ut som design. Det är oklart om skillnaden är avsiktlig, se förslag P6. |
| F7 | Filnamn vid sparande | Syns inte i PDF:en |

## Förslag till förbättringar (inte beställda)

Varje förslag görs **likadant i båda motorerna**. Det ändrar bara lager 1 och lämnar kontrollpunkter, protokoll och funktioner orörda.

| Förslag | Vad | Beslut som behövs |
|---|---|---|
| **P1** Enhetliga fältnamn (D1–D3) | En stavning för ordernummer (t.ex. `AO-nummer`, också i översikten) och en för adress (t.ex. `Postnummer / Ort`) | Vilka texter som ska gälla |
| **P2** Samma tabelltypografi (D4) | En teckenstorlek i översiktstabellen | 7,2 eller 7,3 pt |
| **P3** Samma signaturfärg (D5) | En blå nyans för signaturtext | Vilken nyans |
| **P4** Samma radbegränsning (D6) | Samma regel för långa objektnamn i båda motorerna | Max 2 rader eller alla rader |
| **P5** Sidhuvud som tål långa namn (D7) | Krympningen av långa protokollnamn även i revisionsmotorn | Inget särskilt beslut, det är en ren förbättring |
| **P6** En kundstil för alla protokoll (D8, F6) | Antingen får alla protokoll dörrautomatikens kundstil, eller så tas den bort. Även anmärkningsformatet görs lika. | **Viktigast:** vilken stil som är standard |
| **P7** Designtest före ändring | Ett test som skapar ett kundprotokoll per undermodul med testdata och kontrollerar lager 1 (fältnamn, rubriker, sidfot) och att varje protokoll bara har sina egna punkter (lager 3). Se [kvalitetskontroller.md](../../kvalitetskontroller.md) förslag D. | Godkännande av testet. Inget i appen ändras. |

**Rekommenderad ordning:**
1. P7, testet, som inte ändrar appen.
2. Beslut om P6, P1 och P4.
3. En beställd ändring med P1–P6, gjord likadant i båda motorerna.
4. Testerna körs på båda sidorna.

## Regler vid ändring

- En designändring görs i båda motorerna i samma PR. Kör `controlflow-pdf-roundtrip protocol-selection-pdf controlflow-protocol` och övriga tester för Kontrollflödet.
- Ändra aldrig `SYSTEMS`, protokollrubriker per typ eller funktioner (lager 3–4) som en del av en designändring.
- Stämplarna på ritningssidorna ritas av `controlflow-stamp-style-v549.js`, som gäller både skärm och PDF. Läs kommentaren överst i filen innan mått ändras.

## Utanför Kontrollflödet

SmartMatch (`smartmatch-protocol-templates.js`, `smartmatch-pdf-v36-71.js`) och den äldre startsidekoden (`reports.js`) har egna PDF-designer. De omfattas inte av den här regeln.
