# Kontrollflöde – Dörrautomatik

## 1. Version
- **Appversion:** Tillsyno v2.4.591 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Dörrautomatik / Lås 1.8 (v2.4.591: skarp zoom). Det är en gemensam version för Dörrautomatik och Lås, som grupperas som i mappvalet (beslut 7 november 2026). Versionen finns i `versions.json` och visas med liten text på startsidan och i mappvalet. Sidhuvudet i ritningsvyn visar ingen version (ägarens beslut, v2.4.584). Nästa funktionsändring höjer den till 1.9.
- Kontrollflödet är upplåst. Gemensamma regler, motorer och filkarta: [README.md](README.md).

## 2. Arbetsflöde från början till slut
1. Startsidan → **Kontrollflöde** → mappen *Dörrautomatik / Lås* → välj *Checklista revision dörrautomatik* och/eller *Egenkontroll dörrautomatik*.
   - `all-in-one.js` (`applyPicker`) skickar vidare till revisionssidan `controlflow-revision/all-in-one.html?protocols=…`.
   - Där läser `all-in-one-v2.js` vilka protokoll som är valda.
2. **Öppna PDF** (filfältet `#securityFile`):
   - En laddningsruta visar stegen.
   - Filen tolkas en gång med pdf-lib och kontrolleras i den här ordningen:
     1. Är det en sparad arbets-PDF? (`inspectSecurityWorkPdf`)
     2. En äldre Dörrservice-PDF? (`inspectDoorAutomationWorkPdfForAllInOne`)
     3. Ett äldre protokoll från Bluebeam? (importen nedan)
     4. En äldre länkad PDF?
   - Är det en arbets-PDF med objekt väljer användaren mellan *Fortsätt / ändra* och *Ny service*.
3. **Placera dörrautomatiker** på ritningen (`createItem`). De numreras *D1, D2 …* (`nextAutomationSerial`) och får modell, maskintyp och serienummer (`normalizeAutomationIdentity`).
4. **Fyll i kontrollpunkter:** 18 punkter i revisionen och 6 i egenkontrollen.
   - Checklistvyn (v2.4.587, `revision-protocol-v587.*`):
     - Rubriken är bara det öppna objektets protokollnamn, i liten text. Raden med filnamn, projekt och antal objekt visas inte här, och inte heller krysset *Till ritningen*. Fliken *Ritning* leder tillbaka.
     - *Objektuppgifter* ligger överst och är infällda varje gång ett objekt öppnas. Kontrollpunkterna följer direkt under.
     - Saknas uppgifter (till exempel objektnummer eller typ av automatik) visar den infällda raden en röd varning. Nyckeln (egen kontrollpunkt, redigera kontrollpunkter) är oförändrad.
   - För varje punkt väljs *OK*, *Anmärkning* eller *Ej aktuell*, med felval och anmärkningstext.
   - Ett nytt tryck på ett valt svar avmarkerar det, och åtgärdsdatum och signatur rensas då.
5. **Översikt** (`showOverview`) visar objekten och deras status.
   - Den börjar varje gång på *Objekt med anmärkning* (objekt med anmärkning eller fel som inte är åtgärdat). Under *Visa* kan *Alla objekt* väljas.
   - Rubriken är liten och siffrorna kompakta på telefon. *Tillbaka* och *Kundmall* bredvid rubriken finns inte; *Mall* finns i sidhuvudet (v2.4.588, `revision-views-v588.*`).
6. **Kundmall** (`openCustomerPreview`) är en förhandsvisning av ritningssidorna och kundprotokollet. Den har ingen egen nedladdning.
   - Sedan v2.4.590 (`revision-preview-v590.*`) öppnas den som en ruta som är mindre än skärmen. Rutan flyttas med rubriken och ändrar storlek med handtaget i nedre högra hörnet. *‹ 1 / 1 ›* står i mitten, och A− / A+ finns inte.
   - Två fingrar och mushjulet zoomar bara innehållet i rutan, också på protokollsidorna. Appen zoomas inte. Att Safari på iPhone och iPad inte zoomar sidan är *ej verifierat* på riktig enhet.
