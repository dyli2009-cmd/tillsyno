# Tunga ritningar i Kontrollflöde Dörrautomatik – utredning, plan och genomförande

Utredd 7 november 2026 (v2.4.579). Genomförd samma dag i **v2.4.580**, efter att ägaren skrev **"Lås upp Kontrollflödet"**. Kontrollflödet är åter LÅST.

## Vad som händer

Dörrautomatik i `all-in-one.html` skickas vidare till `controlflow-revision/all-in-one.html`, som kör `controlflow-revision/security-v335.js`. Kraschen på iPad beror med största sannolikhet på att fliken använder för mycket minne. Då stänger iOS den. Det är inte en enskild ritningsyta som är för stor.

Uppmätt i Chromium med syntetiska ritningar, iPad-emulering (DPR 2) och WebKits gränser för ritytor, före ändringen:

| Testritning | Storlek | Öppnas på | Minne vid öppning | Efter zoom eller Kundmall |
|---|---|---|---|---|
| A3, enkel | 0,03 MB | 1,3 s | 0,13 GB | 0,18 GB |
| A0, 300 000 linjer | 4,5 MB | 4,6 s | 0,5 GB | 0,7–0,8 GB |
| A0, 1 miljon linjer | 15 MB | 16,6 s | 1,1 GB | 1,6–1,9 GB |
| A0, foto 9000×6000 px | 24 MB | 8,8 s | 1,0 GB | 1,6 GB |
| 20 sidor A0 | 9 MB | 3,8 s | 0,2 GB | 0,6 GB efter alla sidor |
| 8 sidor A1, foton | 82 MB | 5,3 s | 0,8 GB | 0,9 GB |

En iPad-flik orkar ungefär 1–1,5 GB, äldre modeller mindre. Stora ritningar ligger alltså i det område där iOS stänger fliken. På äldre iOS utan OffscreenCanvas kan stora bilder också ge en **tom ritning**, och då visades ändå meddelandet "Ritningen är klar".

## Orsaker, viktigast först

1. **Ritningens innehåll ritas med pdf.js** och sparas i minnet för varje sida man har tittat på. `page.cleanup()` och `pdf.cleanup()` anropades aldrig. Varje zoomsteg ritade dessutom om sidan i högre upplösning.
2. **Dubbelarbete när ritningen öppnas:**
   - samma fil tolkades 6 gånger med pdf-lib;
   - 3 extra pdf.js-dokument öppnas och kastas;
   - texten på varje sida läses två gånger (i `legacy-door-import.js`);
   - 3–5 extra kopior av filen hölls i minnet.
3. **Kundmall** bygger en helt ny PDF och öppnar den som ett andra dokument medan det första ligger kvar. Dokumentet stängdes först nästa gång Kundmall öppnades. Det kostade +0,5–0,9 GB.
4. **Ett ritfel doldes:** meddelandet "Kunde inte visa sidan" skrevs över av "Ritningen är klar…".

## Genomfört i v2.4.580

Allt nedan finns i `controlflow-revision/security-v335.js` om inget annat anges.

**Appen känner av en tung ritning** när filen öppnas, utan att avkoda något. En ritning räknas som tung om något av följande gäller:

- filen är minst 30 MB;
- en bild i PDF:en är större än 16,7 miljoner pixlar (storleken läses ur bildens uppgifter i filen);
- första sidan är A1 eller större och filen har minst 2 MB innehåll per sida;
- en sida tar mer än 1,5 sekunder att rita (då byter appen till sparläge direkt efter).

**Sparläge:**

- Sidan ritas en gång med högst 3 miljoner pixlar. Zoom förstorar den bilden i stället för att rita om sidan.
- pdf.js-minnet frigörs efter varje ritning (`pdf.cleanup()`).
- Sidraden visar *Sida 1 / 1 · Sparläge*, och meddelandet börjar med *Stor ritning – visas i sparläge.*
- Raden får plats på telefon, iPad och dator.

**Övrigt:**

- När man byter sida frigörs den sida man lämnar, även för vanliga ritningar.
- **Ritfel visas.** Kan sidan inte ritas görs ett nytt försök i sparläge. Lyckas inte heller det visas ett tydligt fel i stället för "Ritningen är klar".
- **Mindre dubbelarbete vid öppning:**
  - de två kontrollerna av arbetsfiler delar en pdf-lib-tolkning, så det blir 5 tolkningar i stället för 6;
  - filen kopieras inte en extra gång när den sparas som källa till exporten.
- **Kundmall:**
  - i sparläge frigörs ritningens minne innan Kundmall byggs;
  - förhandsvisningen ritas med högst 4 miljoner pixlar;
  - Kundmalls PDF stängs när rutan stängs.
