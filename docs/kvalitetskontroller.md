# Kvalitetskontroller

Det här dokumentet beskriver vilka kontroller som finns i dag (avsnitt 1) och vilka som är förberedda men **inte införda** (avsnitt 3). Inga GitHub-inställningar, inget CI och inget publiceringsflöde ändras förrän användaren har godkänt det. Varje del godkänns separat.

## 1. Finns i dag

| Kontroll | Var | Körs när |
|---|---|---|
| Testsviten, 109 tester (Playwright, Chromium och Node) | `tools/run-tests.mjs`, `tests/` | Manuellt |
| Kända fel som inte fäller körningen | `tests/known-failures.json` | Med testsviten |
| Bara använda filer publiceras, inga `.md`, `.pdf`, `.dwg` | `tools/build-release.mjs`, `.github/workflows/pages.yml` | Vid push till `main`, **det publicerar direkt** |
| Valfri denylist mot kundnamn | `build-release.mjs --denylist <fil>` | Manuellt |
| `.gitignore` stoppar PDF, DWG, DXF m.fl. | `.gitignore` | Vid commit |

### Testkörning 7 november 2026 (appkod som i `main`)

- **102 passerade, 5 kända fel, 2 hoppades över, 0 föll.** Körtid ca 4 minuter med 4 parallella jobb.
- De som hoppades över är `smartmatch-read-school-v7` och `-v9`. De behöver en riktig ritning via `SMARTMATCH_SCHOOL_PDF`.
- `drawing-ocr-swedish` gick igenom den här gången (FIXED). Felet varierar mellan körningar, så låt det stå kvar i `known-failures.json` tills det har gått igenom flera gånger i rad.

Två saker att känna till när miljön sätts upp:
- Använd **`pdfjs-dist@4.10.38`**, som tests/README.md säger. Kommentaren i `tools/run-tests.mjs` anger 3.11.174. Med den versionen faller tre tester, eftersom `legacy/build/pdf.mjs` saknas.
- `npm install --prefix <mapp>` tar bort länken till Playwright. Skapa den igen efteråt.

## 2. Luckor

1. Testerna körs **inte automatiskt**, och en push till `main` publicerar utan tester.
2. Låsreglerna är bara text. Inget stoppar en ändring i Kontrollflödets filer.
3. Ingenting visar vilka **andra moduler** en ändring påverkar.
4. Inget test larmar om **kontrollpunkterna** i en undermodul ändras.
5. Inget test kontrollerar kundprotokollet för **Brand** eller **Lås** för sig.
6. Inget test visar att **inga kunddata eller ritningar lämnar enheten**.

## 3. Förberedda ändringar (inte införda)

Steg A–D hör till nästa uppgift, *branchskydd och automatiska tester*. Steg E är nätverkstestet för IT-granskningen.

### A. Skydd av `main`, en inställning i GitHub som ägaren gör

**Inställningar** (GitHub → Settings → Rules → Rulesets, eller Branches → *Add branch protection rule* för `main`):

| Inställning | Värde | Varför |
|---|---|---|
| Require a pull request before merging | På | Inga ändringar direkt i `main` |
| Required approvals | **0** | Se förklaringen nedan |
| Require status checks to pass | På: `tests` och `lock-check` (från B och C) | Inget förs in i `main` utan godkända tester |
| Require branches to be up to date | På | Testerna körs mot den senaste `main` |
| Block force pushes | På | Historiken kan inte skrivas om |
| Restrict deletions | På | `main` kan inte raderas |
| Do not allow bypassing (gäller även administratörer) | Rekommenderas | Ägaren går också via PR |

**Varför 0 godkännanden:** GitHub tillåter inte att man godkänner sin egen PR. PR:erna skapas via ditt konto, så krav på ett godkännande skulle låsa allt. Kontrollen ligger i stället i att **bara du trycker på Merge** efter att ha läst PR:en.

**Ordning:** inför B och C först och låt dem gå igenom på en PR. Slå på branchskyddet först därefter. Statuskontrollerna måste ha körts en gång för att kunna väljas.

**Publiceringen** (`pages.yml`) ändras inte. Den publicerar fortfarande vid push till `main`, men med branchskyddet sker det bara efter en godkänd PR.

### B. Tester på varje PR, en ny fil `.github/workflows/tests.yml`

**Utkast** (inte skapat i repot):

```yaml
name: Tests
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
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
      - name: Påverkade moduler
        run: node tools/affected-modules.mjs origin/${{ github.base_ref }} >> "$GITHUB_STEP_SUMMARY"
      - name: Testsviten
        run: node tools/run-tests.mjs --modules "$RUNNER_TEMP/tm/node_modules" --jobs 4 --report report.json
      - name: Byggkontroll (ingen publicering)
        run: node tools/build-release.mjs --out "$RUNNER_TEMP/release"
  lock-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: {fetch-depth: 0}
      - run: node tools/check-locks.mjs origin/${{ github.base_ref }}
        env:
          PR_LABELS: ${{ join(github.event.pull_request.labels.*.name, ',') }}
```

- Hela sviten körs på varje PR (ca 4 minuter plus installation).
- Ingen nyckel och ingen åtkomst till Supabase behövs. Testerna använder bara testdata.
- Workflowen publicerar ingenting.
- **Behöver provas:** att Chromium i GitHubs miljö ger samma resultat som här. Det görs på den första PR:en.

### C. Låskontroll för Kontrollflödet, en ny fil `tools/check-locks.mjs`

