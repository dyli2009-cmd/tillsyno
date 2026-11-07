# Kontrollflöde – gemensam PDF-design

**Status: LÅST**, som resten av Kontrollflödet.

## Regel (användarbeslut 7 november 2026)

Alla checklistor och kundprotokoll i Dörrautomatik, Lås, Säkerhetsservice och Brand ska ha **samma visuella design**:
- sidhuvud och sidfot,
- rubriker, typografi och färger,
- kundinformationens placering,
- tabellernas utseende,
- sidstruktur och format.

**Innehållet är olika per undermodul**: kontrollpunkter, felval, rubriktexter och bedömningsregler.

Vi skiljer på fyra lager:

| Lager | Gemensamt eller separat | Var i koden i dag |
|---|---|---|
| 1. PDF-design | Gemensam | `reportDoc()` i motorn: `summaryHeader`, `field`, `protocolTop`, `checkHeader`, `cell`, `issueTableHeader` |
| 2. PDF-generering och export | Gemensam där det passar | `buildSecurityDrawingPdf`, `exportPdf`, stämplar via `controlflow-stamp-style-v549.js` (`ControlflowStampStyle.drawPdf`) |
| 3. Kontrollpunkter och checklistor | Separata | `SYSTEMS.<typ>.checks` och `.faults` |
| 4. Arbetsflöde och bedömning | Separata | per typ i motorn, t.ex. `isDoorAutomationItem`, detektorernas identitetsfält, `lock_revision` |

En ändring i lager 1 ska slå igenom i alla fyra undermodulerna utan att lager 3 och 4 ändras.

## Nuvarande design (avläst i `security.js`)

- **Format:**
  - A4 stående, jsPDF i millimeter.
  - Vänstermarginal 12 mm, innehållsbredd 186 mm, nedre gräns 277 mm.
  - Typsnitt Helvetica.
- **Sidhuvud:** ram 186 × 18 mm, med logotypen i en 58 mm bred ruta till vänster och rubriken centrerad till höger. Rubrikerna är t.ex. *ANMÄRKNINGSÖVERSIKT* och *KUNDRAPPORT*.
- **Kundinformation:** grå fältrutor, 13 mm höga:
  - ANLÄGGNING, ANLÄGGNINGSNUMMER, BESTÄLLARE,
  - ORDER (i revisionskopian: ORDERNUMMER),
  - DATUM, NÄSTA PROVNING, SERVICEFÖRETAG.
- **Statusfärger** (`COLORS`, används både på ritningen och i protokollet):

  | Status | RGB |
  |---|---|
  | ok | 35,131,84 |
  | action | 199,124,19 |
  | fail | 189,63,70 |
  | untested | 119,133,142 |

- **Protokollrubriker** kommer från en tabell med versala rubriker per typ, t.ex. *CHECKLISTA REVISION DÖRRAUTOMATIK* och *DETEKTORPROTOKOLL*. Den ligger nära `normalizeSecurityCheckEdits` i motorn.

## Avvikelse som behöver beslut

Designen finns i **två kopior** som redan har börjat skilja sig åt:

| | Huvudsidan, `security.js` | Revisionssidan, `controlflow-revision/security-v335.js` |
|---|---|---|
| Används av | Säkerhetsservice, Brand | Dörrautomatik, Lås |
| Ordernummerfält | `ORDER` | `ORDERNUMMER` |
| Objektnamn i tabellen | full identitet | max 2 rader, "Dörrautomatik N" |
| Detektorns ID-cell | finns (`detectorIdentityCell`) | finns inte |
| Typografi | 7,3 pt i en tabell | 7,2 pt, och `revisionCustomerStyle` för normal/fet |

Totalt skiljer ca 130 rader mellan de två `reportDoc()`. Vissa skillnader är avsiktliga, eftersom de beror på innehållet (lager 3–4). Andra är bara design (lager 1).

**Förslag, inte beställt och kräver upplåsning:** flytta lager 1 till en gemensam fil, t.ex. `controlflow-pdf-design.js`, som båda motorerna anropar. Innehållsberoende delar skickas in som parametrar. Steg:

1. Ta fram ett test som skapar ett kundprotokoll per undermodul med testdata och jämför sidstrukturen och texterna. Det finns delvis redan i `controlflow-pdf-roundtrip-v549` och `protocol-selection-pdf-v556`.
2. Användaren beslutar vilken av varianterna i tabellen ovan som ska gälla.
3. Bryt ut designen, så att testet visar samma resultat som före utbrytningen.

## Regler vid ändring

- Ändras designen: ändra båda kopiorna lika, tills de har slagits ihop. Kör PDF-testerna för båda sidorna.
- Ändra aldrig `SYSTEMS` som en del av en designändring.
- Ritningssidornas stämplar ritas av `controlflow-stamp-style-v549.js`, som gäller både skärm och PDF. Läs kommentaren överst i filen innan du ändrar mått.
