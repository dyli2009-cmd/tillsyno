# Kvalitetskontroller

Det här dokumentet beskriver vilka kontroller som finns i dag (avsnitt 1) och vilka som är förberedda men **inte införda** (avsnitt 3). Inga GitHub-inställningar, inget CI och inget publiceringsflöde ändras förrän användaren har godkänt det. Varje del godkänns separat.

## 1. Finns i dag

| Kontroll | Var | Körs när |
|---|---|---|
| Testsviten, 112 tester (Playwright, Chromium och Node) | `tools/run-tests.mjs`, `tests/` | Manuellt |
| Kända fel som inte fäller körningen | `tests/known-failures.json` | Med testsviten |
| Bara använda filer publiceras, inga `.md`, `.pdf`, `.dwg` | `tools/build-release.mjs`, `.github/workflows/pages.yml` | Vid push till `main`, **det publicerar direkt** |
| Valfri denylist mot kundnamn | `build-release.mjs --denylist <fil>` | Manuellt |
| `.gitignore` stoppar PDF, DWG, DXF m.fl. | `.gitignore` | Vid commit |

### Testkörning 7 november 2026, v2.4.581 (`main` 3a8190f, plus dokumentationen i PR #10)

| Resultat | Antal | Tester |
|---|---|---|
| Godkända | 105 | bland annat de nya `controlflow-heavy-drawing-v580`, `controlflow-heavy-zoom-v581` och `controlflow-drawing-load-progress-v581` |
| Kända fel (KNOWN) | 4 | `security-detectors-v344`, `security-uncheck-v531`, `security-drawing-rotation`, `smartmatch-position-changes-ui-v9-100` |
| Känt fel som gick igenom (FIXED) | 1 | `drawing-ocr-swedish`. Felet varierar mellan körningar, så låt det stå kvar i `known-failures.json` tills det har gått igenom flera gånger i rad. |
| Överhoppade | 2 | `smartmatch-read-school-v7` och `-v9` (kräver en riktig ritning via `SMARTMATCH_SCHOOL_PDF`) |
| Nya fel | **0** | |

Totalt 112 tester, körtid ca 4,5 minuter med 4 parallella jobb.

Två saker att känna till när miljön sätts upp:
- Använd **`pdfjs-dist@4.10.38`**, som tests/README.md säger. Kommentaren i `tools/run-tests.mjs` anger 3.11.174. Med den versionen faller tre tester, eftersom `legacy/build/pdf.mjs` saknas.
- `npm install --prefix <mapp>` tar bort länken till Playwright. Skapa den igen efteråt.

## 2. Luckor

1. Testerna körs **inte automatiskt**, och en push till `main` publicerar utan tester.
2. Ingenting visar automatiskt vilka **moduler, undermoduler och motorer** en ändring påverkar, också via delade filer.
3. Inget test larmar om **kontrollpunkterna** i en undermodul ändras.
4. Inget test kontrollerar kundprotokollet för **Brand** eller **Lås** för sig.
5. Inget test visar att **inga kunddata eller ritningar lämnar enheten**.

## 3. Förberedda ändringar (inte införda)

Steg A–D hör till nästa uppgift, *branchskydd och automatiska tester*. Steg E är nätverkstestet för IT-granskningen.

### A. Skydd av `main`, en inställning i GitHub som ägaren gör

**Inställningar** (GitHub → Settings → Rules → Rulesets, eller Branches → *Add branch protection rule* för `main`):

| Inställning | Värde | Varför |
|---|---|---|
| Require a pull request before merging | På | Inga ändringar direkt i `main` |
| Required approvals | **0** | Se förklaringen nedan |
| Require status checks to pass | På: `tests` (från B) | Inget förs in i `main` utan godkända tester. Påverkanskontrollen (C) är information och ingen spärr. |
| Require branches to be up to date | På | Testerna körs mot den senaste `main` |
| Block force pushes | På | Historiken kan inte skrivas om |
| Restrict deletions | På | `main` kan inte raderas |
| Do not allow bypassing (gäller även administratörer) | Rekommenderas | Ägaren går också via PR |

**Varför 0 godkännanden:** GitHub tillåter inte att man godkänner sin egen PR. PR:erna skapas via ditt konto, så krav på ett godkännande skulle låsa allt. Kontrollen ligger i stället i att **bara du trycker på Merge** efter att ha läst PR:en.

