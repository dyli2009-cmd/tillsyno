# Kontrollflöde – Säkerhetsservice

## 1. Version
- **Appversion:** Tillsyno v2.4.591 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Säkerhetsservice 1.4 (v2.4.586: låsta stämplar utan ram; v2.4.589: läsbar historik i mörka teman; v2.4.590: Historik-knapp och flera års historik; v2.4.591: sparläge för tunga ritningar och skarp zoom). Versionen finns i `versions.json` och visas med liten text på startsidan, i mappvalet och i modulens sidhuvud.
- Kontrollflödet är upplåst. Gemensamma regler och filkarta: [README.md](README.md).

## 2. Arbetsflöde från början till slut
1. Startsidan → **Kontrollflöde** → mappen *Säkerhetsservice* → välj ett eller flera av *Detektorer*, *Inbrottslarm*, *Lås & Dörrmiljö* och *Passer*. Sidan stannar på `all-in-one.html`. Valen sparas i `doorservice-all-in-one-active-protocols`.
2. **Öppna PDF** (`#securityFile`, hanteras i `security.js` ca rad 895):
   - Är det en arbets-PDF väljer användaren *Fortsätt / ändra* eller *Ny service*.
   - *Ny service* behåller projektuppgifter, logotyp, objekt och tekniker.
   - Äldre PDF:er importeras genom att texten tolkas (`typeFromText`), bara för de valda protokollen.
3. **Placera objekt** med knapparna för de valda protokollen, eller med detektorsökningen (avsnitt 3).
4. **Fyll i kontrollpunkter** (*OK*, *Anmärkning* eller *Ej aktuell*), felval, anmärkning och bedömning per objekt.
5. **Översikt** *Fel och anmärkningar*. `security-service-overview-v554.js` lägger dessutom en sammanfattningsruta på ritningens första sida (`project.serviceOverview`).
6. **Kundmall** är en förhandsvisning av ritning och protokoll.
7. **Spara PDF:** *Spara arbete* eller *Spara som ny PDF*. *Ny PDF* föreslår namnet `<namn>-kopia.pdf`.

## 3. Viktiga funktioner
- **Protokoll:**

  | Protokoll | Nyckel | Prefix | Punkter |
  |---|---|---|---|
  | Detektorer | `detector` | DET | 1 |
  | Inbrottslarm | `alarm` | I | 10 |
  | Lås & Dörrmiljö | `lock` | L | 13 |
  | Passer | `access` | P | 7 |

  *Lås & Dörrmiljö* är ett eget protokoll, skilt från *Checklista revision lås* ([las.md](las.md)). Båda behålls där de ligger.
- **Automatisk detektorsökning, helt på enheten:**
  1. *Markera exempel*: användaren visar en detektor på ritningen.
  2. *Skanna ritningen* i läget *Normal* eller *Noggrann*:
     - `detector-scan-core.js` söker i ritningens vektorer och bilder.
     - `detector-scan-vision.js` läser numren med Tesseract från `vendor/tesseract/`.
  3. `applyHits` skapar nya detektorobjekt eller kopplar till befintliga. Osäkra träffar läggs i `project.detectorPending` och granskas under *Granska osäkra*.
  4. Resultatet sparas i `project.detectorScanSummary` och `project.detectorSetup`.
- **Manuell numrering:** ett enskilt objekt eller en löpande serie med steget ±1 (`security-manual-numbering.js`). Bara den sista sifferserien ändras, och inledande nollor behålls, t.ex. U1033 → U1034.
- **Identitet:**
  - Objektets id eller nummer plus protokollnamnet (`securityObjectIdentity`).
  - I kundprotokollet visas detektorer med *ID / märkning*, *Placering*, *Bedömning* och *AO nummer* (`detectorIdentityCell`).
  - Detektorkoden lagras i objektets `id`.