7. **Spara PDF:** *Spara arbete* (`exportPdf('work')`) eller *Spara som ny PDF* (`newSecurityPdf`, som frågar efter filnamn).
8. **Lämna ritningen:** *Hem* går till startsidan och *Stäng ritning* går tillbaka till *Välj ritning*.
   - Har arbetet ändrats sedan PDF:en sparades eller ritningen öppnades, frågas först: *Spara PDF*, *Lämna (Stäng) utan att spara PDF* eller *Avbryt*.
   - *Spara PDF* öppnar den vanliga sparrutan. När PDF:en är sparad frågar appen om användaren vill gå vidare eller stanna kvar.
   - Utan ändringar går knapparna direkt. Utan öppen ritning är *Hem* en vanlig länk.

## 3. Viktiga funktioner
- **Protokoll:**
  - `SYSTEMS.automation`: 18 punkter, prefix DA.
  - `SYSTEMS.automation_selfcheck`: 6 punkter, prefix DA-E.
- **Kundstil:** bara *Checklista revision dörrautomatik* (`revisionCustomerStyle`). Protokollet har också en returlänk till ritningen i PDF:en.
- **Signatur:** `revision-signature-v6.js`. Signaturen ritas eller skrivs och sparas i projektuppgifterna (`project.signatureImage`/`signature`).
- **Import av äldre protokoll**, bara för Dörrautomatik:
  - `revision-callout-profile-v4.js` läser FreeText-pilar och anteckningar av typen *Allmän info*.
  - `legacy-door-import.js` (Bluebeam) läser P/GoTo-länkar, pilspetsar, pilarnas texter och formulärfält. Filen har ett eget regressionsskydd i sitt sidhuvud.
  - Pilar som inte kan kopplas visas för manuell koppling (`RevisionImportReview`).
- **Tunga ritningar (v2.4.580–581):**
  - **Sparläge** slår till vid ≥ 30 MB, en bild över 16,7 MP, A1 eller större med ≥ 2 MB per sida, eller när en sida tar mer än 1,5 s att rita. På telefon slår det till tidigare: 15 MB, 8,4 MP, A2 med 1 MB per sida, eller 0,8 s.
  - I sparläget ritas sidans bild en gång med högst 3 MP, och zoom förstorar den bilden. Minnet frigörs efter varje ritning och vid sidbyte, och Kundmall ritas med högst 4 MP.
  - En zoom avbryter inte en pågående ritning. Safaris egen sidzoom är avstängd på ritningsytan.
  - **Laddningsrutan** (`drawing-load-progress-v581.*`) visar filnamn, procent och steg, och når 100 % först när sidan visas.
  - Detaljer: [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md).
- **Skarp zoom (v2.4.591, `controlflow-sharp-zoom-v591.js`, delad med Säkerhetsservice och Brand):** samma princip som Acrobat och pdf.js.
  - Sidans bild visas som förut och räcker vid normal zoom. När den inte räcker till för skarp visning (inzoomat, framför allt A1 och A0) ritas **bara det område som syns**, med en marginal på en fjärdedel åt varje håll, i full skärpa. Det sker när man har slutat zooma eller flytta: efter 0,22 s, i sparläge 0,45 s.
  - Flyttar man ritningen visas sidans suddiga bild utanför det skarpa området tills nästa område är ritat. Under en tvåfingerzoom ritas ingen detalj.
  - Detaljbilden har en fast gräns: högst 2,6 miljoner pixlar på telefon och 6 miljoner på iPad och dator, med högst 2 bildpunkter per CSS-pixel. Det finns bara en detaljbild åt gången, och den förra frigörs när en ny visas.
  - Detaljen ligger mellan ritningen och stämplarna och tar inte emot tryck. Den tas bort direkt vid sidbyte, ny fil och *Stäng ritning*, och när man zoomar ut så att sidans bild räcker.
  - Bara en detalj ritas åt gången, och den avbryts inte av zoom eller flyttning. Efter den ritas det senast begärda området.
  - **I sparläge** behålls pdf.js-minnet efter en detaljritning i 5 s på telefon och 9 s på iPad och dator, så att nästa flyttning går fort. Sedan frigörs det, och även när appen läggs i bakgrunden. Sidans bild ritas inte om.
  - Kan en detalj inte ritas visas sidans vanliga bild, och inga fler detaljer ritas för den filen.
  - **Säkerhetsspärr i sparläge:** en detalj kostar ungefär lika mycket minne som att öppna sidan. En sida som tog mer än 4 s att rita första gången på telefon (8 s på iPad och dator) får därför inga detaljer och visas som i sparläget förut. Tar en detaljritning så lång tid ritas inga fler för filen. Mätningar: [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md).
  - Stämplar, export, Kundmall, sparade arbetsfiler och import ändras inte.
