# Tester

Testerna i den här mappen provar appen automatiskt: inloggning och behörighet, administrationen, färgteman, offlinecachen, Kontrollflödets protokoll och PDF-export, CE-märkning, Ritningsverktyg, Projektering och SmartMatch. De flesta öppnar sidorna i Chromium med Playwright och använder bara syntetiska testdata. Inga kundritningar finns i repot.

## Köra alla tester

```
node tools/run-tests.mjs --modules <mapp>/node_modules
```

`tools/run-tests.mjs` kör varje testfil för sig och skriver PASS, FAIL, SKIP eller KNOWN per test, och en summering sist. Flaggor:

- `--jobs 3` anger hur många tester som körs samtidigt.
- `--timeout 300` är sekunder per test.
- `--logs <mapp>` sparar hela utskriften från varje test.
- `--report <fil.json>` skriver en sammanställning.
- Ett eller flera namn kör bara de testerna. Ett namn som slutar på `.cjs` väljer exakt den filen.

Hjälpprogram som testerna behöver (installeras utanför repot):

```
npm install --prefix <mapp> @napi-rs/canvas pdf-lib@1.17.1 pdfjs-dist@4.10.38
ln -s "$(npm root -g)/playwright" <mapp>/node_modules/playwright
pip install --target <mapp>/python pymupdf     # endast för drawing-ocr-pdf
```

Skriptet sätter själv sökvägen till Chromium, och `PDFJS_DIR` pekar på appens egen `vendor/`. `tools/test-preload.cjs` laddas i varje test och gör två saker:

- Tester som anger en webbläsarsökväg som inte finns på datorn får den riktiga sökvägen.
- Kodlåset för moduler öppnas, eftersom det behöver Supabase och testerna saknar server.

Kodlåset öppnas med ett skript i sidan, inte genom att avlyssna nätverket, eftersom avlyssning stänger av service workern i offlinetesterna. Sätt `TILLSYNO_TEST_REAL_CODE_GATE=1` för att behålla det riktiga kodlåset.

## SKIP och kända fel

- **SKIP:** testet behöver något som inte finns i repot, till exempel en riktig ritning som anges med en miljövariabel. Testet hoppar då över sig självt.
- **KNOWN:** felet finns i [`known-failures.json`](known-failures.json), med orsak. Det gäller fel som väntar på ett beslut eller på en egen rättning. De fäller inte körningen. Går ett sådant test igenom igen, visas det som FIXED och kan tas bort ur listan.

## Städning 7 november 2026

När repot rensades från gamla versioner och kundritningar kunde 249 tester inte längre köras:

- 237 tester provade gamla testsidor för SmartMatch och Projektflödet, till exempel `smartmatch-read-test-v9-29.html` och `project-workspace-smartmatch-v14.html`.
- 9 tester provade den gamla fristående Dörrservice-appen på `index.html`, som nu bara skickar vidare till startsidan `app.html`, och en offlineetikett som togs bort i v2.4.282.
- 2 tester provade ett äldre avläsningsfönster i SmartMatch (`#rtDialog`) som inte längre finns.
- 1 test jämförde en borttagen testkopia av revisionsflödet med repots gamla historik.

Dessa tester togs bort.

Övriga tester har uppdaterats där appen har ändrats sedan de skrevs, till exempel:

- startsidan är nu `app.html`;
- utloggning går via *Rensa enhetens data*;
- stämpeltexterna är större;
- tidsöversikten använder fler hjälpfunktioner.

Chromium ersätter inte kontroll på riktig iPhone eller iPad med Safari.