- **Ångra och gör om:** upp till 30 steg, bara i minnet.
- **Historik** (v2.4.590, `controlflow-history-v590.*`, delad med Dörrautomatik / Lås): *Starta ny service* sparar den avslutade servicen i objektets historik (`serviceHistory`, status och anmärkningar, de senaste 10). En gul *Historik*-knapp bredvid nyckeln öppnar en flyttbar ruta med alla tidigare servicetillfällen. Historiken sparas i arbets-PDF:en. Säkerhetsservice läser tillbaka arbetet från arbets-PDF:en (inte från enheten när samma ritning öppnas igen), vilket är oförändrat.
- **Ritningsvyn** (`security-drawing-view.js`) ritar sidan i Säkerhetsservice och Brand och ersätter motorns egen ritning. Geometrin ändras direkt vid zoom, och bilden kommer efter.
- **Tunga ritningar (v2.4.591, samma utformning som Dörrautomatik v2.4.580–581):**
  - **Sparläge** slår till vid samma gränser som i Dörrautomatik: ≥ 30 MB, en bild över 16,7 MP, A1 eller större med ≥ 2 MB per sida, eller när en sida tar mer än 1,5 s att rita. På telefon: 15 MB, 8,4 MP, A2 med 1 MB per sida, eller 0,8 s. Sidraden visar *Sida X / N · Sparläge* och meddelandet börjar med *Stor ritning – visas i sparläge.*
  - I sparläget ritas sidans bild en gång med högst 3 MP, zoom förstorar bilden och pdf.js-minnet frigörs efter varje ritning. Utan sparläge ritas sidans bild om vid zoom upp till 4 MP, som förut.
  - En pågående ritning av den sida som visas avbryts inte längre av zoom eller flyttning, bara av byte av sida, rotation eller fil. Förut avbröts den vid varje zoomsteg, och pdf.js läste då in hela sidan igen.
  - Kan en sida inte ritas görs ett nytt försök i sparläge. Lyckas inte heller det visas ett fel.
  - Sidan man lämnar frigörs vid sidbyte. Den tillfälliga ritytan frigörs direkt. Safaris egen sidzoom är avstängd på ritningsytan.
  - Kundmall ritas med högst 4 MP i sparläge, ritningens minne frigörs innan Kundmall byggs och Kundmalls PDF stängs när rutan stängs.
  - De två kontrollerna av arbetsfiler delar en pdf-lib-tolkning när filen öppnas.
- **Skarp zoom (v2.4.591, `controlflow-sharp-zoom-v591.js`, delad med Dörrautomatik / Lås):** när sidans bild inte räcker till för skarp visning ritas bara det område som syns, med en fjärdedels marginal, i full skärpa när man har slutat zooma eller flytta. Gränser, minne och beteende är desamma som i [dorrautomatik.md](dorrautomatik.md) avsnitt 3. Detaljen följer ritningens rotation. Den ersätter ritningsvyns tidigare egna detaljbild, som hade högst 2,5 MP och avbröts vid varje zoomsteg.
- **Låsa stämplar** (`security-stamp-selection-v549.*`, delad med Dörrautomatik / Lås): *Justera / lås stämplar*, därefter *Lås placering*. En låst stämpel kan inte flyttas, men den går att trycka på. Sedan v2.4.586 har en låst stämpel ingen ram på ritningen. Låset visas i panelen som *· N låsta*.

## 4. Kodfiler och motor
- **Sida:** `all-in-one.html`, där protokollväljaren finns i `all-in-one.js`.
- **Motor:** `security.js`, som delas med [Brand](brand.md) men inte med Dörrautomatik eller Lås.
- **Egna filer:**

  | Funktion | Filer |
  |---|---|
  | Detektorer | `security-detectors-v344.*`, `security-detector-scan.*`, `detector-scan-core.js`, `detector-scan-vision.js`, `security-manual-numbering.js`, `security-manual-sequence-v544.css` |
  | Översikt | `security-service-overview-v554.*` |
  | Arbetsyta | `security-toolbar-v543.*`, `security-stamp-selection-v549.*`, `security-drawing-view.js` (ritningsvyn, sparläge) och den delade `controlflow-sharp-zoom-v591.js` (skarp zoom) |
  | Layout | `security-*-compact-v52x.css`, `security-overview-*-v530.*`, `security-result-labels-v529.css`, `security-workspace-*` |