**Ordning:** inför B–D först och verifiera dem på en PR. Slå på branchskyddet först därefter (ägarens beslut). Statuskontrollen måste ha körts en gång för att kunna väljas.

**Publiceringen** (`pages.yml`) ändras inte. Den publicerar fortfarande vid push till `main`, men med branchskyddet sker det bara efter en godkänd PR.

### B. Tester på varje PR, en ny fil `.github/workflows/tests.yml`

**Utkast** (inte skapat i repot):

```yaml
name: Tests
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
jobs:
  tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with: {fetch-depth: 0}
      - uses: actions/setup-node@v4
        with: {node-version: '22'}
      - name: Installera testverktyg (utanför repot)
        run: |
          npm install --prefix "$RUNNER_TEMP/tm" playwright @napi-rs/canvas pdf-lib@1.17.1 pdfjs-dist@4.10.38
          npx --prefix "$RUNNER_TEMP/tm" playwright install --with-deps chromium
          pip install --target "$RUNNER_TEMP/tm/python" pymupdf
      - name: Påverkan (information, ingen spärr)
        run: node tools/affected-modules.mjs origin/${{ github.base_ref }} >> "$GITHUB_STEP_SUMMARY"
      - name: Testsviten
        run: node tools/run-tests.mjs --modules "$RUNNER_TEMP/tm/node_modules" --jobs 4 --report report.json
      - name: Byggkontroll (ingen publicering)
        run: node tools/build-release.mjs --out "$RUNNER_TEMP/release"
```

- Hela sviten körs på varje PR (ca 4,5 minuter plus installation).
- Ingen nyckel och ingen åtkomst till Supabase behövs. Testerna använder bara testdata.
- Workflowen publicerar ingenting.
- **Behöver provas:** att Chromium i GitHubs miljö ger samma resultat som här. Det görs på den första PR:en.

### C. Påverkanskontroll utan spärr, en ny fil `tools/affected-modules.mjs`

**Beslut 7 november 2026 (alternativ A):** Kontrollflödet förblir upplåst. Inget lås och ingen upplåsningsetikett återinförs. Varje ändring ska i stället **visa** vad den påverkar, och de relevanta testerna ska köras.

- **Vad kontrollen gör:**
  - Läser PR:ens ändrade filer (`git diff --name-only <bas>...HEAD`).
  - Tar fram vilka sidor som laddar varje fil, med samma logik som `build-release.mjs` (sidornas `<script>`- och `<link>`-taggar, samt `sw.js`).
  - Översätter sidorna till moduler och undermoduler enligt filkartorna i `docs/moduler/`.
- **Vad den skriver i PR:ens sammanfattning:**

  | Rad | Exempel |
  |---|---|
  | Moduler som berörs | *Kontrollflöde: Dörrautomatik, Lås* |
  | Motor | *revisionsmotorn `security-v335.js`* (eller `security.js` (Säkerhetsservice, Brand), eller båda via delade filer som `controlflow-*`) |
  | Delade filer | *`tillsyno-appearance.css` → 9 sidor, 7 moduler* |
  | Projekteringsfiler som SmartMatch laddar | *Projektering + Avläsning/SmartMatch* |
  | Tester som täcker de berörda delarna | namnfilter till `run-tests.mjs`, t.ex. `controlflow- security- smartmatch-` |
  | Bara dokumentation ändrad | anges särskilt |

- **Ingen spärr:** kontrollen fäller aldrig PR:en. Det som stoppar är testerna i B, och de körs i sin helhet.
- **Samma uppgifter i Claudes plan:** innan kod ändras redovisas påverkan på samma sätt (CLAUDE.md avsnitt 1 och 3).
- Låsta regler som fortfarande finns (licens, SmartMatch, UI) ändras inte av kontrollen.

### D. Tester som upptäcker om andra delar påverkas

