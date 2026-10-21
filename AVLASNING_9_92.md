# Avläsning 9.92 – använd exempelstämpeln även i manuell sökning

Användaren kunde hitta sina stämplar genom **Positioner → Koppla → markera en exempelstämpel → Sök på ritningen**, men fick färre träffar i Avläsning. Båda anropar samma `SmartMatchReadMatcher.scan`. Positioner skickar med exempelstämpelns ruta och inlärda bakgrund/form; Avläsnings manuella sökning i 9.91 skickade endast beteckningen och sökläget.

## Ändring

- I kortets **Sök / koppla manuellt** blir en markerad hel stämpel ett sökexempel. Exemplet behålls efter **Koppla bara markeringen**. **Sök på alla ritningssidor** bekräftar hela beteckningen och lär bakgrund/form med samma hjälpfunktioner som Positioner. Sökningen omfattar alla ritningssidor, även på iPad; dörrkortssidor utesluts. En oklar bakgrund/form stoppar exempelsökningen med ett tydligt val att markera om eller söka utan exempel. **Sök utan exempelstämpel** återgår till sökning på enbart beteckningen.
- En ny markering ogiltigförklarar gamla sökresultat. Exemplet binds till dokument, kort-ID, beteckning och kortsida och rensas när dialogen stängs eller användaren lämnar kopplingsläget. Den manuella markeringen och sökresultaten kopplas fortfarande först efter användarens val. Tidigare länkar, avmarkeringar, borttagna positioner, konfliktskydd och atomisk koppling återanvänds.
- Färgstämpelns sammanhängande bakgrund hittas i en enda begränsad sidbild. Tidigare 640-pixelsrutor med 160 pixels överlapp tappade stämplar som var bredare än överlappet vid vissa rutgränser. Sidbilden renderas en gång; färgbudgeten begränsas till 4 miljoner bildpunkter på dator och 1,2 miljoner på iOS.
- I bildläget läses en färgstämpel som ett högupplöst block även när det finns ofullständig eller ovidkommande PDF-text i den. Tidigare hindrade varje sådan textbit detta OCR-försök. Hela beteckningen och befintlig konfidensgräns krävs fortfarande; DVEL1 och DVEI får inte bli DVEL.
- Snabbsökning förblir utan OCR. Bildtext kräver det uttryckliga valet **Sök även i bilder**. Befintlig sökning, enkel markering och produktavläsning behåller sina roller.

Nya versionsfiler 9.92 bevarar 9.91. Startsidelänken, den fasta testadressen och offlinecachen följer 9.92 (app 2.4.462). Läsmallar skrivs under en separat versionsnyckel och tidigare mallar kan läsas som utgångspunkt. Main- och review-modulerna från 9.90 samt Positioner-verktyget återanvänds.

## Verifiering

- `node tests/smartmatch-read-stamp-ocr-v9-92.cjs`: riktig PDF.js-rendering och installerad Tesseract, utan simulerade OCR-svar. Tre DVEL-stämplar hittas trots blandade text/bildlager och rutgränser; DVEL1/DVEI utesluts. Ett gult exempel ger exakt de två gula DVEL-stämplarna och utesluter blå stämpel och vanlig text. Snabbläget startar ingen OCR. Kräver `tesseract` med engelska språkdata och befintliga testbibliotek via `CODEX_PRIMARY_RUNTIME_NODE_MODULES`.
- `node tests/smartmatch-read-example-browser-v9-92.cjs`: riktig 9.92-sida via fasta testadressen i Chromium, dator med mus och iPad-profil med pekgester. Öppna kortets manuella koppling, markera, koppla första positionen, sök med bevarat exempel på två ritningssidor, välj den nya positionen och öppna rätt dörrkort. Redan kopplad position dubbleras inte; blå stämpel, vanlig text och suffix utesluts. Inloggning/PIN simuleras som redan verifierade i testet; produktionskoden för behörighet ändras inte.
- `node tests/smartmatch-read-bulk-v9-92.cjs`: exempelöverföring, full sidomfattning, ogiltigförklaring vid ny markering, återgång utan exempel, valda delmängder, atomisk validering, dubbletter, konflikter, avmarkering, sparande/återställning av läsdata samt fel/avbrott utan ändrade länkar.
- Befintliga tester för färgade etiketter med flera textrader, rasteråteranvändning och resursstädning, manuell koppling och handoff kördes med den nya läsaren/matcharen. Syntax, resurser och diffkontroll verifierades.

Användarens ritnings-PDF finns inte i underlaget. Testerna visar rättningen på genererade projekt, inte att varje stämpel i den faktiska filen nu hittas. Fysisk Safari/iPad och verklig inloggning/PIN ingår inte i verifieringen. Ingen ny TestFlight-build eller produktionspublicering ingår.
