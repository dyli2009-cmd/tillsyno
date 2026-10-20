# Avläsning TEST 9.76 – mindre minnestoppar vid PDF-export

Utgår från GitHubs 9.75, commit `de2c2e1dff715a6fd0fd05442388d2b87faec302`, filträd `3fb7dee8853d2ec17a9404a415fbcb9cfc3ecb15`. Ändringen är framtagen lokalt efter rapport om Safari-omstart omkring 47 procent. Det steget behandlar ritningsnoteringar; procenten ensam fastställer inte kraschorsaken.

Ändringar:
- Hela PDF-bygget och återläsningskontrollen köas. Ett nytt försök väntar tills föregående PDF-anrop avslutats, även efter valändring, stängning eller projektbyte. Inaktuella resultat och fel kan inte ersätta den aktuella exporten.
- Rubriktext läses en gång per fysisk dörrkortssida. Endast rubrikkoordinater behålls. På iOS rensas den färdiglästa sidan medan visningen är pausad.
- Upprepade bildnoteringar och identiska textrutor återanvänder PDF-bilden. Textnoteringars tillfälliga bildytor frigörs före PNG-avkodning och även vid fel. PNG överförs som Blob när webbläsaren stöder det.
- iOS textnoteringar begränsas till en miljon bildpunkter och högst 2048 bildpunkter per sida. Vanliga små etiketter behåller befintlig upplösning. Originalritningens vektorer och bilder ändras inte av denna gräns.
- Förloppet 47–50 procent visar vilken notering som behandlas och kan avbrytas mellan noteringarna.

Tester:
- `node tests/smartmatch-export-serialization-v9-76.cjs`
- `node tests/smartmatch-export-header-cache-v9-76.cjs`
- `node tests/smartmatch-note-export-memory-v9-76.cjs`
- `node tests/smartmatch-incremental-save-v9-76.cjs`
- `node tests/smartmatch-ipad-export-memory-v9-76.cjs`
- `SMARTMATCH_TEST_SOURCE_MB=100 node tests/smartmatch-ipad-export-memory-v9-76.cjs`

Noteringstestet använder PDFLib och riktig Canvas för svenska texter, bilder, pilar, rotationer och förskjutna CropBox-ytor samt full export, återläsning och upprepad export. Genererade PDF:er sparas under `work/note-export-v9-76/`. Efter separat Poppler-rendering kan `node tests/smartmatch-note-export-memory-v9-76.cjs --compare-renders` jämföra den synliga första och upprepade exporten.

Webbläsartestet använder Chromium med iPad-identitet och genererad PDF med binär bilaga. Det kontrollerar originalets SHA-256, delningsgest, nedladdning och återöppning med projektdata. Detta motsvarar inte fysisk Safari eller användarens egen stora ritning. Delningsmottagaren är simulerad; Dropbox och OneDrive är inte testade på enheten.

Verifierat lokalt: samtliga ovanstående kodtester, syntax, HTML-resurser och service-worker-lista passerar. Webbläsarflödet passerar med 16 MiB och 100 MiB genererad PDF-bilaga. Popplers bilder är identiska vid upprepad export för alla fyra sidrotationer och förskjutna CropBox-ytor. Testerna visar funktion och identifierade minnesbegränsningar, inte en uppmätt minskning av fysisk Safari-processens minnesbehov.

Slutprov på användarens enhet: öppna samma stora PDF i 9.76, ändra en kontrollpunkt och vänta på lokal sparstatus. Välj Spara och Förbered PDF; anteckna procent, stegnamn och noteringsnummer vid eventuell omstart. Om PDF:en blir klar, spara först i Filer och återöppna den. Prova därefter Dropbox och OneDrive separat.

Full PDF-bearbetning och verifiering finns kvar och kan fortfarande överskrida enhetens minne. Denna ändring minskar identifierade extra allokeringar och hindrar överlappning; den är ingen garanti mot omstart med alla stora PDF:er. Ingen TestFlight-build har skapats.