| Del | Vad den gör | Fil |
|---|---|---|
| **Hela sviten på varje PR** | Ett fel i en annan modul syns även om ändringen verkar lokal | B ovan |
| **Kontrollpunkterna är oförändrade** | Läser `SYSTEMS` ur båda motorerna och jämför varje protokolltyp med en sparad referens. Ändras Dörrautomatik syns det som en ändring av just Dörrautomatiks referens. Säkerhetsservice, Lås och Brand kan inte ändras i smyg. **Motorerna behålls separata.** Testet kräver inte att de är lika, men visar om en typ som finns i båda skiljer sig. | `tests/controlflow-checklist-content.cjs` (nytt), `tests/fixtures/controlflow-checklists.json` (ny) |
| **Kundprotokoll per undermodul** | Skapar ett protokoll per undermodul med testdata. Kontrollerar den gemensamma designen (fältnamn, rubriker, sidfot) och att varje protokoll bara har sina egna punkter. Se [pdf-design.md](moduler/kontrollflode/pdf-design.md) förslag P7. Testet ändrar inte PDF-designen. | `tests/controlflow-pdf-design.cjs` (nytt) |
| **Lås på revisionssidan** | Öppnar *Checklista revision lås* ensamt och kontrollerar att sparläge och laddningsruta (v2.4.580–581) fungerar även där. I dag provas bara `automation`. | utökning av `tests/controlflow-heavy-drawing-v580.cjs` eller ett nytt test |

Inget av detta ändrar appens kod.

### E. Nätverkstest: lämnar kunddata eller ritningar enheten?

**Syfte:** visa med en mätning, inte ett antagande, att ritningar, PDF-innehåll och kunduppgifter stannar på enheten. Resultatet blir en rapport som underlag till IT.

**Testdata (bara syntetiska):**
- En genererad PDF-ritning med unika markörer, till exempel `TSY-MARKOR-7Q4K` som text i ritningen och i ett dörrkort.
- Kunduppgifter som också innehåller markörer: anläggning `TSY-ANL-7Q4K`, kund `TSY-KUND-7Q4K`, adress, ordernummer.
- Inga riktiga kunduppgifter och inga riktiga ritningar.

**Vad testet gör, per modul** (Kontrollflöde båda sidorna, Avläsning + SmartMatch, Projektering, CE-märkning och Ritningsverktyg):
1. Öppnar sidan via en lokal testserver, med samma förberedelse som övriga tester (`tools/test-preload.cjs`).
2. Öppnar test-PDF:en, fyller i kunduppgifterna, placerar stämplar eller kopplar dörrkort, och sparar eller exporterar PDF.
3. **Lyssnar** på all nätverkstrafik utan att avlyssna och ändra den, så att service workern fungerar som vanligt:
   - sidans och service workerns anrop, inklusive `fetch`, `XMLHttpRequest`, `sendBeacon` och WebSocket,
   - via Playwrights händelser på kontextnivå, eller Chromiums DevTools-protokoll.

**Godkänt när:**
- Inga anrop går till andra värdar än den egna testservern och Supabase-projektet `vczdugrwcivnotjltarm.supabase.co`.
- Till Supabase går bara de förväntade ändpunkterna:
  - inloggning (`/auth/v1/...`),
  - `tillsyno_access`,
  - `tillsyno_module_codes`,
  - `rpc/tillsyno_verify_module_code`,
  - `rpc/tillsyno_verify_read_code`,
  - `functions/v1/tillsyno-admin` (bara administrationen).
- **Ingen** URL, header eller request-body innehåller någon av markörerna, PDF-data (`%PDF`) eller ritningens innehåll i base64.

**Rapport till IT:** en tabell per modul och steg som visar kontaktade värdar, antal anrop och byte, om någon markör hittades, och datum och appversion. Rapporten sparas som JSON och som en kort sammanfattning som kan klistras in i IT-underlaget.

**Begränsningar som ska stå i rapporten:**
- Testet täcker de arbetsflöden som körs, inte alla tänkbara vägar. Det kompletteras med kodgenomgången i [system-sakerhet.md](moduler/system-sakerhet.md).
- Chromium är inte Safari på iPhone eller iPad.
- Användarens eget val av lagringsplats (Filer, Dropbox, OneDrive) ligger utanför appen och mäts inte.

**Fil:** `tests/network-no-customer-data.cjs` (nytt). Testet ändrar ingen appkod och kontaktar inte Supabase på riktigt, eftersom testerna inte har inloggning. Om du vill att även en riktig inloggning mot Supabase mäts krävs ett separat testkonto och ett eget beslut.

### F. Övrigt, valfritt och senare

