# CE-märkning TEST 4 – zoom endast i PDF-arbetsytan

Beställt 14 oktober 2026: zoom ska bara påverka PDF:en, inte menyerna runtom. När användaren trycker i ett formulärfält och skriver ska zoomen inte ändras automatiskt.

- Fyll i/Bara denna dörr har en egen begränsad och rullbar PDF-arbetsyta. Tvåfingerszoom och +/− ändrar PDF-sidorna. Menyer, dokumentverktyg och dörrnavigation förstoras inte. Panorering och zoomens fokuspunkt använder arbetsytans scroll, inte hela dokumentdialogens scroll.
- Visa PDF har separat zoom för dokumentet med två fingrar och +/−. Även produktlista och CE-bild använder denna begränsade visningsyta.
- Native sidzoom stoppas på CE-testsidan med touch-action, icke-passiva tvåfingers-/gesture-hanterare och viewportens maximum-scale. Vanlig enfingersrullning och skrivning påverkas inte av gestspärren.
- Text-, flerrads-, datum- och valfält i PDF:en har minst 16 px beräknad teckenstorlek och skalas till rätt PDF-koordinater. Detta hindrar iPhones vanliga fokuseringszoom utan att göra texten eller fältrutorna större i dokumentet. Fokusering/skrivning ändrar inte den manuellt valda PDF-zoomen.
- TEST 4 har egna versionsfiler och lokal databas. Befintligt TEST 3-projekt tas in som en kopia på samma enhet, med TEST 2 som reserv. Projekt-PDF från TEST 2 och TEST 3 accepteras, nya projekt skrivs som TEST 4. Dörrar, gemensamma svar, egna undantag, signaturer och mallar följer med.
- Fast testadress är en full kopia av TEST 4. TEST 3 bevaras. Inga ändringar i ordinarie SmartMatch, SLR, inloggning, Kontrollflöde eller iOS/TestFlight.

Verifiering: JavaScript-syntax och de befintliga verkliga PDF-/spara-/återöppningstesterna i `tests/ce-markning-v4.cjs`. `tests/ce-markning-v4-zoom.cjs` kör faktisk zoom-/panorerings-/fältkod och kontrollerar PDF-geometri, beräknad fältfont, native gestspärr, enfingershantering och att förhandsvisningens rubrik inte skalas. Faktisk Safari med tangentbord behöver provas på iPhone; inget automatiserat test på fysisk iPhone har körts.