- **Ångra och gör om:** upp till 30 steg, bara i minnet (`session-history.js`).
- **Sidhuvud och verktyg (v2.4.584, `revision-header-v584.*`):**
  - En rad: *Hem*, filnamnet, och till höger *Öppna ritning*, *Stäng ritning*, *Mall* och *PDF*. På telefon står filnamnet i raden med antal objekt. Versionsraden finns inte i sidhuvudet.
  - Verktygsraden har *Ångra*, *Gör om* och *Verktyg*, med verktygsikon. Textstorleken (A− / A+) finns inte, och texten visas alltid i 100 %. En större textstorlek som valts i Säkerhetsservice ligger kvar sparad där men används inte här.
  - Verktygsmenyn har ritverktygen och *Precision*, och under dem två rader: *Justera / lås stämplar* och *Lägg till serviceöversikt*. Zoomknapparna finns inte; zoom görs med fingrarna eller mushjulet (motorns `setZoom` är oförändrad).
  - **Stäng ritning** (`closeRevisionDrawing` i motorn) sparar arbetet, släpper ritningen och minnet och visar *Välj ritning*. Arbetet ligger kvar på enheten och kommer tillbaka när samma ritning öppnas.
  - **Ta bort ritobjekt (v2.4.585, `drawing-annotations.js`):** när en text, text med pil, linje, pil eller dörrsymbol är markerad visas en liten *Ta bort*-knapp bredvid den på ritningen. På telefon är knappen bara en ikon. Knappen, och papperskorgen i verktygsmenyn, frågar alltid först: *Ta bort texten? Är du säker? Du kan ångra med Ångra.* med *Avbryt* och *Ta bort*. Knappen döljs när inget är markerat, medan ett objekt dras och när ett ritverktyg används. *Ångra* återställer objektet.
  - **Låsa stämplar** (`security-stamp-selection-v549.*`, delad): *Verktyg → Justera / lås stämplar*. Välj alla, en sida eller enskilda stämplar och tryck *Lås placering*. En låst stämpel kan inte flyttas, men dragning på den panorerar ritningen, och ett tryck markerar den. Ett dubbeltryck öppnar protokollet. Låset syns inte på ritningen (ingen ram, ägarens beslut v2.4.586). Det visas i panelen som *· N låsta*. Valda stämplar får en blå ram medan panelen är öppen.
  - **Ritning, Översikt och Projekt (v2.4.588, `revision-views-v588.*`):**
    - Meddelanderaden visar bara fel (röda) och pågående arbete (text som slutar med …). Förklaringar som *"Tryck där pilen ska peka …"* visas inte.
    - Filnamn och antal objekt står i sidraden bredvid sidpilarna, på dator i verktygsraden. Raden med objekt finns inte längre, och inte heller *Svep*.
    - Ögat (visa/dölj markeringar) ligger i verktygsraden mellan *Gör om* och *Verktyg*. Sidpilarna och ögat följer färgtemat.
    - *Projekt*: ingen modulrubrik, inget kryss och ingen rubrik *Service*. Rubriken *Projekt* och alla formulär finns kvar. *Starta ny service* ligger sist, efter *Beställare*.
  - **Historik (v2.4.590, `controlflow-history-v590.*`, delad med Säkerhetsservice):** *Starta ny service* sparar den avslutade servicen i objektets historik (`serviceHistory`): datum, status, anmärkningar och allmän anmärkning, de senaste 10, nyast först. Alla kontrollpunkter sparas inte.
    - En fil från före v2.4.590 har bara den senaste servicen (`previous*`). Den blir första tidigare post vid nästa *Ny service*.
    - I checklistan finns en gul *Historik*-knapp bredvid nyckeln när objektet har historik. Den öppnar en flyttbar ruta med alla tidigare servicetillfällen. Den gamla rutan *Tidigare service / anmärkningar* visas inte längre.
  - **Färger och Signatur och logga (v2.4.589, `revision-polish-v589.css`):** *Öppna ritning* och *Stäng ritning* har samma färger som *Mall*, ögat och sidpilarna samma som *Ångra*. *Signatur och logga* har mindre knappar bredvid varandra och mindre hjälptexter.
  - **Ändringskontrollen** jämför arbetet (objekt, anteckningar, ritobjekt, projektuppgifter, logotyp) med läget när ritningen öppnades eller PDF:en senast sparades. Motorn meddelar en sparad PDF med händelsen `revision-pdf-saved`.