- **Granskning före PR:** `/code-review` på ändringarna. `/security-review` när `auth/`, `supabase/`, `sw.js`, lagring eller PDF-import berörs.
- **Hook i Claude Code** (`.claude/settings.json`): visar påverkan (C) redan när en fil redigeras i sessionen. Ingen spärr.
- **Veckokontroll** (schemalagd uppgift): testsviten mot `main` och Supabases säkerhetsrådgivare. Bara läsning.
- **Inventering av gamla versionsfiler** (`tools/file-usage.mjs`): en rapport, ingen radering. Underlaget finns i avsnitt 5.

## 4. Föreslagna rättningar av dokumenthänvisningar (inte gjorda)

Inga regler eller lås ändras. Bara felaktiga fakta och länkar rättas. I låsfilerna läggs en anteckning till i stället för att regeltexten ändras.

| # | Fil och plats | I dag | Förslag |
|---|---|---|---|
| R1 | DEVELOPMENT_RULES.md avsnitt 4 | "Aktuell version: **v2.4.398**" | "Aktuell version visas i `app.html` (7 november 2026: v2.4.581)." |
| R2 | DEVELOPMENT_RULES.md avsnitt 2A | Projektflödesytan ligger i `project-workspace.html/.css/.js` | Byt filnamnen till `smartmatch-projektering.html` och `smartmatch-projektering-*`. Regeln om isolering står kvar oförändrad. |
| R3 | PROJECTFLOW_ARCHITECTURE.md *Egna filer* | `project-workspace.*` | Samma som R2, plus en hänvisning till [projektering.md](moduler/projektering.md) |
| R4 | DEVELOPMENT_RULES.md avsnitt 4 | Länk till `CE_DESKTOP_357.md` (saknas) | Ta bort länken. Beslutet står redan i samma stycke och i [ce-markning.md](moduler/ce-markning.md). |
| R5 | SMARTMATCH_FUNCTION_RULES_LOCK.md | Länkar till `SMARTMATCH_TEST_V36_*.md`, `SMARTMATCH_READ_TEST_9_28.md` (saknas) | Lägg till en rad överst: "Länkade TEST-dokument finns inte kvar i repot. Regeltexten i den här filen gäller." Regeltexten ändras inte. |
| R6 | README.md | "`tillsyno-admin` motsvarar **version 11**" | Kontrollera versionen i Supabase (läsning) och skriv rätt version. VANTANDE_PUNKTER.md säger 12. |
| R7 | `tools/run-tests.mjs`, kommentar överst | `pdfjs-dist@3.11.174` | `pdfjs-dist@4.10.38`. Bara kommentaren ändras, men det är en ändring i ett verktyg. |
| R8 | tests/README.md | Nämner inte `tests/*-browser.js` | En rad: "`*-browser.js` är manuella QA-skript som laddas i webbläsaren. Testkörningen använder dem inte." |
| R9 | `CONTROLFLOW_LOCK.md` | Rubriken *Senaste beställda ändring* står ovanför den äldsta posten (v2.4.252) | Ingen ändring nu. Kan rubriceras som *Historik* vid tillfälle. Innehållet är redan uppdaterat för upplåsningen i v2.4.581. |

## 5. Underlag: gamla versionsfiler (rapport, ingen radering)

Underlag från 7 november 2026, som behöver verifieras innan något åtgärdas:

| Grupp | Filer | Storlek |
|---|---|---|
| Laddas bara av administratörernas testsidor (`smartmatch-read-test.html`, `smartmatch-slr-test.html`) | `smartmatch-read-main-v9-94.js`, `smartmatch-main-v524.js`, `smartmatch-read-v9-100.js`, `smartmatch-slr-test-module-v36-132.js`, `smartmatch-session-v36-77.js`, `smartmatch-read-codes-v9-6.js`, `smartmatch-read-equipment-symbols-v9-85.js`, `smartmatch-compact-workspace-v9-94.js`, `smartmatch-read-access-v9-85.js` | ca 1,3 MB |
| Laddas inte av någon sida, bara via `require()` i Node och listade i `sw.js` | `smartmatch-projektering-v2-19-data.js`, `-v2-19-pdf.js`, `-v511-data.js` | ca 230 kB |
| Publiceras inte | `templates/checklista-revision-v1/` (äldre mall) | — |
| Äldre kod på startsidan, användning okänd | `app.js`, `v2.js`, `reports.js` | ca 150 kB |
| Fristående Säkerhetsservice, användning okänd | `security.html` | — |
| Manuella QA-skript | `tests/*-browser.js` (9 filer) | — |
