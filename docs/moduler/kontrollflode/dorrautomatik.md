# Kontrollflöde – Dörrautomatik

## 1. Version
- **Appversion:** Tillsyno v2.4.583 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Dörrautomatik / Lås 1.0. Det är en gemensam version för Dörrautomatik och Lås, som grupperas som i mappvalet (beslut 7 november 2026). Versionen finns i `versions.json` och visas med liten text på startsidan, i mappvalet och i modulens sidhuvud. Kraschrättningen höjer den till 1.1.
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
   - För varje punkt väljs *OK*, *Anmärkning* eller *Ej aktuell*, med felval och anmärkningstext.
   - Ett nytt tryck på ett valt svar avmarkerar det, och åtgärdsdatum och signatur rensas då.
5. **Översikt** (`showOverview`) visar alla objekt och deras status.
6. **Kundmall** (`openCustomerPreview`) är en förhandsvisning av ritningssidorna och kundprotokollet. Den har ingen egen nedladdning.
7. **Spara PDF:** *Spara arbete* (`exportPdf('work')`) eller *Spara som ny PDF* (`newSecurityPdf`, som frågar efter filnamn).

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
  - I sparläget ritas sidan en gång med högst 3 MP, och zoom förstorar bilden. Minnet frigörs efter varje ritning och vid sidbyte, och Kundmall ritas med högst 4 MP.
  - En zoom avbryter inte en pågående ritning. Safaris egen sidzoom är avstängd på ritningsytan.
  - **Laddningsrutan** (`drawing-load-progress-v581.*`) visar filnamn, procent och steg, och når 100 % först när sidan visas.
  - Detaljer: [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md).
- **Ångra och gör om:** upp till 30 steg, bara i minnet (`session-history.js`).

## 4. Kodfiler och motor
- **Sida:** `controlflow-revision/all-in-one.html`.
- **Motor:** `controlflow-revision/security-v335.js`. Den delas med [Lås](las.md) och används inte av Säkerhetsservice eller Brand.
- **Egna stödfiler i `controlflow-revision/`:**
  - `all-in-one-v2.js`
  - `revision-*`
  - `service-overview-v12.*`
  - `customer-preview-v310.*`
  - `drawing-load-progress-v581.*`
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
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow-heavy controlflow-drawing-load-progress security-automation-checklist revision-uncheck controlflow-production controlflow-pdf-roundtrip protocol-selection security-protocol-scope
```
- **Senaste körning:** godkänd (v2.4.581), se [kvalitetskontroller.md](../../kvalitetskontroller.md).
- **Kända fel:** inga egna.
- **Väntar (ägarens beslut):** krascher med stora ritningar på **iPhone**. På iPad fungerar de. Även Adobe Acrobat är långsam med samma fil på telefonen. Se VANTANDE_PUNKTER.md avsnitt 8, steg 2.
- **Kvar som egna beslut:** läsa texten en gång i `legacy-door-import.js`, prova en nyare pdf.js, och mycket tunga ritningar på äldre iPad.
