# SharePoint-test 0.6 – status 2026-10-20

## Implementerat

**Spara uppdaterar samma verifierade projektfil som öppnades från SharePoint.** Fil-ID, namn och mapp behålls. **Ny kopia** är ett uttryckligt separat val. Ett lokalt projekt skapar en fil vid första SharePoint-sparningen; följande sparningar i samma session använder det bekräftade fil-ID:t.

Öppna- och sparrutorna är mer kompakta, med SVG-ikoner, tydlig primärknapp, kort för befintlig fil och utfällbara kontouppgifter. Desktoprutan är högst 580 px bred; telefonvyn har minst 44 px höga tryckytor och inga horisontellt dolda kontroller.

Avläsningskopian använder nu de befintliga **9.78-resurserna**. Det behåller den nya PDF-strukturen med gemensamma protokollsidor vid sparning i samma fil. Den ordinarie Avläsningskoden ändras inte. De två SmartMatch-testkopiornas vanliga projektöppnare når SharePoint-väljaren även på dator.

## Källbindning och sparande

Läsklienten verifierar ID, namn, storlek, bibliotek, föräldramapp och eTag före och efter hämtning, samt på den metadatarespons som lämnar nedladdningsadressen. Kontrollen gäller även fullmetadata-fallback. Nedladdade bytes måste bli den faktiskt aktiva arbetsytan innan källan kan användas för sparande.

Bindningen kräver en känd fullprojektsparning, rätt projektmetadata i den färdiga PDF-filen och samma aktiva projekt. Microsoft-konto och Tillsyno-användare kontrolleras också. Lokala projektbyten, annan arbetsyta, kontobyten och äldre köade exporter får inte använda en föregående bindning. Råkopior, bilagor, rapporter och okända framtida SmartMatch-scheman kan inte skriva över projektfilen bara för att ett namn eller projekt-ID överensstämmer.

Skrivklienten använder upload session på exakt driveItem-ID med `If-Match`, kontrollerar aktuell källa före och mellan delarna och läser tillbaka metadata innan kvittens. En bekräftad sparning ger nästa sparning filens nya eTag. Ny fil använder fortfarande `conflictBehavior: fail`. Gränsen är fortsatt 25 MiB per fil, med sekventiella delar om 5 MiB.

Konflikt, avbrott eller nätfel skapar ingen automatisk kopia. Exporten finns kvar för ett uttryckligt nytt försök, kopieval eller lokalt sparande. Vid osäkert svar efter sista filblocket uppmanas användaren att kontrollera SharePoint först. Ingen automatisk retry sker.

## Verifiering

- **96 direkta Node-testfall passerade:** läsklient/fetch 26, exportbrygga 16, källbindning 17 och skrivklient 37. De omfattar exakt källa, felaktig metadata, eTag, projekt- och kontobyten, gamla köade exporter, schema, råkopior, kopiekvittens, avbrott och felaktig slutmetadata.
- **12 separata webbläsartestfall passerade** med lokalt simulerade Microsoft-svar och verklig byggd appkod. De omfattar oförändrade bytes, kvittens, lokala sparvägar, behörigheter/konto, konflikter, nätfel, avbrott, storleksgräns och kompakt mobil layout.
- Den riktiga **Avläsning TEST 9.78** har öppnat en genererad projekt-PDF från den simulerade SharePoint-källan genom sin ordinarie öppnaknapp, ändrat en arbetsrad och sparat två gånger till samma fil-ID. Senaste eTag används vid nästa sparning. En **ny webbläsarkontext** har därefter hämtat de sparade bytesen genom samma källa och återfått både dörrpositionen och bocken.
- Första sparningen av ett lokalt projekt skapar en fil; nästa sparning uppdaterar den. Uttryckligt kopieval och en versionskonflikt följd av ett uttryckligt kopieval är också verifierade i webbläsaren.
- Desktop- och telefonvyer har granskats visuellt. Syntax, byggning och `git diff --check` passerar.

Kör kodtester: `npm test` i denna katalog. De direkta testfilerna kan också köras med `node tests/<fil>.test.mjs` för att visa individuella fall. Webbläsartesterna är valbara och körs separat:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

Bygg: `npm run build`. Genererade resurser ska följa med källändringarna.

## Omfattning och kvarvarande verklig kontroll

Endast de sju SharePoint-test-HTML-filerna och `sharepoint-test/` ändras. Produktionssidor, ordinarie modul-JavaScript, autentisering, PIN-kontroll och service worker är oförändrade. Den fristående läsdiagnosen förblir read-only.

Ingen faktisk Microsoft-inloggning, skrivbehörighet eller filuppladdning med användarens tenant har utförts här. Webbläsartesterna använder genererade PDF-filer, lokal autentiseringsstubb och lokala Graph-svar. De verifierar inte live-Microsoft-åtkomst eller fysisk Safari/iOS. `save.liveUploadVerified` är därför fortsatt `false`.

Nästa verkliga kontroll är: öppna en liten projekt-PDF från SharePoint, ändra en bock, **Spara PDF → Samma fil → Spara**, spara en gång till och kontrollera att en enda fil med samma namn finns i GStest. Öppna den från SharePoint igen och kontrollera bock och koppling, gärna även på en annan enhet.

Bindningen finns i den öppna fliken. Efter omladdning måste källfilen öppnas från SharePoint igen. Omärkta/split/OCR-exporter i ritningsverktyget och fristående rapporter förblir separata exporter. Stora PDF-filer över testgränsen och fysisk iPad-minneshantering ingår inte i denna ändring.

Microsoft dokumenterar `If-Match` vid skapandet av upload session, men garanterar inte uttryckligen att villkoret återkontrolleras atomiskt när sista delen slutför filen. Kodens versionskontroller stoppar observerade ändringar; de är inte ett bevisat lås mellan samtidiga skribenter. Verklig samtidighetskontroll återstår. Slutkvittensen bygger på metadata, inte på återhämtning och hashjämförelse av hela serverfilen.

Inga kundfiler, autentiseringstoken eller tillfälliga upload-URL:er har lagts till i repot. Se `APP_TEST.md` för behörighetsscope och tekniska avgränsningar.

## Referens

- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