- **Delas med revisionssidan:** `security-detectors-v344.*` (med en äldre `?v=2.4.359`), `security-stamp-selection-v549.*` och `controlflow-*`.
- **Fristående `security.html`:** samma `security.js`, ritningsvy och skarpa zoom utan `ALL_IN_ONE`, och därmed andra lagringsnycklar (`security-service:`), ingen import av brand eller automatik, och inte `security-detectors-v344.*`. Den länkas från en dold panel i `app.html`. Om användare når den är *ej verifierat*.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning:** användaren väljer en PDF på enheten. Den läses lokalt med pdf.js och pdf-lib. Detektorsökning och OCR körs lokalt.
- **Lagring på enheten:**
  - **localStorage `doorservice-all-in-one:<kontrollsumma>`** innehåller objekt, anteckningar, projektuppgifter och logotyp. Varje ritning har också suffixen `:view-rotations` och `:closed-file`.
  - Övriga localStorage-nycklar: protokollval och textstorlekar.
  - IndexedDB `tillsyno-offline-work` (tabellen `drawings`) sparar ritningen och de valda protokollen, så att arbetet kan öppnas igen offline.
- **Export:**
  - En PDF med ritningen och stämplarna, följt av översikt och protokoll (`exportPdf` och `reportDoc`).
  - Arbetsdata och originalritningen bäddas in under nyckeln `SecurityServiceWork`.
  - Vid öppning läses nycklarna `DoorserviceAllInOneWork`, `SecurityServiceWork` och `SecurityDetectorTestWork`.
  - Filnamn: källfilens namn, annars projekt- eller anläggningsnamnet.

## 6. Beroenden till andra moduler
- **Brand** körs i samma motor och på samma sida. Ändringar i `security.js` påverkar båda, och dessutom `security.html`.
- **Dörrautomatik och Lås** körs i en annan motor och påverkas bara via delade filer. De använder **samma lagringsnyckel** för samma ritning, se [dorrautomatik.md](dorrautomatik.md) avsnitt 6.
- **Gemensamma filer:** se [gemensamt.md](../gemensamt.md).

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026): `security.js`, `security-*.js`, `detector-scan-*.js`, `all-in-one.js`, `offline-work.js` och `session-history.js` gör inga nätverksanrop. Tesseract och språkdata laddas från appens egen `vendor/tesseract/`.
- **Kunduppgifter och ritningar** ligger okrypterade i webbläsarens lagring på enheten och i den exporterade PDF:en.
- **Ej verifierat:**
  - att ingen data lämnar enheten när appen körs (nätverkstestet, kvalitetskontroller.md avsnitt 3E),
  - att *Rensa enhetens data* tömmer allt.
- **Felaktig text:** felmeddelandet för OCR säger *"Kontrollera anslutningen"*, men OCR körs lokalt.

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules security- detector- controlflow-
```
- `controlflow-sharp-zoom-v591` provar skarp zoom (också roterad ritning), telefonens gräns och sparläget med Säkerhetsservice och Brand valda.
- **Kända fel** (`tests/known-failures.json`):
  - `security-detectors-v344`: testet hittar ingen detektor efter tryck på ritningen.
  - `security-uncheck-v531`: andra trycket på samma svar. Önskat beteende behöver bekräftas.
  - `security-drawing-rotation`: testritningen öppnas inte.
- **Ej verifierat på riktig enhet:** skarp zoom och sparläge på iPhone och iPad (Safari och appen i TestFlight), och med den riktiga tunga ritningen.