- **Lagring på enheten** (`offline-work-v2.js`): ritningen kopieras inte före lagring, och bara den senaste ritningen per område sparas. Tidigare sparades varje ritning man någon gång öppnat.

### Resultat

Mätt i Chromium med iPad-storlek (DPR 2), utan mätverktyg i sidan, A0 med 1 miljon linjer:

| Steg | Före (v2.4.579) | Efter (v2.4.580) |
|---|---|---|
| Öppna ritningen | 1,21 GB | 1,30 GB |
| Zooma 2×, 4×, 8× | 1,96 GB | 1,28 GB (ritas inte om) |
| Öppna Kundmall | 2,48 GB | 1,98 GB |
| Stäng och öppna Kundmall igen | 2,56 GB | 2,05 GB |

Mätt med iPad-emulering och WebKits gränser för ritytor, högsta minnet inklusive zoom:

| Testritning | Före | Efter | Öppnas på, före → efter |
|---|---|---|---|
| A3, enkel (vanligt läge) | 0,18 GB | 0,19 GB | 1,3 → 1,0 s |
| A0, 300 000 linjer | 0,67 GB | 0,59 GB | 4,6 → 3,5 s |
| A0, 1 miljon linjer | 1,60 GB | 1,11 GB | 16,6 → 9,4 s |
| A0, foto 9000×6000 px | 1,01 GB | 1,00 GB (0,62 GB efter öppning, före 0,83) | 8,8 → 5,4 s |
| 8 sidor A1, foton | 0,78 GB | 0,63 GB | 5,3 → 3,4 s |

**Det som inte ändras:** första gången en extremt tung sida ritas behöver pdf.js lika mycket minne som förut. Ett exempel är 1 miljon separata linjer, där toppen är cirka 1,1 GB. Det går inte att sänka utan att byta eller ändra pdf.js (punkt 5 nedan). Sparläget tar bort de extra topparna efteråt (zoom, Kundmall, sidbyten) och frigör minnet efter varje ritning. En så tung ritning kan alltså fortfarande vara på gränsen för en äldre iPad. Den bör delas upp i mindre PDF-filer, eller sparas om som bild-PDF med lägre upplösning.

Jag provade också att begränsa bildstorleken i pdf.js (`canvasMaxAreaInBytes`). Det höjde minnet vid öppning för fotot (från 0,72 till 0,99 GB), så det används inte. Jag provade även en gemensam pdf.js-worker för ritningen och Kundmall, men det gav ingen mätbar skillnad och togs bort.

### Får inte ändras – kontrollerat

- **Stämplarnas placering och storlek** sparas i PDF-punkter och 0–1-koordinater. De påverkas inte av ritytans upplösning.
- **Den exporterade arbets-PDF:en och Kundmallens ritning** är byte för byte desamma som i v2.4.579 med låst klocka. Det är kontrollerat med en vanlig A3-ritning och med A0 300 000 linjer i sparläge.
- **Importen av äldre arbetsfiler och protokoll** ändras inte. `legacy-door-import.js` och `revision-callout-profile-v4.js` är orörda. Kontrollflödets tester går igenom som förut, se nedan.

### Test

`tests/controlflow-heavy-drawing-v580.cjs` provar:

- bildavläsningen;
- att en vanlig ritning visas som förut;
- sparläge för en A0-sida med mycket linjer och för ett foto på 20 MP;
- att zoom inte ritar om och att minnet frigörs;
- att Kundmall blir mindre och stängs med rutan;
- nytt försök och synligt fel när en sida inte kan ritas;
- att bara en ritning per område sparas.

## Kvar, som egna beslut

- **Läsa sidornas text en gång** i `legacy-door-import.js`, och dela pdf.js-dokumentet mellan importkontrollerna. Det ger kortare öppningstid men påverkar inte toppen. Det rör importen av äldre protokoll, så det görs bara med eget test av äldre filer.
- **Prova en nyare pdf.js.** `vendor/` delas av alla moduler, så det kräver test av hela appen.
- **Säkerhetsservice** (`security.js`) har samma mönster men omfattades inte av beställningen.

## Underlag

Mätskripten och resultaten skapades i en tillfällig mapp och finns inte i repot. Mätningarna gjordes i Chromium på Linux med syntetiska ritningar. Ingen riktig iPad eller WebKit-build har använts, och riktiga CAD-ritningar med många objekt gör varje tolkning långsammare än i testerna. Prova gärna med en riktig ritning som har kraschat, men först när IT har godkänt att kundritningar används.
