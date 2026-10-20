# SharePoint-test 0.9 – status 2026-10-20

## Ny rättning efter det upprepade namnfelet

Användaren fick samma namnfel efter 0.8. Felet har nu återskapats genom den riktiga Avläsning 9.80-vägen **Spara → Förbered PDF → Spara PDF**. En giltig projektfil med **162 416 JSON-tecken** öppnades korrekt av Avläsning, men SharePoint-adapterns `PDFLib.decodeText()` överskred JavaScripts argumentgräns. Adaptern klassade då exporten som separat fil och valde `saveCopy`, vilket gav exakt den rapporterade feltexten. Den komprimerade PDF:en var bara **7 822 bytes**. Det tidigare 101 MiB-testet hade liten projektmetadata och täckte därför inte denna risk.

Projektsträngar avkodas nu i block om högst 8 192 kodenheter. Rättningen täcker både stor metadata redan vid öppning och en liten källa vars information växer vid export. Projekt-ID, schema, fullprojektsparning, konto, aktiv arbetsyta, käll-ID och eTag måste fortfarande stämma. En befintlig katalog med exempelvis JSON `null`, fel PDF-typ eller okänd framtida schema får inte behandlas som en rå ritning utan metadata.

Fillistan och den verifierade sparbekräftelsen visar nu **Senast ändrad i SharePoint: namn · tid**. Namnet och tidsstämpeln kommer från Microsofts `lastModifiedBy` och `lastModifiedDateTime`; sparbekräftelsen använder den sista redan verifierade metadatahämtningen. Saknade uppgifter visas neutralt. Aktuellt inloggat konto och enhetens klocka används inte som ersättning för serveruppgifterna. Datum visas på svenska i enhetens lokala tidszon. Detta är uppgift om filens senaste ändring, inte närvaro, ett redigeringslås eller historik per dörr.

### Verifiering av 0.9

- **147 direkta Node-testfall passerade:** läsklient/mappar/fetch 37, exportbrygga 16, källbindning 37, skrivklient 50 och ändringsmetadata 7. `npm test`, byggning och syntaxkontroll passerar.
- Fem nya källbindningsfall täcker stor riktig 9.80-metadata, tillväxt vid export, Unicode/byteordning/blockgränser samt avvisning av fel projekt, felaktig metadata och framtida schema. Fil-ID, namn och tidigare eTag bevaras genom upprepade sparningar.
- Sju metadatafall kontrollerar servernamn/tid, lokala tidszoner, neutrala reservtexter och att den sista verifierade GET-responsen används även när PUT-responsen innehåller ett annat namn och en annan tid.
- Två nya riktiga Avläsningsflöden öppnar en genererad projekt-PDF med mer än 180 000 JSON-tecken, ändrar en arbetsrad, sparar två gånger till samma fil-ID/namn och öppnar resultatet i en ny webbläsarkontext med bocken kvar. Det ena öppnar från SharePoint; det andra öppnar lokalt och använder det befintliga namnet i vald mapp. Inga kopior skapas. Den långa källtabellen finns kvar i de faktiskt uppladdade bytesen.
- **24 av 24 webbläsarfall passerade på 56,98 sekunder**, inklusive de två nya stora-JSON-fallen och tidigare konflikt-, kopie-, konto-, återställnings- och avbrottsfall. 101 MiB-rundturen öppnade 105 908 528 bytes och sparade 105 916 295 respektive 105 916 294 bytes i 21 delar vardera till samma fil, följt av återöppning med bocken kvar.
- Fillistan och kvittensen visar serverns namn/tid, även när uppladdningssvaret medvetet anger en annan person. Telefonvyn har bildgranskats utan horisontell överströmning.

Endast de isolerade SharePoint-testkopiorna och `sharepoint-test/` ändras. Avläsningssnapshoten är fortsatt 9.80. **Ingen faktisk uppladdning till användarens Microsoft-tenant eller provning av användarens riktiga PDF har utförts här.** `save.liveUploadVerified` är fortsatt `false`.

### Flera personer

Uppgiften om senaste ändrare löser spårbarhet på filnivå. Den sammanfogar inte två personers kompletta projekt-PDF:er. Använd en person åt gången i samma projekt tills ett separat flöde för låsning eller strukturerade samtidiga ändringar har beslutats och verifierats. Nästa person behöver öppna den senaste gemensamma filen. SharePoints versionshistorik kan bevara äldre versioner under samma synliga filnamn beroende på bibliotekets inställningar; någon sådan inställning har inte ändrats eller verifierats här.