## 4. Kodfiler och motor
- **Sida:** `controlflow-revision/all-in-one.html`.
- **Motor:** `controlflow-revision/security-v335.js`. Den delas med [Lås](las.md) och används inte av Säkerhetsservice eller Brand.
- **Egna stödfiler i `controlflow-revision/`:**
  - `all-in-one-v2.js`
  - `revision-*`
  - `service-overview-v12.*`
  - `customer-preview-v310.*`
  - `drawing-load-progress-v581.*`
  - den delade `controlflow-sharp-zoom-v591.js` i roten (skarp zoom, också i Säkerhetsservice och Brand)
  - `revision-header-v584.*` (sidhuvud, verktygsmeny och frågan innan ritningen lämnas)
  - `revision-protocol-v587.*` (checklistvyn: rubrik, infällda objektuppgifter med varning)
  - `revision-views-v588.*` (Ritning, Översikt och Projekt: meddelanden, sidrad, öga, översiktens filter, Starta ny service sist)
  - `revision-polish-v589.css` (knappfärger som Mall, kompakt Signatur och logga)
  - `revision-preview-v590.*` (Mall som flyttbar ruta som kan ändra storlek, zoom bara i rutan)
  - kopior av `legacy-door-import.js`, `offline-work-v2.js`, `drawing-transfer-v2.js`, `session-history.js`, `drawing-annotations.js` och `tillsyno-appearance*`
- **Delade Kontrollflödesfiler:** `controlflow-*` och `security-stamp-selection-v549.*`, `security-detectors-v344.*`. Se README.md.
- **Äldre dörrkod på startsidan** (`app.js`, `v2.js`, `reports.js`): har en egen kopia av de 18 punkterna. Om den koden används är *ej verifierat*. Ändra den inte som följd av ändringar här.

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning:** användaren väljer en PDF på enheten. Den läses i webbläsaren med pdf.js och pdf-lib. Ingen fil skickas någonstans.
- **Behandling:** ritningen ritas lokalt. Ritningen identifieras med en SHA-256-kontrollsumma (`fingerprint`).
- **Lagring på enheten:**
  - **localStorage `doorservice-all-in-one:<kontrollsumma>`** innehåller objekt, anteckningar, projektuppgifter (anläggning, kund, adress, order- och AO-nummer, serviceföretag, signatur) och logotyp.
  - Övriga localStorage-nycklar: `doorservice-active-protocols` och textstorlekar.
  - IndexedDB `tillsyno-offline-work` (tabellen `drawings`) sparar den senaste ritningen, så att den kan öppnas igen offline.
  - IndexedDB `doorservice-drawing-transfer-v1` är för överföring från Ritningsverktyg.
- **Export:**
  - En PDF med ritningssidor och stämplar, följt av anmärkningsöversikt och protokoll (`reportDoc`), med interna länkar mellan delarna.
  - Arbetsdata och originalritningen bäddas in i PDF:ens katalog under nyckeln `SecurityServiceWork`. Det gör att PDF:en kan öppnas och arbetet fortsätta.
  - Filnamn: originalfilens namn, annars `allt-i-ett-<objekt>-<datum>.pdf`.
  - Användaren väljer själv var filen sparas.
