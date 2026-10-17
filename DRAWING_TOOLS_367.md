# Ritningsverktyg v2.4.367 – sökbara dörrkort med originalbilden kvar

## Vad testfunktionen gör

Du markerar hela dörrkortet, en tabell eller ett annat område som innehåller bildtext. Verktyget läser samma markerade plats på de sidor du väljer. En ny PDF-kopia behåller originalets synliga bilder och får granskad, osynlig text på motsvarande positioner. Hela rubriker läses, oavsett om det står exempelvis **Beslagskod 4.2: WC**, **DBLB UPPST**, **GS 23** eller något annat. Ingen lista över tillåtna beteckningar styr förberedelsen.

Orden i tabellen får egna positioner. Därmed kan fortsatt avläsning använda text och kolumnplaceringar i stället för att bildläsa samma innehåll igen. Det är ett textlager med ordpositioner, inte en garanterat korrekt rekonstruktion av tabellens celler eller en ny produktregel. Kontrollera särskilt beteckningar, ansvarskolumner och rader mot bilden innan du godkänner texten.

Befintlig PDF-text behålls och ska inte läggas till en gång till. Sidor med både vanlig text och bilder kontrolleras inom markeringen, så att en text någon annanstans på sidan inte ensam stoppar bildläsningen. Originalfilen skrivs inte över.

## Gör så här

1. Öppna filen i **Ritningsverktyg** och visa en sida med ett dörrkort. Börja gärna med ett kort för att prova kvaliteten.
2. Öppna verktygen och **Förbered sökbara dörrkort · TEST**. Välj **1. Markera hela dörrkortet** och dra en ram runt det kort som ska läsas, inklusive rubrik och arbetslista.
3. Kontrollera **2. Sidor att läsa**. Först är bara exempelsidan vald. Du kan skriva till exempel **2, 4–8** eller trycka **Sidor med samma sidformat**. Samma markerade plats används på varje vald sida. Kontrollera därför att korten verkligen ligger på samma plats och har samma layout. Sidformatet visar inte i sig att innehållet är ett dörrkort.
4. Tryck **3. Läs markerade områden**. Statusrutan visar vilken sida och vilket bildområde som behandlas, procent och hur länge arbetet har pågått. När tillräckligt mycket har lästs visas en ungefärlig återstående tid. **Avbryt** stoppar arbetet utan att spara en ofärdig PDF.
5. Öppna resultatet för varje sida och jämför texten med **Visa originalsida**. Kontrollera de osäkra orden, rätta dem vid behov och välj vilka som ska tas med. Osäkra ord är utelämnade från PDF-textlagret tills du väljer eller rättar dem.
6. Bocka för **4. Jag har granskat texten och valda sidor** och tryck **Spara sökbar PDF**. Spara den nya filen med ändelsen **-sokbar.pdf**. Bilden ska se likadan ut när du öppnar kopian; sökbarheten kommer från det osynliga textlagret.
7. Öppna den hämtade kopian i SmartMatch Avläsning TEST 9 och använd **Sök i text – snabbare, utan bildläsning** när du vill prova textlagret. Kod- och tabellmarkeringarna används som tidigare. Produktavläsning och GS-reglerna följer fortfarande SmartMatch-flödet.

Du kan även trycka **Spara text och positioner som JSON** för att spara avlästa ord, positioner, säkerhet och granskningsval. JSON-filen är ett separat underlag; TEST 9 har ingen ny JSON-import genom denna ändring.

Om du ändrar markeringen, sidvalet eller arbetskopians sidor efter en avläsning behöver de valda områdena läsas igen innan ett nytt textlager sparas. Om olika kortlayouter finns i samma PDF, förbered en layout i taget och öppna den sparade kopian för nästa omgång.

## Vad som tar tid

Den första läsningen behöver fortfarande tolka bildtexten. Verktyget börjar med befintlig PDF-text och begränsar bildläsningen till det valda området. Varje markerat område ritas upp en gång per sida och delas vid behov i mindre läsområden i minnet. Samma stora sida ska därför inte behöva ritas om för varje bildläsningsruta. Allt sker med projektets lokala OCR-filer; inga dokument skickas till ett OCR-moln-API.

Förloppsrutan skiljer kontroll av befintlig text, förberedelse av bildområdet, bildläsning och sparande. Återstående tid är en uppskattning som kan ändras när sidorna har olika innehåll. Att skriva den nya PDF-filen är ett separat steg efter avläsningen.