Den separata vägen **Skicka mejl över 18 MiB → Fortsätt** kan fortfarande tappa adapterklassificeringen under bekräftelsedialogen. 0.9 rättar den vanliga projektsparningen och stor projektmetadata; export-intent för e-post har inte ändrats.

## Kvarvarande beteende från 0.8

**Vanligt Spara uppdaterar samma projektfil med samma namn.** En känd SharePoint-källa sparas på sitt verifierade fil-ID. Om ett komplett projekt saknar kopplingen letar **Samma namn** efter det valda namnet i den valda mappen: finns filen uppdateras den, annars skapas den där. Nästa sparning använder det bekräftade fil-ID:t. **Ny kopia** är ett uttryckligt separat val och skriver inte över en befintlig namne.

Rättningen svarar på det rapporterade felet ”En fil med det namnet finns redan”. Tidigare gick ett projekt utan verifierad källkoppling alltid via ny kopia. Dessutom tappades kopplingen vid en enkel **Förbered ritning**-överlämning och vid omladdning med lokal återställning. Dessa vägar har rättats. Vald undermapp behålls vid växling mellan **Samma namn** och **Ny kopia**. Ett tidigare aktivt Microsoft-konto väljs före andra cachade konton; flera konton utan aktivt val kräver användarens befintliga Anslut-val.

Startmappen är **Great**. Appen läser dess faktiska undermappar, exempelvis **Projekt**, **Service**, **Ordrar** och fler nivåer. **Uppdatera** behåller vald undermapp och hämtar aktuella namn och nytillkomna filer. Samma beteende gäller kopiesparandets mappväljare. Appen skapar inte dessa mappar automatiskt i Microsoft-kontot.

En första verifierad öppning sparar rotmappens ID, knutet till konto, Tillsyno-användare och konfiguration. Senare namnbyten behåller kopplingen. En borttagen eller otillgänglig tidigare rot ersätts inte tyst av en ny mapp med samma namn. Om webbläsarens lagring är blockerad används det verifierade ID:t i minnet under sessionen. På en ny webbläsare utan referens börjar sökningen från konfigurationens Great.

Filgränsen är nu **200 MiB per fil och 200 MiB totalt per val**, både vid öppning och projektinspektion samt sparning. Hämtning visar procent och kan avbrytas genom att stänga väljaren. Tvåminutersgränsen mäter tid utan nya bytes; en fungerande stor överföring får ta längre tid totalt.

Öppna- och sparrutorna är mer kompakta, med SVG-ikoner, tydlig primärknapp, kort för befintlig fil och utfällbara kontouppgifter. Desktoprutan är högst 580 px bred; telefonvyn har minst 44 px höga tryckytor och inga horisontellt dolda kontroller.

Avläsningskopian använder nu de befintliga **9.80-resurserna**, inklusive aktuella förbättringar av produktlistan. Den ordinarie Avläsningskoden ändras inte. De två SmartMatch-testkopiornas vanliga projektöppnare når SharePoint-väljaren även på dator. I Avläsningskopian heter starten för ett sparat projekt **Öppna projekt**; nya ritningar börjar fortsatt med **Förbered ritning**.

## Källbindning och sparande

Läsklienten verifierar ID, namn, storlek, bibliotek, föräldramapp och eTag före och efter hämtning, samt på den metadatarespons som lämnar nedladdningsadressen. Kontrollen gäller även fullmetadata-fallback. Nedladdade bytes måste bli den faktiskt aktiva arbetsytan innan källan kan användas för sparande.

Bindningen kräver en känd fullprojektsparning, rätt projektmetadata i den färdiga PDF-filen och samma aktiva projekt. Microsoft-konto och Tillsyno-användare kontrolleras också. Lokala projektbyten, annan arbetsyta, kontobyten och äldre köade exporter får inte använda en föregående bindning. Råkopior, bilagor, rapporter och okända framtida SmartMatch-scheman kan inte skriva över projektfilen bara för att ett namn eller projekt-ID överensstämmer.

Skrivklienten använder upload session på exakt driveItem-ID med `If-Match`, kontrollerar aktuell källa före och mellan delarna och läser tillbaka metadata innan kvittens. En bekräftad sparning ger nästa sparning filens nya eTag. Ny fil använder fortfarande `conflictBehavior: fail`. Gränsen är 200 MiB per fil, med sekventiella delar om 5 MiB.