- **Öppna igen:** arbetsdata i PDF:en går före sparad data på enheten för samma ritning, och sist kommer importen av äldre protokoll.
- **Ändringskontrollen** inför *Hem* och *Stäng ritning* finns bara i minnet och sparar inget på enheten.
- **Historiken** (`serviceHistory`, högst 10 poster per objekt) sparas med objekten på enheten och i arbets-PDF:en (`SecurityServiceWork`). Den skrivs inte ut i kundprotokollet.

## 6. Beroenden till andra moduler
- **Lås** körs på samma sida och i samma motor. Ändringar i motorn eller sidan påverkar båda.
- **Säkerhetsservice och Brand** (`security.js`) påverkas bara via delade `controlflow-*`-filer. Men de använder **samma lagringsnyckel** på enheten (`doorservice-all-in-one:<kontrollsumma>`). Öppnas samma ritning på båda sidorna läses och skrivs samma sparade arbete. Effekten är *ej verifierad*.
- **CE-märkning** nås från samma mapp men är en egen modul utan delad kod.
- **Gemensamma filer** (tema, `style.css`, `vendor/`): se [gemensamt.md](../gemensamt.md).

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026): filerna i `controlflow-revision/` innehåller inga anrop med `fetch`, `XMLHttpRequest`, `sendBeacon` eller Supabase. Sidan laddar inloggning och behörighet (`auth/client.js`, `auth/guard.js`, `auth/module-code-gate.js`), se [system-sakerhet.md](../system-sakerhet.md).
- **Kunduppgifter och ritningar** ligger okrypterade i webbläsarens lagring på enheten och i den exporterade PDF:en. Den exporterade PDF:en innehåller originalritningen och alla projektuppgifter.
- **Ej verifierat:**
  - att ingen data lämnar enheten när appen körs. Det kräver nätverkstestet i kvalitetskontroller.md avsnitt 3E.
  - att *Rensa enhetens data* tömmer alla lagringsplatser ovan.
  - hur service workerns registrering med `?v=2.4.567` i `controlflow-revision/offline.js` påverkar enheten. Den ger en ominstallation av hela appen vid sidbyte, mätt i Chromium. Undersöks i kraschuppgiften.

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow-heavy controlflow-drawing-load-progress controlflow-sharp-zoom security-automation-checklist revision-uncheck revision-header revision-draw-delete stamp-lock-frame revision-protocol revision-views controlflow-polish controlflow-history-preview controlflow-production controlflow-pdf-roundtrip protocol-selection security-protocol-scope
```
- **Senaste körning:** v2.4.591, hela testsviten: 121 tester, 114 godkända, 5 kända fel och 2 överhoppade (de behöver en riktig ritning). `controlflow-sharp-zoom-v591` provar skarp zoom, flyttning, sidbyte, telefonens gräns, sparläget och säkerhetsspärren i Dörrautomatik, Säkerhetsservice och Brand. Se också [kvalitetskontroller.md](../../kvalitetskontroller.md). `revision-header-v584` provar sidhuvudet, verktygsmenyn och frågan innan ritningen lämnas på telefon, iPad och dator. `revision-draw-delete-v585` provar *Ta bort* för alla sex ritobjekt på telefon och dator. `revision-protocol-v587` provar checklistvyn på telefon, iPad och dator. `revision-views-v588` provar Ritning, Översikt och Projekt på telefon, iPad och dator, i ljust och mörkt tema.
- **Ej verifierat på riktig enhet:** sidhuvudet och frågan på iPhone och iPad med Safari, och att nedladdningen av PDF:en blir klar innan användaren väljer att lämna.
- **Kända fel:** inga egna.
- **Pågår separat:** krascher med stora ritningar på riktiga enheter (VANTANDE_PUNKTER.md avsnitt 8, steg 2).
- **Kvar som egna beslut:** läsa texten en gång i `legacy-door-import.js`, prova en nyare pdf.js, och mycket tunga ritningar på äldre iPad.
