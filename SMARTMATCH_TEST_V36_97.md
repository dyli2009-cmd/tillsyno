# SmartMatch TEST v36.97 – dörrkortskontrollerad GS-pil

Datum: 2026-10-11. Omfattning: endast **SmartMatch TEST → Verktyg → Koppla dörrautomatik**. Detta är ett nytt uttryckligt beslut som ersätter v36.92:s tidigare låsta regel för ren avståndskoppling. v36.92:s objektsökning, första placeringsruta, separata automatiska träffar, egenkontroller och SLR bevaras.

## Ändrat
- GS-förslag kräver nu att rätt GS:s **kopplade dörrkort** faktiskt bekräftar dörrautomatik. GS utan läsbart kort eller med uttryckligt annat innehåll väljs inte automatiskt.
- Rangordna i första hand exakt fullständigt automatik-ID, därefter ED100/ED250-kompatibelt ID (samma objekt och sista nummer), exakt maskintyp, kompatibel ED-familj, slutligen övrigt bekräftad automatik. Välj närmaste GS inom samma säkerhetsnivå och på samma ritningssida.
- ED100 kod 24 och ED250 kod 37 får vara kompatibla **endast för GS-kopplingen**; originalmaskinens kod ändras inte.
- Vid två lika starka och lika nära GS görs ingen automatisk gissning. Manuell koppling kvarstår.
- En fysisk automatik får högst **en synlig GS-pil**. Om äldre sparat projekt har dubbla automatikposter på samma märkning döljs den extra pilen; inga kontrollsvar, SLR-data eller dubbla historiska poster raderas.
- Uttryckliga manuella kopplingar och frånkopplingar bevaras. Vid manuell koppling som avviker från dörrkort krävs bekräftelse.
- Befintliga automatiska, obekräftade pilar får omräknas efter dörrkortsverifiering.
- Dörrkortsläsningen sker via det tidigare verifierade v36.82-stödet, utan att ändra den låsta regeln för dörrkortets ID-cell eller nya kända kortprofiler.

## Filer
- `smartmatch-da-v36-97-module.js` – återställd evidensbaserad GS-matchning, manuell verifiering och dubbla pilsäkringen.
- `project-workspace-smartmatch-v36-97.{html,js,css}` – separat TEST-snapshot; fortsatt protokollsexportmodul från v36.96.
- `project-workspace-smartmatch-test.html` – fast TEST-adress uppdateras till v36.97.
- `tests/smartmatch-da-doorcard-v36-97.cjs` – regression för kort utan automatik, fel modell, kompatibel ED-familj, två lika nära GS och dubletter (kör lokalt med `node tests/smartmatch-da-doorcard-v36-97.cjs`).

## Verifieringsstatus
Koden och versionsreferenserna har kontrollerats mot GitHub-filerna och tidigare v36.82/v36.92-logik. **Node-testet är tillagt men har inte körts i detta arbetsflöde. Ingen kund-PDF eller verklig iPhone/iPad-webbläsarsession har testats här.** Slutligt funktionsgodkännande kräver ett verkligt projekt där närmaste GS är fel och en annan GS har rätt dörrkort. Ingen ändring av Kontrollflöde, native iOS eller TestFlight.

## Beslutshistorik
Tidigare, v36.92: vilken GS som helst på samma sida kunde väljas enbart efter avstånd, även utan matchande dörrkort. Nytt, v36.97: använd dörrkort som första verifiering och välj närmaste **rätta** GS, en pil per fysisk automatik. Behåll äldre v36.96 som återgångsversion.
