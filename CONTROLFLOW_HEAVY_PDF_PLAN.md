# Tunga ritningar i Kontrollflöde Dörrautomatik – utredning och plan

7 november 2026, Tillsyno v2.4.579.

**Status:** utredd, inget ändrat. Kontrollflödet är LÅST. Ändringarna nedan görs först när ägaren skriver **"Lås upp Kontrollflödet"**.

## Vad som händer

Dörrautomatik i `all-in-one.html` skickas vidare till `controlflow-revision/all-in-one.html`, som kör `controlflow-revision/security-v335.js`. Kraschen på iPad beror med största sannolikhet på att fliken använder för mycket minne. Då stänger iOS den. Det är inte en enskild ritningsyta som är för stor.

Uppmätt i Chromium med syntetiska ritningar, iPad-emulering (DPR 2) och WebKits gränser för ritytor:

| Testritning | Storlek | Öppnas på | Minne vid öppning | Efter zoom eller Kundmall |
|---|---|---|---|---|
| A3, enkel | 0,03 MB | 1,3 s | 0,13 GB | 0,18 GB |
| A0, 300 000 linjer | 4,5 MB | 4,6 s | 0,5 GB | 0,7–0,8 GB |
| A0, 1 miljon linjer | 15 MB | 16,6 s | 1,1 GB | 1,6–1,9 GB |
| A0, foto 9000×6000 px | 24 MB | 8,8 s | 1,0 GB | 1,6 GB |
| 20 sidor A0 | 9 MB | 3,8 s | 0,2 GB | 0,6 GB efter alla sidor |
| 8 sidor A1, foton | 82 MB | 5,3 s | 0,8 GB | 0,9 GB |

En iPad-flik orkar ungefär 1–1,5 GB, äldre modeller mindre. Stora ritningar ligger alltså i det område där iOS stänger fliken. På äldre iOS utan OffscreenCanvas kan stora bilder också ge en **tom ritning**, och då visas ändå meddelandet "Ritningen är klar".

## Orsaker, viktigast först

1. **Ritningens innehåll ritas med pdf.js** och sparas i minnet för varje sida man har tittat på. `page.cleanup()` och `pdf.cleanup()` anropas aldrig.
2. **Dubbelarbete när ritningen öppnas:**
   - samma fil tolkas 6 gånger med pdf-lib;
   - 3 extra pdf.js-dokument öppnas och kastas;
   - texten på varje sida läses två gånger (i `legacy-door-import.js`);
   - 3–5 extra kopior av filen hålls i minnet.
3. **Kundmall** bygger en helt ny PDF och öppnar den som ett andra dokument medan det första ligger kvar. Det kostar +0,5–0,9 GB.
4. **Ett ritfel döljs:** meddelandet från `security-v335.js:553` skrivs över av "Ritningen är klar…" (rad 858).

## Plan (i den här ordningen)

1. **Tolka filen en gång.**
   - Filer: `security-v335.js:848-861` (och samma mönster i `security.js:895-906`).
   - Gör en pdf-lib-tolkning och öppna ett pdf.js-dokument. Dela båda med alla importkontroller: `revision-callout-profile-v4.js`, `legacy-door-import.js` och `inspectLegacySecurityLinkedPdf`.
   - Läs varje sidas text bara en gång.
   - Ta bort den överflödiga kopian (rad 851).
   - Spara ritningen som Blob i `offline-work-v2.js`, och rensa gamla ritningar ur lagringen.
   - Ungefär 60–120 rader i 4–5 filer.
2. **Frigör minne.**
   - Anropa `page.cleanup()` efter ritning och vid sidbyte.
   - Anropa `pdf.cleanup()` innan Kundmall byggs, och stäng Kundmalls dokument när rutan stängs.
   - Ungefär 20–40 rader.
3. **"Stor ritning – visas i sparläge".**
   - Appen känner av en tung PDF när filen öppnas, genom att läsa uppgifter ur PDF:en utan att avkoda något. Kännetecken:
     - filen är större än ca 30 MB;
     - en sida är A0 eller större och har mycket innehåll;
     - en bild är större än 16,7 miljoner pixlar;
     - första ritningen tar mer än ca 1,5 sekunder.
   - I sparläge ritas sidan med lägre upplösning, högst 2,5–4 miljoner pixlar, en gång i stället för vid varje zoomsteg. Minnet frigörs efter varje ritning, och Kundmall begränsas på samma sätt.
   - En kort rad visar *Stor ritning – visas i sparläge*.
   - Ungefär 80–150 rader.
4. **Visa ritfel** i stället för att skriva över dem, och försök igen i sparläge. Ungefär 10 rader.
5. **Senare, som eget beslut:** prova en nyare pdf.js. `vendor/` delas av alla moduler.

## Får inte ändras

- **Stämplarnas placering och storlek.** De sparas i PDF-punkter respektive 0–1-koordinater, oberoende av ritytans upplösning.
- **Den exporterade arbets-PDF:en** ska vara byte för byte densamma, bortsett från exporttiden. Den byggs från `sourceBytes`, som inte ska röras.
- **Importen av äldre arbetsfiler och protokoll** ska ge exakt samma resultat. Kör Kontrollflödets tester (`node tools/run-tests.mjs controlflow security`) före och efter.

## Underlag

Mätskripten och resultaten skapades i en tillfällig mapp under utredningen och finns inte i repot. Mätningarna gjordes i Chromium på Linux med syntetiska ritningar. Ingen riktig iPad eller WebKit-build har använts, och riktiga CAD-ritningar med många objekt gör varje tolkning långsammare än i testerna.
