# SmartMatch Avläsning TEST 9.78

Projekt-PDF:en återanvänder originalens dörrkort. Den tidigare exporten skapade en fysisk protokollkopia för varje länkad ritningsposition för att ge varje kopia en egen fast tillbaka-länk. Därför kunde 70 originalsidor och 430 positioner bli 500 sidor.

9.78 skapar inga sådana extrakopior. Alla positioner länkar till rätt ursprungliga protokollsida. När ett dörrkort har en unik ritningsposition används en vanlig `GoTo /XYZ`-länk tillbaka. När flera positioner eller alias delar samma kort används PDF-läsarens `Named /GoBack`-åtgärd. Ingen PDF-JavaScript krävs. Historikknappens funktion beror på PDF-läsaren och är ännu inte verifierad på fysisk Safari, iPad eller iPhone. Positionsbokmärken med exakta koordinater finns som manuell navigering och grupperas per GS-kod, även när flera koder delar sida.

Tidigare extrakopior tas bort när de är märkta av exportören. Den första befintliga sidmarkören är styrande, även om värdet är noll. Ett positivt värde kontrolleras mot det sparade originalsidantalet innan någon sida tas bort. Motstridiga markörer avbryter exporten; om markörer saknas behålls alla sidor. Alla fyra extra-sidmarkörer återställs till noll. Befintliga originalströmmar, bilagor och kundbokmärken bevaras.

Källkodsgranskning av [WebKits UnifiedPDFPlugin](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/Plugins/PDF/UnifiedPDF/UnifiedPDFPlugin.mm) visar ingen hantering av `GoBack` i dess namngivna åtgärder. Det fastställer inte vilken läsare varje levererad iOS-version använder, men automatisk historikåtergång ska inte utlovas i Safari. Appens sparruta nämner uttryckligen denna begränsning.

Sidantalet kontrolleras vid återöppningen av den färdiga exporten och visas i sparrutan. Valet som tidigare gav en extra protokollsida per position är borttaget. Projektmetadata, ritningsnoteringar, avprickningar, SLR-dokument och minnesförbättringarna från 9.76–9.77 följer med.

Den versionerade testsidan och testaliaset använder intern build 36.221. Startsidan pekar på 9.78 och service-worker-versionen är 2.4.446-read9.78. Äldre versionerade filer finns kvar.

## Verifiering

- `node tests/smartmatch-compact-navigation-v9-78.cjs`: verkliga PDF-dokument och exportfunktioner, 70 originalsidor med 430 positioner, upprepad export, migrering från 9.77, länk- och bokmärkesmål, alias, delade sidor, unika positioner, sidmarkörer och bevarat originalinnehåll.
- `node tests/smartmatch-project-writer-v9-78.cjs`: oförändrade metadatabytes, Unicode, stora projektdata, återläsning och avbrott.
- `node tests/smartmatch-export-header-cache-v9-78.cjs`: sidcache och frigjord textutvinning på iOS.
- `node tests/smartmatch-export-serialization-v9-78.cjs`: samtidiga exportanrop, ändringar, stängning, projektbyte, avbrott och återförsök.
- `node tests/smartmatch-incremental-save-v9-78.cjs`: lokal sparning och skydd av arbetskopian.
- `node tests/smartmatch-note-export-memory-v9-78.cjs`: full export med ritningsnoteringar, strikt återläsning och felhantering.
- `node tests/smartmatch-ipad-export-memory-v9-78.cjs`: webbläsarflödet med stor PDF-bilaga och flera MB projektdata, noll extrakopior, konkreta navigeringsåtgärder, återexport efter återöppning, projekt- och originalfilshash, spargest, avbrott och återförsök. Enhetsprofilerna är simulerade i Chromium och bevisar inte Safari-stöd för historikknappen.

Kör även iPhone-profil med `SMARTMATCH_TEST_DEVICE=iphone` och en större PDF-bilaga med `SMARTMATCH_TEST_SOURCE_MB=100`.

Alla riktade tester ovan passerar. Chromium-flödet passerar med 16 MiB PDF-bilaga och minst 4 MiB projektdata i iPad- och iPhone-profiler samt 100 MiB bilaga och samma stora projektdata i iPad-profil. Både första exporten och återexport av den återöppnade filen behåller två originalsidor, konkreta länkmål och exakt projektinnehåll/originalfilshash. Hela flödestesterna, som innehåller flera exportförsök och återöppningar, tog cirka 82, 81 respektive 85 sekunder. Det är inga tids- eller minnesmätningar på fysisk Safari. Popplers separata rendering av noteringar passerar för alla fyra sidrotationer, med identiska bilder efter återexport. Syntax, HTML-resurser, versionsmarkörer och service-worker-lista är kontrollerade.

Fysisk kontroll: öppna samma sparade projekt på iPad och iPhone och kontrollera sidantalet. Gå från en ritningsposition till ett delat GS-kort och tryck tillbaka. Upprepa från en annan position. Om PDF-läsaren saknar stöd för historikåtgärden används dess egen historik eller positionsbokmärkena. Dropbox och OneDrive kan använda olika PDF-läsare, så deras förhandsvisningar behöver kontrolleras separat.

Ett litet separat läsartest finns i [smartmatch-navigation-sample-v9-78.pdf](smartmatch-navigation-sample-v9-78.pdf). Det har tre sidor: ritning A, ritning B och ett gemensamt G30-protokoll. Länkar, historikknapp och positionsbokmärken skapas av samma exportfunktion som appen. Det är ett rent navigeringstest utan inbäddat SmartMatch-projekt. Generera om med `node tests/smartmatch-compact-navigation-v9-78.cjs --sample` och kopiera `work/navigation-v9-78/sample.pdf` till filen i webbplatsens rot.