För namnsparning slås enbart det exakta namnet upp under den verifierade målmappen. ID, namn, bibliotek, förälder och eTag kontrolleras och fryses innan samma ID-baserade uppdatering används. Endast ett 404-svar tillåter ny fil. Om någon hinner skapa namnet under sparningen stoppas den utan automatiskt nytt namn eller överskrivningsförsök. En redan känd källa får inte gå genom namnsökningen för att kringgå ett äldre eTag.

SmartMatch sparar en liten återställningsreferens i samma fliks `sessionStorage`. Den gäller exakt testsida, konto, Tillsyno-användare, arbetsyta, projekt-ID och originalets fullständiga fingerprint. Den används först efter att modulens riktiga cacheöppnare har återställt rätt original och arbetsyta. Ursprungligt eTag behålls; andra flikars sparningar kan inte uppdatera den äldre flikens version i bakgrunden. Lokal filöppning återkallar tidigare återställningsreferenser även när filnamn och bytes är identiska. Referensen innehåller inga PDF-bytes, token eller uppladdningsadresser. Blockerad lagring ger minnesbaserad koppling i den aktuella sidan.

En verifierad enskild fil via **Förbered ritning** får lämnas vidare exakt en gång till den befintliga importen. Fel fil, flera sammanfogade filer, nekad öppning och återanvändning av samma File-objekt kan inte ta över kopplingen. Ett lyckat lokalt cacheflöde kan behålla källreferensen redan före första exporten. Sparandet granskar identiteten igen efter en första Microsoft-anslutning eller en återhämtad initiering, med samma fångade exportkontext.

SmartMatch-/CE-importens interna fingerprint beräknas i ordnade bitar om högst 2 MiB och täcker alla bytes, längd och bitstorlek. Adaptern behöver ingen extra helfilsbuffer för den importkontrollen. Vid export parsas modulens befintliga originalbytevy direkt och identitetsresultatet cacheas. Original och färdig export granskas sekventiellt. Befintlig PDF-rendering och export behöver fortfarande minne; filgränsen är ingen minnesgaranti för varje enhet.

Konflikt, avbrott eller nätfel skapar ingen automatisk kopia. Exporten finns kvar för ett uttryckligt nytt försök, kopieval eller lokalt sparande. Vid osäkert svar efter sista filblocket uppmanas användaren att kontrollera SharePoint först. Ingen automatisk retry sker.

## Tidigare verifiering av 0.8

- **135 direkta Node-testfall passerade:** läsklient/mappar/fetch 37, exportbrygga 16, källbindning 32 och skrivklient 50. Nya fall täcker namnsparning i exakt vald mapp, nya kvittenser, skapanderace, versionsändringar, förberedelseöverlämning, återställning före första export, skilda eTag per flik, lokal filöppning och lagringsfel. Tidigare fall för mappar, filstorlek, hämtning och avbrott passerar också.
- En riktig syntetisk projekt-PDF på **104 858 478 bytes** verifierar import, två sparningar till samma ID och nya eTag. Instrumentering visar högst 2 MiB per hashoperation, ingen extra helfilsbuffer vid SmartMatch-import och en aktiv PDF-parsning. En separat **100 MiB-byteöverföring** har laddats upp två gånger i 40 delar om 5 MiB, med SHA-256-kontroll av båda fullständiga resultaten.
- **22 separata webbläsartestfall passerade**, 0 fel och 0 hoppade, med lokalt simulerade Microsoft-svar och verklig byggd appkod. De omfattar tidigare spar-, konflikt-, avbrotts- och layoutfall samt sju nya scenarier för lokal och återställd PDF till befintligt namn, uttrycklig kopiekollision, rå-PDF-kollision, cloud-reload, tillfälligt initieringsfel och enskild Förbered ritning-import. Berörda återställnings- och importfall kördes också om efter de sista avgränsade lagrings- och minnesändringarna.
- Den riktiga **Avläsning TEST 9.80** öppnade en genererad **105 908 529 byte** stor projekt-PDF genom sin ordinarie SharePoint-väljare. En arbetsrad ändrades och projektet sparades två gånger till samma ID, mapp och namn, med den nya eTag från föregående kvittens. De faktiskt uppladdade filerna var **105 916 290** respektive **105 916 288 bytes**, i 21 delar vardera. En **ny webbläsarkontext** öppnade sedan de sparade bytesen och återfick samma dörrposition och bock. Synlig procent under hämtningen verifierades också.
- Både lokala och återställda projekt uppdaterar ett befintligt namn i en nästlad mapp två gånger och återöppnas med bocken kvar. Filen med samma namn i en annan mapp lämnas orörd. Växling Samma namn → Ny kopia → Samma namn behåller vald undermapp. En omladdning med två cachade Microsoft-konton återväljer det aktiva kontot, och en extern versionsändring stoppas med det bevarade äldre eTag:et före uppladdning — även när första initieringen misslyckas och nästa lyckas.
- Första sparningen till ett ledigt namn skapar en fil; nästa sparning uppdaterar den. Uttryckligt kopieval, kopiekollision utan överskrivning och en versionskonflikt följd av ett uttryckligt kopieval är också verifierade i webbläsaren.
- Desktop- och telefonvyer har granskats visuellt. Syntax, byggning och `git diff --check` passerar.

