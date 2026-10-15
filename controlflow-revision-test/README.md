# Checklista revision dörrautomatik – TEST v1

Separat grundkopia av Kontrollflödet från Tillsyno 2.4.308, commit `60b07179296dcf095d2c0bc0603b6af59fc13dc7`.

Öppna `all-in-one.html`. Följ samma väg som i ordinarie app: Dörrautomatik / Lås → Checklista revision dörrautomatik → Fortsätt till ritning → Öppna PDF. Ritning, Dörrar, Protokoll och Projekt, alla 18 kontrollpunkter samt kundmall och PDF-export är kopierade från originalet.

## Avgränsning

- Ordinarie Kontrollflöde, SmartMatch, CE-märkning och iOS/TestFlight ändras inte.
- `legacy-door-import.js` är en oförändrad kopia. P/GoTo väljer rätt protokoll; kopplad Bluebeam-pils spets och textruta behåller sina positioner. Inga nya tolkningsregler är införda.
- Egna runtime- och designfiler, egna localStorage-nycklar, egna IndexedDB-databaser och egen service worker med scope enbart i denna mapp.
- Ordinarie inloggning och modulbehörighet återanvänds oförändrat via `../auth/client.js` och `../auth/guard.js`. Sidnamnet `all-in-one.html` gör att befintlig kontroll av modulen `control` gäller även här.
- Inbäddat arbets-PDF-format är oförändrat. En uttryckligen öppnad arbets-PDF kan därför användas i båda versionerna. Lokal lagring delas inte.
- Hem, Ritningsverktyg och CE-märkning länkar tillbaka till sina ordinarie sidor. De ingår inte i testkopian.

`snapshot.json` dokumenterar ursprung, filhashar och samtliga tillåtna kopieringsändringar. Kontrollera med `node tests/controlflow-revision-copy-v1.cjs`. Webbläsartestet är `node tests/controlflow-revision-browser-v1.cjs` (Playwright och Chromium krävs; ange `CHROMIUM_PATH` vid behov).

Nästa steg är att lägga till ett separat lässätt utifrån användarens faktiska service-PDF. Befintlig import ska förbli referens och bevaras. Verifiera rätt dörr, pilspets, etikett, beställare och utförande företag innan nya importer godkänns. Ingen automatisk ersättning av ordinarie app är beställd.

## Verifierat för TEST v1

Riktiga webbläsartester jämförde originalet och kopian med samma äldre service-PDF: avlägsen exakt ID-match prioriterades framför närmaste annat ID; pilspets och etikett behöll samma koordinater. Beställare och utförande företag importerades, alla 18 kontrollpunkter följde med, PDF exporterades via Spara PDF och återöppnades. Fortsätt behöll kontrollsvar; Ny service nollställde svar och behöll projekt/dörrpositioner. Telefonbredd 390 px och surfplattebredd 820 px kontrollerades. Behörighet utan Kontrollflöde nekades. Separat service worker verifierades med offlineåterladdning och PDF-import utan att andra cachedata raderades. Inloggningens nätverkssvar var simulerade i testet. Fysisk iPhone/iPad är inte testad.
