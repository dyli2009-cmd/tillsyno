# Ritningsverktyg v2.4.362 – dörrkort med samma rubrik

Funktionen **Sortera dörrkort efter rubrik** grupperar PDF-sidor efter koden i ett markerat rubrikfält. Exempel: tre kort med **Beslagskod GS23** visas tillsammans även om deras dörrlittera, våning, produkter eller höger/vänster skiljer sig. Endast det valda rubrikfältet styr grupperingen. Funktionerna i SmartMatch och Avläsning TEST ingår inte i ändringen.

## Så gör du

1. Öppna PDF-filen i **Ritningsverktyg** och visa ett dörrkort.
2. Välj **Verktyg → Sortera dörrkort efter rubrik → Markera rubrik / beslagskod**. Verktygspanelen stängs medan du drar en ruta runt rubriken högst upp på tabellen.
3. Välj **Hitta samma rubriker**. **Snabb sökning – text först** använder vanlig PDF-text och lokal bildläsning av markeringen vid behov. **Endast PDF-text – utan bildläsning** startar ingen OCR.
4. Granska grupperna. Den första sidan i varje grupp är förvald att behållas; välj en annan med **Behåll sida**. Kryssade extrasidor föreslås tas bort. Avmarkera de extra exemplar du också vill behålla. **Visa sida** stänger panelen och visar originalsidans förhandsvisning.
5. Tryck **Ta bort valda extrasidor**. Ändringen görs i arbetskopians befintliga sidval och kan ångras/göras om som ett enda steg.
6. Välj **Spara PDF**. Förlustfri kvalitet är fortfarande standard och bevarar innehållet på sidorna som är kvar. Den uppladdade originalfilen skrivs inte över.

Avläsningen tar inte bort sidor. Tomma, olästa, osäkra och unika rubriker väljs inte som extrasidor. Minst en sida i varje avläst grupp skyddas från gruppens borttagning. Redan manuellt bortvalda sidor ingår inte i en ny sökning.

## Kodtolkning och stora filer

Grupperingen använder samma markerade relativa plats på sidans synliga yta. Om exemplet innehåller en känd rubrik, till exempel **Beslagskod**, krävs samma rubrik på övriga sidor. Då blandas en annan titel på en ritningssida inte in. En markering runt enbart koden stöds också.

Koderna är inte begränsade till GS. Exempelvis WC140C, 140C och märkta bokstavskoder kan läsas. Versaler och gemener grupperas tillsammans. Ledande nollor och skiljetecken bevaras: GS23, GS230 och GS023 är olika grupper; A-12 och A12 hålls isär. OCR-delningar som **GS 23** och **140 C** kan sättas ihop i kodkontext. Rubrik utan värde och flera olika koder i samma fält behandlas som olästa. OCR med confidence under 75 föreslår ingen gruppering.

Sidorna behandlas en i taget utan miniatyrbilder av alla kort. PDF.js behöver hämta sidans textström för textextraktion; bara orden i markeringen används. Bildläsningen använder en tillfällig bild av det markerade fältet, med högst cirka 1,2 megapixel och 4096 pixlar per sida. Dessa bilder frigörs efter läsning. Avbryt fungerar även under väntande PDF-text eller OCR och lämnar inga delresultat som kan tas bort.

Borttagningen gäller hela PDF-sidor. Funktionen jämför inte arbetsinnehåll, dörrhängning eller andra fält. Om flera olika kort delar samma PDF-sida behöver användaren behålla den sidan eller först hantera sidlayouten separat. Kort med rubriker på andra platser kan kräva ett nytt exempel och en ny markering.

Den befintliga filöppningen och PDF-exporten arbetar fortfarande med hela PDF-filen i webbläsarens minne. En 500 MB-fil har inte verifierats här; dator rekommenderas för så stora underlag. Storleksminskningen beror på vilka PDF-resurser som bara används av de borttagna sidorna. Inga garantier om viss storlek eller körtid ges.

## Verifierat 2026-10-16

- `node tests/drawing-card-groups.cjs` passerar: markerade textområden, textfragment, rotation och förskjutna sidboxar, lärd rubrik, separata koder, OCR-delningar, låg confidence, sekventiell läsning, sidfel, progress och avbrott.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/drawing-card-groups-browser.cjs` passerar i dator-, iPhone- och iPad-vy med riktiga mus-/pekhändelser. Genererad PDF har tre GS23-kort med olika dörrlittera, två GS24-kort, WC140C, GS230, en ritningssida och en tom sida. Granskning och val tar bara bort de godkända extrasidorna. Ångra/gör om återställer hela borttagningen. Exporten har identiska kvarvarande innehållsströmmar, sidmått och länkannotation.
- Samma test med `DRAWING_GROUP_DEVICE=desktop DRAWING_GROUP_REAL_OCR=1` passerar med verklig lokal Tesseract. Bildrubriken GS23 grupperas med de två sökbara GS23-korten. OCR får bara markerade utsnitt, cirka 2011 × 260 pixlar i testunderlaget.
- Efter korrigering av OCR-avbrytningen passerar datorregression med ett OCR-anrop som aldrig avslutas: Avbryt stänger dialogen och låser upp verktyget inom två sekunder. Inga sidor eller delresultat ändras, och efterföljande textsökning fungerar.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/drawing-export-v360.cjs` passerar i samtliga tre vyer: förlustfri export, vektortext, kommentarer, formulär, bilagor, signaturregler, beskärning, bildimport, PDF-delar, undo/redo och visning. Endast versionsförväntningen i detta befintliga test har uppdaterats.

Nya läsar- och UI-filer finns i offlinecachens kärnlista. Alla OCR-resurser levereras lokalt sedan tidigare. Inga nätbaserade OCR-tjänster används. Inloggnings-, licens- och Kontrollflödesregler ändras inte. Ingen native-kopia finns i denna checkout; fysisk Safari/iPad och en ny TestFlight-build har inte verifierats.