Kör kodtester: `npm test` i denna katalog. De direkta testfilerna kan också köras med `node tests/<fil>.test.mjs` för att visa individuella fall. Webbläsartesterna är valbara och körs separat:

```sh
RUN_SHAREPOINT_BROWSER_TESTS=1 CHROMIUM_PATH=/path/to/chromium node tests/save-browser.test.mjs
```

Bygg: `npm run build`. Genererade resurser ska följa med källändringarna. Webbläsarprovet behöver Chromium, Playwright och OpenSSL. Den stora syntetiska filen hämtas från lokal HTTPS och mockuppladdningar strömmas till tillfälliga filer; certifikat, nyckel och stora PDF-filer städas bort efter körningen.

## Omfattning och kvarvarande verklig kontroll

Endast de sju SharePoint-test-HTML-filerna och `sharepoint-test/` ändras. Produktionssidor, ordinarie modul-JavaScript, autentisering, PIN-kontroll och service worker är oförändrade. Den fristående läsdiagnosen förblir read-only.

Ingen faktisk Microsoft-inloggning, skrivbehörighet eller filuppladdning med användarens tenant har utförts här. Webbläsartesterna använder genererade PDF-filer, lokal autentiseringsstubb och lokala Graph-svar. De verifierar inte live-Microsoft-åtkomst, användarens verkliga 100 MB-ritning eller fysisk Safari/iOS. Den stora PDF:ens syntetiska dataström verifierar filstorlek och bevarad projektdata, men motsvarar inte renderingsbelastningen från en stor skannad ritning. `save.liveUploadVerified` är därför fortsatt `false`.

Nästa verkliga kontroll är: öppna projektfilen från Great och rätt undermapp, ändra en bock, **Spara PDF → Samma fil → Spara**, spara igen och kontrollera att samma fil och namn finns kvar. Ladda också om samma flik och kontrollera sparandet efter lokal återställning. Om ett äldre lokalt projekt saknar koppling: välj rätt undermapp och det befintliga filnamnet under **Samma namn** och kontrollera att just den filen uppdateras. Öppna därefter från SharePoint på en annan enhet och kontrollera bock och koppling. Prova den verkliga stora ritningen på avsedd dator/iPad.

Återställningsreferensen gäller samma flik och SmartMatch. En ny flik eller annan enhet öppnar den gemensamma filen från SharePoint; rotmappens sparade ID är en separat koppling. Övriga modulers källbindning är fortfarande minnesbaserad. Ett lokalt projekt utan tidigare molnreferens har ingen känd äldre serverversion: namnsparningen skyddar observerade ändringar från uppslagningen framåt, men kan inte jämföra historiska skillnader mellan en gammal lokal fil och den valda serverfilen. Ingen automatisk sammanslagning eller samtidig realtidsredigering införs.

Omärkta/split/OCR-exporter i ritningsverktyget och fristående rapporter förblir separata exporter. Den fristående läsdiagnosen behåller 25 MiB-gränsen. Filer över 200 MiB ingår inte, och fysisk iPad-minneshantering är inte verifierad.

Microsoft dokumenterar `If-Match` vid skapandet av upload session, men garanterar inte uttryckligen att villkoret återkontrolleras atomiskt när sista delen slutför filen. Kodens versionskontroller stoppar observerade ändringar; de är inte ett bevisat lås mellan samtidiga skribenter. Verklig samtidighetskontroll återstår. Slutkvittensen bygger på metadata, inte på återhämtning och hashjämförelse av hela serverfilen.

Inga kundfiler, autentiseringstoken eller tillfälliga upload-URL:er har lagts till i repot. Se `APP_TEST.md` för behörighetsscope och tekniska avgränsningar.

## Referens

- https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/addressing-driveitems?view=odsp-graph-online
- https://learn.microsoft.com/en-us/graph/api/resources/driveitem?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/driveitem-list-versions?view=graph-rest-1.0
- https://support.microsoft.com/en-us/sharepoint/get-started-with-sharepoint/document-collaboration-and-co-authoring
