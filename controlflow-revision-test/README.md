# Checklista revision dörrautomatik – TEST v5

Aktiv separat testversion med kompakt tvådelad projektvy. Serviceföretag, signatur och logga ligger till vänster; anläggning och beställare ligger till höger. På telefon staplas Service och Projekt. Se [TEST v5](PROJECT_LAYOUT_V5.md). Föregående [TEST v4](v4/all-in-one.html) är bevarad. Projektsignatur, större exporterade automatiketiketter och objektnummer från ritningen behålls. Se [TEST v4](PROJECT_SIGNATURE_V4.md). Föregående [TEST v3](v3/all-in-one.html) finns kvar. Historisk kundmallsändring:  [Kundmall TEST v3](CUSTOMER_TEMPLATE_V3.md). Föregående [TEST v2](v2/all-in-one.html) finns kvar. TEST v4 läser anläggningsnumret från ritningsmärkningens objektprefix; matchning och pilkoordinater är bevarade. Grundkopia: Tillsyno 2.4.308, commit `60b07179296dcf095d2c0bc0603b6af59fc13dc7`. [Profil och verifiering för TEST v2](IMPORT_PROFILE_V2.md). Föregående [TEST v1](v1/all-in-one.html) och dess runtime-filer är bevarade.

Öppna `all-in-one.html`. Följ samma väg som i ordinarie app: Dörrautomatik / Lås → Checklista revision dörrautomatik → Fortsätt till ritning → Öppna PDF. Ritning, Dörrar, Protokoll och Projekt, alla 18 kontrollpunkter samt kundmall och PDF-export är kopierade från originalet.

## Låst befintligt arbetssätt

Användaren låste den befintliga logiken 2026-10-15. Se [låsta importregler](IMPORT_RULES_LOCK.md). Nya arbetssätt utvecklas som separata läsprofiler. Arbetssätt 1 och dess gamla runtime-filer är oförändrade. TEST v2 har separata versionsmärkta filer och egen lokal lagring.

## Avgränsning

- Ordinarie Kontrollflöde, SmartMatch, CE-märkning och iOS/TestFlight ändras inte.
- `legacy-door-import.js` är en oförändrad kopia. P/GoTo väljer rätt protokoll; kopplad Bluebeam-pils spets och textruta behåller sina positioner. Inga nya tolkningsregler är införda.
- Egna runtime- och designfiler, egna localStorage-nycklar, egna IndexedDB-databaser och egen service worker med scope enbart i denna mapp.
- Ordinarie inloggning och modulbehörighet återanvänds oförändrat via `../auth/client.js` och `../auth/guard.js`. Sidnamnet `all-in-one.html` gör att befintlig kontroll av modulen `control` gäller även här.
- Inbäddat arbets-PDF-format är oförändrat. En uttryckligen öppnad arbets-PDF kan därför användas i båda versionerna. Lokal lagring delas inte.
- Hem, Ritningsverktyg och CE-märkning länkar tillbaka till sina ordinarie sidor. De ingår inte i testkopian.

`snapshot.json` dokumenterar ursprung, filhashar och samtliga tillåtna kopieringsändringar. Kontrollera med `node tests/controlflow-revision-copy-v1.cjs`. Webbläsartestet är `node tests/controlflow-revision-browser-v1.cjs` (Playwright och Chromium krävs; ange `CHROMIUM_PATH` vid behov).

TEST v2 kompletterar den låsta importen genom en separat läsprofil. Fullständigt ID krävs för automatisk koppling. Avvikelser och protokoll utan koppling följer med i arbets-PDF och lokal lagring. Ordinarie app ersätts inte.

## Verifierat för TEST v1

Riktiga webbläsartester jämförde originalet och kopian med samma äldre service-PDF: avlägsen exakt ID-match prioriterades framför närmaste annat ID; pilspets och etikett behöll samma koordinater. Beställare och utförande företag importerades, alla 18 kontrollpunkter följde med, PDF exporterades via Spara PDF och återöppnades. Fortsätt behöll kontrollsvar; Ny service nollställde svar och behöll projekt/dörrpositioner. Telefonbredd 390 px och surfplattebredd 820 px kontrollerades. Behörighet utan Kontrollflöde nekades. Separat service worker verifierades med offlineåterladdning och PDF-import utan att andra cachedata raderades. Inloggningens nätverkssvar var simulerade i testet. Fysisk iPhone/iPad är inte testad.
