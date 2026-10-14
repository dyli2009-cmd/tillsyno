# CE-märkning TEST 5 – sensortyp vid 4.6.1 och 4.6.2

Beställt 14 oktober 2026: val för 4SAFE, Flatscan och Flatscan 3D vid heltäckande säkerhetssensor under hög risk, med möjlighet att skriva egen text.

- När heltäckande sensor under hög risk markeras på 4.6.1 eller 4.6.2 öppnas en kompakt väljare med de tre snabbvalen samt ett fält för egen text. Ett snabbval fyller Typ-rutan och stänger väljaren. Avbryt lämnar tidigare typtext orörd.
- Två små genvägar ovanför PDF-arbetsytan öppnar samma väljare för respektive punkt. Typ-rutorna i PDF:en kan fortfarande redigeras direkt.
- 4.6.1 och 4.6.2 lagras separat i mallens verkliga fält `4.6.1 text 1` och `4.6.2 text 1`. Fältnamn, sidnummer och placering har lästs ur användarens femsidiga riskanalysmall. Mallfilen ändras inte.
- Befintlig glasstandard/dörrundantag används. Fyll i ändrar standarden för samma glasval; Bara denna dörr ändrar endast aktuell dörr. Sensorval väljer inte risknivå, kontrollerar inget dokument och signerar inget.
- TEST 4:s PDF-zoom och skydd mot fokuseringszoom behålls. Väljaren ligger utanför PDF:ens skalning och har 16 px inmatning.
- TEST 5 har egna filer/databas. Lokal återöppning tar först en kopia av TEST 4, därefter TEST 3/TEST 2. Projekt-PDF från TEST 2–4 kan öppnas. Nya projekt skrivs som TEST 5. Den fasta testsidan är en full kopia av TEST 5; TEST 4 bevaras.

Verifiering: `tests/ce-markning-v5.cjs` kör faktisk sensorväljare, tre snabbval, egen text, separat öppnings-/stängningstyp, glasstandard, isolerat dörrundantag, skydd mot gammalt redigeringsläge, text i genererade verkliga PDF-formulär och tre spara/återöppna-rundor. TEST 4-import och befintliga projektkopplingar kontrolleras. `tests/ce-markning-v5-zoom.cjs` kontrollerar tidigare PDF-zoomfunktion. JavaScript-syntax kontrolleras. Ingen fysisk iPhone-test har körts.

Inga ändringar i ordinarie SmartMatch, SLR, inloggning, Kontrollflöde eller iOS/TestFlight. Inga privata PDF-mallar publiceras.
