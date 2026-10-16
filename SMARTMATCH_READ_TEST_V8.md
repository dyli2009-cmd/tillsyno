# SmartMatch – Avläsning TEST 8

Fast testsida: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v8.html`. Intern version `36.142-READ-TEST`.

## Zooma och markera

1. Öppna avläsningsguiden och välj **Markera kod** eller **Markera tabell / arbetslista**.
2. På dator: håll muspekaren över koden och rulla mushjulet för att zooma in eller ut. På iPad och andra pekskärmar: för två fingrar isär eller ihop i förhandsvisningen.
3. Dra en ruta med musen eller ett finger för att markera området. Två fingrar används för zoom och flyttning och skapar ingen markeringsruta.
4. Välj **Flytta vyn** för att dra runt det inzoomade underlaget med musen eller ett finger. Välj sedan kod- eller tabellknappen för att markera igen.

Plus- och minusknapparna finns kvar. Zoomnivån visas intill dem och begränsas till 50–600 procent av sidans anpassade bredd. Zoom och panorering ändrar inte de sparade kod- och tabellområdena. Samma navigering fungerar när en exempelstämpel markeras på ritningen.

## Hur förhandsvisningen uppdateras

Muspekaren eller mittpunkten mellan fingrarna används som zoomcentrum, inom visningens scrollgränser. En påbörjad markeringsruta avbryts när det andra fingret sätts ned. Efter en tvåfingersgest behövs en ny beröring för att börja markera, så fingret som lyfts sist inte lämnar en oavsiktlig ruta.

Den befintliga förhandsvisningen skalas direkt under rörelsen. PDF:en ritas om efter en kort paus i zoomen, med samma begränsning av bildytan som tidigare. Fördröjd omritning och gester avbryts vid sidbyte och stängning. Under avläsning pausas omritningen och återupptas efteråt vid behov. Byte mellan kod- och tabellmarkering på samma sida behåller den väntande skärpeuppdateringen.

Text-, stämpel- och bildsökning, GS-urval och sparade projekt använder samma läsare som TEST 7. TEST 8 har egna lagringsnycklar och sessionsdatabas. TEST 7, ordinarie SmartMatch, Kontrollflöde, inloggning och native iOS ändras inte.

## Verifierat 2026-10-16

- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-zoom-v8.cjs` passerar i dator-, iPad- och iPhone-vy med genererad PDF. Testet använder verkliga mushjulshändelser och pekinmatning via Chromiums CDP. Tvåfingerszoom i kod- och tabelläge håller mittpunkten, bevarar gamla områden och avbryter en påbörjad ruta. Efterföljande markering med ett finger fungerar.
- Mus- och fingerpanorering, markering efter zoom och flytt, plus/minusknappar, 50–600-procentsgränser och en bildyta under 2,9 megapixel kontrolleras. Snabbt byte från zoom till tabelläge behåller den uppskjutna omritningen. Markerade områden ger fortfarande rätt kod och produkttexter i textläget utan att OCR-biblioteket laddas. Inga körfel eller externa tjänsteanrop uppstår.
- Det befintliga `smartmatch-read-fast-v7.cjs` kördes via en tillfällig lokal kopia riktad mot TEST 8 i datorvy. Textläge, snabbläge, riktig bildläsning, GS-urval, tidsvägd procent, PDF-export och direkt återöppning passerar. Det incheckade TEST 7-testet är oförändrat.
- Skärmbilder i dator- och iPad-vy har granskats visuellt. Den fasta HTML-sidan är identisk med versionssidan och laddar TEST 8/build `36.142-READ-TEST`.

Kontrollerna använder Chromium med emulerad mobil/surfplattevy. Fysisk Safari/iPad och en ny native/TestFlight-build är inte verifierade i denna webbändring.