När den sparade kopian senare läses som text behövs ingen ny OCR av just de förberedda orden. Hur mycket snabbare det blir beror på dokumentets innehåll och den efterföljande läsningen. Tiden för att öppna en stor PDF, tolka dess sidstruktur och visa ritningen kan fortfarande vara lång.

## Avgränsningar

- Detta är en testfunktion i webbläsaren. Den ersätter inte ett lokalt Windows-program för mycket tunga filer. Användarens egen **251 MB-PDF** finns inte tillgänglig för test; stöd för den filen är inte verifierat.
- Originalbilderna behålls. Textlagret gör inte automatiskt PDF-filen mindre och kan öka filstorleken något. Sidborttagning och bildoptimering är separata verktyg.
- OCR kan feltolka bokstäver, siffror och tabellkolumner. För små eller otydliga original kan en mindre markering behövas för att ge texten tillräcklig upplösning. Avläsningen har en gräns för bildminne för att inte skapa obegränsat stora canvasytor.
- Sidor med samma sidformat väljs som en hjälp. Olika kortlayout, placering eller orientering kräver egen markering och kontroll.
- Tecken som PDF-textlagrets typsnitt inte kan spara rapporteras och finns kvar i JSON-underlaget. Verktyget ska inte ersätta dem tyst med andra tecken.
- Krypterade eller signerade dokument kan nekas av befintliga PDF-skydd. Textlagret läggs inte till genom att kringgå dessa skydd.
- Offline kräver att appen och de lokala OCR-filerna först har hämtats på enheten. Offlinearbete ändrar inte gällande inloggnings- och licensregler.

## Verifieringsstatus

`tests/drawing-ocr-reader.cjs` passerade för befintlig PDF-text, blandade bild-/textsidor, roterade sidor, valfria beteckningar och tabellord. Testerna kontrollerade en rendering per markerad sida, avgränsad bildstorlek, överlappande läsområden, beskärningar, dolda områden och avbrott.

`tests/drawing-ocr-pdf.cjs` passerade med PDF.js/Chromium och MuPDF. Den synliga sidan var pixelidentisk före och efter textlagret vid samtliga fyra sidrotationer och med förskjutna sidgränser. Ordpositioner i tabeller, tidigare tillagda textområden, formulär, bilagor, stämplar och projektmetadata kontrollerades. Skyddet för signerade dokument kvarstår.

`tests/drawing-ocr-browser.cjs` passerade i dator-, iPad- och telefonvyer med riktig lokal OCR utan internet, faktisk markering med pekinmatning på telefon och pixeljämförelse av original och sparad kopia. Sidval, godkännande, export, avbrott och byte av arbetskopia ingår i testet. En extra kontroll tog bort originalets första sida, beskärde och dolde ett område på nästa kort och jämförde vanlig export med sökbar export: utseendet var pixelidentiskt, textens sidnummer och positioner följde ändringarna och det dolda bildordet lades inte till i textlagret.

Den förberedda PDF-kopian öppnades även i SmartMatch Avläsning TEST 9. Beteckningarna **DBLB UPPST** och **GS23** kunde läsas som PDF-text. Produktläsningen använde de sparade tabellpositionerna och inkluderade **6696** och **Utsida** för GS:s montage. **310-50**, med DT som montör och GS som leverantör, utelämnades enligt befintlig regel. TEST 9 startade ingen OCR-worker och körde ingen bildigenkänning i detta prov.

Den tidigare uppladdade, reducerade skolfilen på cirka **12,45 MB** testades också. Ett helt markerat kortområde på sida 2 lästes med en rendering och nio läsområden på ungefär **25 sekunder i testmiljön**. Resultatet behöll GS23 och tabellpositionerna för 256, 6696 och Utsida. Bildminnesgränsen nåddes och flera ord behövde granskas; detta visar varför kontrollsteget behövs även när sökbara ord har hittats. Tiden är ett exempel för just det kortområdet, inte en prognos för andra filer.

Befintliga tester för vanlig PDF-export, PDF-analys och grupperade dörrkort passerade. Användarens **251 MB-PDF**, fysisk iPad, fysisk Windows-dator och ny TestFlight-build har inte verifierats.

Ändringen är avgränsad till Ritningsverktyget och nödvändig global versions-/cachemetadata. SmartMatch TEST 9, Kontrollflöde, auth och licensregler ändras inte funktionellt.
