# SharePoint-test 0.7 – status 2026-10-20

## Implementerat

**Spara uppdaterar samma verifierade projektfil som öppnades från SharePoint.** Fil-ID, namn och mapp behålls. **Ny kopia** är ett uttryckligt separat val. Ett lokalt projekt skapar en fil vid första SharePoint-sparningen; följande sparningar i samma session använder det bekräftade fil-ID:t.

Startmappen är **Great**. Appen läser dess faktiska undermappar, exempelvis **Projekt**, **Service**, **Ordrar** och fler nivåer. **Uppdatera** behåller vald undermapp och hämtar aktuella namn och nytillkomna filer. Samma beteende gäller kopiesparandets mappväljare. Appen skapar inte dessa mappar automatiskt i Microsoft-kontot.

En första verifierad öppning sparar rotmappens ID, knutet till konto, Tillsyno-användare och konfiguration. Senare namnbyten behåller kopplingen. En borttagen eller otillgänglig tidigare rot ersätts inte tyst av en ny mapp med samma namn. Om webbläsarens lagring är blockerad används det verifierade ID:t i minnet under sessionen. På en ny webbläsare utan referens börjar sökningen från konfigurationens Great.

Filgränsen är nu **200 MiB per fil och 200 MiB totalt per val**, både vid öppning och projektinspektion samt sparning. Hämtning visar procent och kan avbrytas genom att stänga väljaren. Tvåminutersgränsen mäter tid utan nya bytes; en fungerande stor överföring får ta längre tid totalt.

Öppna- och sparrutorna är mer kompakta, med SVG-ikoner, tydlig primärknapp, kort för befintlig fil och utfällbara kontouppgifter. Desktoprutan är högst 580 px bred; telefonvyn har minst 44 px höga tryckytor och inga horisontellt dolda kontroller.

Avläsningskopian använder nu de befintliga **9.79-resurserna**. Det behåller gemensamma protokollsidor och den aktuella produktlistans tidsfunktion. Den ordinarie Avläsningskoden ändras inte. De två SmartMatch-testkopiornas vanliga projektöppnare når SharePoint-väljaren även på dator. I Avläsningskopian heter starten för ett sparat projekt nu **Öppna projekt**; nya ritningar börjar fortsatt med **Förbered ritning**.

## Källbindning och sparande

Läsklienten verifierar ID, namn, storlek, bibliotek, föräldramapp och eTag före och efter hämtning, samt på den metadatarespons som lämnar nedladdningsadressen. Kontrollen gäller även fullmetadata-fallback. Nedladdade bytes måste bli den faktiskt aktiva arbetsytan innan källan kan användas för sparande.

Bindningen kräver en känd fullprojektsparning, rätt projektmetadata i den färdiga PDF-filen och samma aktiva projekt. Microsoft-konto och Tillsyno-användare kontrolleras också. Lokala projektbyten, annan arbetsyta, kontobyten och äldre köade exporter får inte använda en föregående bindning. Råkopior, bilagor, rapporter och okända framtida SmartMatch-scheman kan inte skriva över projektfilen bara för att ett namn eller projekt-ID överensstämmer.

Skrivklienten använder upload session på exakt driveItem-ID med `If-Match`, kontrollerar aktuell källa före och mellan delarna och läser tillbaka metadata innan kvittens. En bekräftad sparning ger nästa sparning filens nya eTag. Ny fil använder fortfarande `conflictBehavior: fail`. Gränsen är 200 MiB per fil, med sekventiella delar om 5 MiB.

SmartMatch-/CE-importens interna fingerprint beräknas i ordnade bitar om högst 2 MiB och täcker alla bytes, längd och bitstorlek. Adaptern behöver ingen extra helfilsbuffer för den importkontrollen. Vid export parsas modulens befintliga originalbytevy direkt och identitetsresultatet cacheas. Original och färdig export granskas sekventiellt. Befintlig PDF-rendering och export behöver fortfarande minne; filgränsen är ingen minnesgaranti för varje enhet.

Konflikt, avbrott eller nätfel skapar ingen automatisk kopia. Exporten finns kvar för ett uttryckligt nytt försök, kopieval eller lokalt sparande. Vid osäkert svar efter sista filblocket uppmanas användaren att kontrollera SharePoint först. Ingen automatisk retry sker.

## Verifiering