- Jämför PR:ens ändrade filer (`git diff --name-only <bas>...HEAD`) med en lista över låsta filer. Listan är densamma som filkartan i [kontrollflode/README.md](moduler/kontrollflode/README.md):
  - `all-in-one.*`, `security*`, `controlflow-*`, `controlflow-revision/**`, `legacy-door-import.js`, `detector-scan-*`, `drawing-annotations-security-v530.js`, `offline-work.js`,
  - de delade `style.css`, `tillsyno-appearance.*`, `offline.js`, `session-history.js`, `drawing-transfer.js`.
- Kontrollen **fäller** om en låst fil har ändrats och PR:en saknar etiketten **`upplåst-kontrollflöde`**. Etiketten sätter bara du.
- Den skriver också ut **vilken motor** som berörs: `security.js` (Säkerhetsservice, Brand), `security-v335.js` (Dörrautomatik, Lås) eller båda, via de delade filerna.
- Låsreglerna ändras inte. Kontrollen bara upprätthåller dem.
- Senare, om du vill: samma mönster för licensreglerna (`auth/`, `supabase/`), med etiketten `upplåst-licens`.

### D. Tester som upptäcker om andra moduler påverkas

| Del | Vad den gör | Fil |
|---|---|---|
| **Påverkade moduler** | Läser vilka sidor som laddar varje ändrad fil, med samma logik som `build-release.mjs` och tabellen i [gemensamt.md](moduler/gemensamt.md). Skriver i PR:en vilka moduler och sidor som berörs, och vilka tester som täcker dem. | `tools/affected-modules.mjs` (ny) |
| **Hela sviten på varje PR** | Ett fel i en annan modul syns även om ändringen verkar lokal | B ovan |
| **Kontrollpunkterna är oförändrade** | Läser `SYSTEMS` ur båda motorerna och jämför varje protokolltyp med en sparad referens. Ändras Dörrautomatik syns det som en ändring av just Dörrautomatiks referens. Säkerhetsservice, Lås och Brand kan inte ändras i smyg. **Motorerna behålls separata.** Testet kräver inte att de är lika, men visar om en typ som finns i båda skiljer sig. | `tests/controlflow-checklist-content.cjs` (nytt), `tests/fixtures/controlflow-checklists.json` (ny) |
| **Kundprotokoll per undermodul** | Skapar ett protokoll per undermodul med testdata. Kontrollerar den gemensamma designen (fältnamn, rubriker, sidfot) och att varje protokoll bara har sina egna punkter. Se [pdf-design.md](moduler/kontrollflode/pdf-design.md) förslag P7. | `tests/controlflow-pdf-design.cjs` (nytt) |

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
- **Hook i Claude Code** (`.claude/settings.json`): varnar vid redigering av låsta filer redan i sessionen.
- **Veckokontroll** (schemalagd uppgift): testsviten mot `main` och Supabases säkerhetsrådgivare. Bara läsning.
- **Inventering av gamla versionsfiler** (`tools/file-usage.mjs`): en rapport, ingen radering. Underlaget finns i avsnitt 5.

## 4. Föreslagna rättningar av dokumenthänvisningar (inte gjorda)

Inga regler eller lås ändras. Bara felaktiga fakta och länkar rättas. I låsfilerna läggs en anteckning till i stället för att regeltexten ändras.

| # | Fil och plats | I dag | Förslag |
|---|---|---|---|
| R1 | DEVELOPMENT_RULES.md avsnitt 4 | "Aktuell version: **v2.4.398**" | "Aktuell version visas i `app.html` (7 november 2026: v2.4.579)." |
| R2 | DEVELOPMENT_RULES.md avsnitt 2A | Projektflödesytan ligger i `project-workspace.html/.css/.js` | Byt filnamnen till `smartmatch-projektering.html` och `smartmatch-projektering-*`. Regeln om isolering står kvar oförändrad. |
| R3 | PROJECTFLOW_ARCHITECTURE.md *Egna filer* | `project-workspace.*` | Samma som R2, plus en hänvisning till [projektering.md](moduler/projektering.md) |
| R4 | DEVELOPMENT_RULES.md avsnitt 4 | Länk till `CE_DESKTOP_357.md` (saknas) | Ta bort länken. Beslutet står redan i samma stycke och i [ce-markning.md](moduler/ce-markning.md). |
| R5 | SMARTMATCH_FUNCTION_RULES_LOCK.md | Länkar till `SMARTMATCH_TEST_V36_*.md`, `SMARTMATCH_READ_TEST_9_28.md` (saknas) | Lägg till en rad överst: "Länkade TEST-dokument finns inte kvar i repot. Regeltexten i den här filen gäller." Regeltexten ändras inte. |
| R6 | README.md | "`tillsyno-admin` motsvarar **version 11**" | Kontrollera versionen i Supabase (läsning) och skriv rätt version. VANTANDE_PUNKTER.md säger 12. |
| R7 | `tools/run-tests.mjs`, kommentar överst | `pdfjs-dist@3.11.174` | `pdfjs-dist@4.10.38`. Bara kommentaren ändras, men det är en ändring i ett verktyg. |
| R8 | tests/README.md | Nämner inte `tests/*-browser.js` | En rad: "`*-browser.js` är manuella QA-skript som laddas i webbläsaren. Testkörningen använder dem inte." |
| R9 | `CONTROLFLOW_LOCK.md` med flera | Ingen hänvisning till den nya strukturen | Ingen ändring. `CLAUDE.md` pekar redan på låsfilerna. |

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
