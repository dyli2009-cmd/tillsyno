# Ritningsverktyg v2.4.360

## Beteende

- Varje ny fil öppnas med förlustfri kvalitet och utan automatisk rensning av kommentarer.
- PDF-bilder, text, vektorer, länkar, formulär och bilagor bevaras vid ompackning. Originalet används om ompackningen inte ger en mindre oförändrad fil.
- Sidborttagning, beskärning och vita täckrutor arbetar direkt i PDF-strukturen. Beskärningen utgår från PDF.js koordinattransform och stöder roterade sidor och sidboxar som inte börjar vid noll.
- Text- och färgrensning kräver ett uttryckligt val av ett bildbaserat kvalitetsläge. Förlustfritt växlar aldrig automatiskt till JPEG.
- JPEG och PNG importeras utan nedskalning; normal JPEG bäddas in med sin ursprungliga bildström. Bilder som kräver orientering eller konvertering behandlas i full pixelupplösning. Flera bilder blir flera PDF-sidor.
- Uppdelning mäter varje del från verkliga PDF-byte och delar endast vid sidgränser. Varje del har en egen nedladdningslänk, utan krav på flera samtidiga nedladdningar eller ZIP.
- En sida som inte ryms inom målstorleken behålls hel med tydlig uppgift om storleken. Ingen automatisk kvalitetssänkning görs.
- Digitalt signerade dokument sparas oförändrade. Ändringar eller uppdelning som skulle bryta signaturen stoppas med ett konkret felmeddelande.
- Exportknappar och redigering låses medan filen byggs. Nya ändringar tar bort gamla förberedda PDF-delar och deras blob-URL:er.
- v2.4.360 visas längst ned till höger. Offlinecachen tar med den nya PDF-modulen.

## Avgränsningar

Den befintliga återställningen av originalritningen ur en arbets-PDF för Dörrservice/Säkerhetsservice finns kvar. Den är en avsiktlig ritningsrensning och behåller inte serviceprojektets överlagrade protokoll i den nya ritningen. Den uppladdade originalfilen ändras aldrig.

Beskärning och Dölj område är visuella ritningsverktyg, inte permanent borttagning av underliggande information. PDF-katalogdata som formulär eller bilagor bevaras också i delar; sådan data kan begränsa hur liten en del kan bli.

## Verifiering

`node tests/drawing-export-v360.cjs` kör riktiga PDF-exporter och Chromium-kontroller i dator-, iPhone- och iPad-storlekar. Playwright kan hämtas från `CODEX_PRIMARY_RUNTIME_NODE_MODULES` och Chromium anges med `CHROMIUM_PATH`. `DRAWING_BROWSER_ARGS` kan innehålla en JSON-lista med installationsspecifika startargument.

Testerna verifierar PDF-struktur, kvarvarande sidordning, vektortext, ursprungliga sidmått, roterade sidboxar, kommentarer, formulärvärden och widgets, bilagor, signaturskydd, hela PDF-delar och för stora enskilda sidor. Webbläsartesterna provar filöppning, standardkvalitet, touch-/musbeskärning, sparande, bildupplösning, delarnas nedladdningslänkar och versionsplacering.

Externa PDF:er kan anges i `DRAWING_REAL_PDFS` som en JSON-lista med lokala sökvägar. De och testresultat sparas aldrig i repot. PDF.js bildjämförelse använder fontkonturer för att undvika operativsystemets fontfallback; textinnehåll jämförs separat. Verifiering på fysiska iOS-enheter ersätts inte av skärmstorlekar och syntetiska touchhändelser.

Verifierat 2026-10-16:

- Samtliga exporttester och UI-flöden passerade i 1366x900, 390x844 och 1024x1366. De två touchvyerna använder verkliga Chromium-touchhändelser.
- Två externa PDF-filer med sammanlagt sju sidor gav identiska renderade pixlar och text efter förlustfri ompackning, både med MuPDF och i PDF.js-kontrollen.
- Filerna minskade från 552 873 till 542 215 byte respektive 1 861 912 till 1 707 197 byte. Dessa exempel är inte en garanti för andra filers storleksminskning.
- PNG-import, ursprungliga JPEG-bildbyte, EXIF-orientering och WebP-konvertering i full upplösning passerade i samtliga tre vyer.
- Tre bildsidor kunde delas till tre kompletta PDF:er under den valda gränsen 1 MB och laddas ned var för sig.
- JavaScript-syntax, unika element-ID:n, lokala resurser och whitespace-kontroll passerade.