- **113 direkta Node-testfall passerade:** läsklient/mappar/fetch 37, exportbrygga 16, källbindning 21 och skrivklient 39. De omfattar även rotens namnbyte och ny namne, uppdaterade undermappar, blockerad lagring, storleksgräns, lång men aktiv hämtning, två minuters inaktivitet och avbrott.
- En riktig syntetisk projekt-PDF på **104 858 478 bytes** verifierar import, två sparningar till samma ID och nya eTag. Instrumentering visar högst 2 MiB per hashoperation, ingen extra helfilsbuffer vid SmartMatch-import och en aktiv PDF-parsning. En separat **100 MiB-byteöverföring** har laddats upp två gånger i 40 delar om 5 MiB, med SHA-256-kontroll av båda fullständiga resultaten.
- **15 separata webbläsartestfall passerade**, 0 fel och 0 hoppade, med lokalt simulerade Microsoft-svar och verklig byggd appkod. De omfattar tidigare spar-, konflikt-, avbrotts- och layoutfall samt nästlade Great-mappar, uppdatering i aktuell mapp, namnbyten och 200 MiB-gränserna för fil/val/export.
- Den riktiga **Avläsning TEST 9.79** öppnade en genererad **105 908 528 byte** stor projekt-PDF genom sin ordinarie SharePoint-väljare. En arbetsrad ändrades och projektet sparades två gånger till samma ID, mapp och namn, med den nya eTag från föregående kvittens. De faktiskt uppladdade filerna var **105 916 287** respektive **105 916 283 bytes**, i 21 delar vardera. En **ny webbläsarkontext** öppnade sedan de sparade bytesen och återfick samma dörrposition och bock. Synlig procent under hämtningen verifierades också.
- Första sparningen av ett lokalt projekt skapar en fil; nästa sparning uppdaterar den. Uttryckligt kopieval och en versionskonflikt följd av ett uttryckligt kopieval är också verifierade i webbläsaren.
- Desktop- och telefonvyer har granskats visuellt. Syntax, byggning och `git diff --check` passerar.

Kör kodtester: `npm test` i denna katalog. De direkta testfilerna kan också köras med `node tests/<fil>.test.mjs` för att visa individuella fall. Webbläsartesterna är valbara och körs separat:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

Bygg: `npm run build`. Genererade resurser ska följa med källändringarna. Webbläsarprovet behöver Chromium, Playwright och OpenSSL. Den stora syntetiska filen hämtas från lokal HTTPS och mockuppladdningar strömmas till tillfälliga filer; certifikat, nyckel och stora PDF-filer städas bort efter körningen.

## Omfattning och kvarvarande verklig kontroll

Endast de sju SharePoint-test-HTML-filerna och `sharepoint-test/` ändras. Produktionssidor, ordinarie modul-JavaScript, autentisering, PIN-kontroll och service worker är oförändrade. Den fristående läsdiagnosen förblir read-only.

Ingen faktisk Microsoft-inloggning, skrivbehörighet eller filuppladdning med användarens tenant har utförts här. Webbläsartesterna använder genererade PDF-filer, lokal autentiseringsstubb och lokala Graph-svar. De verifierar inte live-Microsoft-åtkomst, användarens verkliga 100 MB-ritning eller fysisk Safari/iOS. Den stora PDF:ens syntetiska dataström verifierar filstorlek och bevarad projektdata, men motsvarar inte renderingsbelastningen från en stor skannad ritning. `save.liveUploadVerified` är därför fortsatt `false`.

Nästa verkliga kontroll är: gå in i Great och en undermapp, lägg till en PDF i SharePoint och tryck Uppdatera i appen. Öppna en projekt-PDF, ändra en bock, **Spara PDF → Samma fil → Spara**, spara en gång till och kontrollera att samma fil och namn finns kvar. Öppna den från SharePoint igen och kontrollera bock och koppling. Prova därefter den verkliga stora ritningen på avsedd dator/iPad.

Projektfilens bindning finns i den öppna fliken. Efter omladdning måste källfilen öppnas från SharePoint igen; rotmappens sparade ID är en separat koppling. Omärkta/split/OCR-exporter i ritningsverktyget och fristående rapporter förblir separata exporter. Den fristående läsdiagnosen behåller 25 MiB-gränsen. Filer över 200 MiB ingår inte, och fysisk iPad-minneshantering är inte verifierad.

Microsoft dokumenterar `If-Match` vid skapandet av upload session, men garanterar inte uttryckligen att villkoret återkontrolleras atomiskt när sista delen slutför filen. Kodens versionskontroller stoppar observerade ändringar; de är inte ett bevisat lås mellan samtidiga skribenter. Verklig samtidighetskontroll återstår. Slutkvittensen bygger på metadata, inte på återhämtning och hashjämförelse av hela serverfilen.

Inga kundfiler, autentiseringstoken eller tillfälliga upload-URL:er har lagts till i repot. Se `APP_TEST.md` för behörighetsscope och tekniska avgränsningar.

## Referens

- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/addressing-driveitems?view=odsp-graph-online
