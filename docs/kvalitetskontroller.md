# Kvalitetskontroller

Det här dokumentet beskriver vilka kontroller som finns i dag och vilka som är föreslagna. **Inget i avsnitt 3 är infört.** Varje förslag ska godkännas separat innan CI, GitHub-inställningar eller hooks ändras.

## 1. Finns i dag

| Kontroll | Var | Körs när |
|---|---|---|
| Testsviten, 109 tester (Playwright, Chromium och Node) | `tools/run-tests.mjs`, `tests/` | Manuellt |
| Kända fel som inte fäller körningen | `tests/known-failures.json` | Med testsviten |
| Bara använda filer publiceras, inga `.md`, `.pdf`, `.dwg` | `tools/build-release.mjs`, `.github/workflows/pages.yml` | Vid push till `main`, **det publicerar direkt** |
| Valfri denylist mot kundnamn | `build-release.mjs --denylist <fil>` | Manuellt |
| `.gitignore` stoppar PDF, DWG, DXF m.fl. | `.gitignore` | Vid commit |

### Testkörning 7 november 2026 (branch `claude/tillsyno-development-strategy-nxinn3`, appkod som i `main`)

- **102 passerade, 5 kända fel, 2 hoppades över, 0 föll.**
- De som hoppades över är `smartmatch-read-school-v7` och `-v9`. De behöver en riktig ritning via `SMARTMATCH_SCHOOL_PDF`.
- `drawing-ocr-swedish` gick igenom den här gången (FIXED). Felet varierar mellan körningar, så låt det stå kvar i `known-failures.json` tills det har gått igenom flera gånger i rad.

Två saker att känna till när miljön sätts upp:
- Använd **`pdfjs-dist@4.10.38`**, som tests/README.md säger. Kommentaren överst i `tools/run-tests.mjs` anger 3.11.174. Med den versionen faller `controlflow-return-links-v551`, `protocol-selection-pdf-v556` och `security-service-overview-v554`, eftersom `pdfjs-dist/legacy/build/pdf.mjs` saknas.
- `npm install --prefix <mapp>` tar bort länken till Playwright. Skapa den igen efteråt med `ln -sfn "$(npm root -g)/playwright" <mapp>/node_modules/playwright`.

## 2. Luckor

1. Testerna körs **inte automatiskt**. En push till `main` publicerar utan att något test har körts.
2. Låsreglerna är bara text. Inget stoppar en ändring i Kontrollflödets filer.
3. Inget test kontrollerar att **kontrollpunkterna** i en undermodul är oförändrade, eller att de två kopiorna av `SYSTEMS` är lika.
4. Inget test kontrollerar kundprotokollet för **Brand** eller **Lås** för sig.
5. Det finns inget test som visar att **inga kunddata lämnar enheten**.
6. Det finns ingen automatisk säkerhetsgranskning av ändringar.

## 3. Förslag, i rekommenderad ordning

### A. Skydda `main` och kör tester på varje PR (inställning + CI, godkänns separat)

- **Branchskydd för `main`:**
  - ändringar bara via PR,
  - krav på godkänd testkörning,
  - ingen force-push.
  - Det görs i GitHub → Settings → Branches av ägaren.
- **Ny workflow `.github/workflows/tests.yml` på `pull_request`:**
  1. Installera Node 22, Playwright och Chromium, samt `@napi-rs/canvas`, `pdf-lib@1.17.1`, `pdfjs-dist@4.10.38` och PyMuPDF.
  2. `node tools/run-tests.mjs --modules ... --report report.json`
  3. `node tools/build-release.mjs`, så att en trasig `CORE`-lista stoppas före publicering.
  4. Låskontrollen (B) och innehållskontrollen (C).
- **Tid:** hela sviten tog ca 4 minuter med 4 parallella jobb i molnsessionen den 7 november 2026. Installationen tillkommer. Hela sviten på varje PR är därför rimligt, och ett urval per modul behövs inte.

### B. Låskontroll för Kontrollflödet (skript + CI)

- Ett litet skript, `tools/check-locks.mjs`, med en lista över låsta filer. Listan är densamma som filkartan i [docs/moduler/kontrollflode/README.md](moduler/kontrollflode/README.md):
  - `all-in-one.*`, `security*`, `controlflow-*`, `controlflow-revision/**`
  - `legacy-door-import.js`, `detector-scan-*`
  - de delade `style.css`, `tillsyno-appearance.*`, `offline.js`, `session-history.js`, `drawing-transfer.js`
- I en PR fäller skriptet om någon av filerna har ändrats och PR:en saknar etiketten **`upplåst-kontrollflöde`**. Etiketten sätts bara av ägaren.
- Samma mönster kan senare användas för andra låsta regler, t.ex. en etikett `upplåst-licens` för `auth/` och `supabase/`.
- Låsreglerna ändras inte. Kontrollen bara upprätthåller dem.

### C. Test som låser innehållet i kontrollpunkterna (nytt test, ingen appkod)

`tests/controlflow-checklist-content.cjs` läser `SYSTEMS` ur `security.js` och `controlflow-revision/security-v335.js` och kontrollerar:
- att båda kopiorna är identiska (det är de i dag, alla 10 typerna),
- att innehållet matchar en sparad referens per undermodul i `tests/fixtures/controlflow-checklists.json`.

En ändring i Dörrautomatikens punkter syns då som en avsiktlig ändring av referensfilen för just Dörrautomatik. Säkerhetsservice, Lås och Brand kan inte ändras i smyg.

### D. PDF-test per undermodul (nytt test)

Skapa ett kundprotokoll per undermodul med testdata. Kontrollera sidhuvud, kundfält och rubriker (lager 1 i [pdf-design.md](moduler/kontrollflode/pdf-design.md)), och att varje protokoll bara innehåller sina egna punkter (lager 3). Testet behövs innan PDF-designen eventuellt bryts ut till en gemensam fil.

### E. Nätverkstest: inga kunddata lämnar enheten (nytt test)

Ett Playwright-test öppnar Kontrollflöde, Avläsning + SmartMatch, Projektering och CE med en syntetisk ritning, arbetar och sparar PDF. Det loggar alla nätverksanrop.
- Testet fäller om något anrop går till något annat än appens egen värd och Supabase-ändpunkterna för inloggning och behörighet.
- Testet fäller också om en request-body innehåller PDF-data.

Det verifierar målet i [system-sakerhet.md](moduler/system-sakerhet.md) och blir underlag till IT.

### F. Hooks i Claude Code (`.claude/settings.json`, godkänns separat)

- **PreToolUse på Edit och Write:** varna eller stoppa ändringar i låsta filer om användaren inte har låst upp under sessionen. Det ger en extra spärr innan ändringen ens når en PR.
- **Ingen automatisk testkörning vid varje stopp**, eftersom det är för långsamt. Claude kör modulens tester enligt CLAUDE.md avsnitt 3.

### G. Granskning före PR (inget att installera)

- `/code-review` på ändringarna innan PR öppnas.
- `/security-review` när `auth/`, `supabase/`, `sw.js`, lagring eller PDF-import berörs.
- Vid större ändringar: en oberoende granskning av en underagent som bara får se ändringarna, inte resonemanget bakom dem.

### H. Återkommande kontroll (schemalagd uppgift, valfritt)

En gång i veckan:
- kör testsviten mot `main`,
- läs Supabases säkerhetsrådgivare (bara läsning),
- uppdatera testläget i avsnitt 1 via en PR.

Ingenting ändras i drift.

### I. Inventering av gamla versionsfiler (rapport, ingen radering)

Underlag från 7 november 2026, som behöver verifieras innan något åtgärdas:

| Grupp | Filer | Storlek |
|---|---|---|
| Laddas bara av administratörernas testsidor (`smartmatch-read-test.html`, `smartmatch-slr-test.html`) | `smartmatch-read-main-v9-94.js`, `smartmatch-main-v524.js`, `smartmatch-read-v9-100.js`, `smartmatch-slr-test-module-v36-132.js`, `smartmatch-session-v36-77.js`, `smartmatch-read-codes-v9-6.js`, `smartmatch-read-equipment-symbols-v9-85.js`, `smartmatch-compact-workspace-v9-94.js`, `smartmatch-read-access-v9-85.js` | ca 1,3 MB |
| Laddas inte av någon sida, bara via `require()` i Node och listade i `sw.js` | `smartmatch-projektering-v2-19-data.js`, `-v2-19-pdf.js`, `-v511-data.js` | ca 230 kB |
| Publiceras inte | `templates/checklista-revision-v1/` (äldre mall) | — |
| Äldre kod på startsidan, användning okänd | `app.js`, `v2.js`, `reports.js` | ca 150 kB |
| Fristående Säkerhetsservice, användning okänd | `security.html` | — |

Ett förslag är ett skript, `tools/file-usage.mjs`, som tar fram den här tabellen automatiskt med samma logik som `build-release.mjs`, så att inventeringen inte behöver göras för hand.

## 4. Inaktuella hänvisningar i befintliga dokument

Det här hittades vid genomgången. Dokumenten har **inte** ändrats, eftersom flera av dem innehåller låsta regler. Rättelserna föreslås som en separat, godkänd ändring.

| Var | Vad |
|---|---|
| DEVELOPMENT_RULES.md avsnitt 4 | "Aktuell version: v2.4.398". Appen är på v2.4.579. |
| DEVELOPMENT_RULES.md avsnitt 2A, PROJECTFLOW_ARCHITECTURE.md | `project-workspace.html/.css/.js` finns inte. Projektering ligger i `smartmatch-projektering*`. |
| DEVELOPMENT_RULES.md avsnitt 4 | Länk till `CE_DESKTOP_357.md`, som saknas. |
| SMARTMATCH_FUNCTION_RULES_LOCK.md | Länkar till `SMARTMATCH_TEST_V36_*.md` och `SMARTMATCH_READ_TEST_9_28.md`, som saknas. |
| README.md och VANTANDE_PUNKTER.md | Olika version av serverfunktionen `tillsyno-admin` (11 eller 12). |
| `tools/run-tests.mjs`, kommentar | `pdfjs-dist@3.11.174`. Ska vara 4.10.38. |
| `tests/*-browser.js` (9 filer, t.ex. `security-toolbar-browser.js`) | Manuella QA-skript som laddas i webbläsaren ("Isolated browser QA only"). Testkörningen använder dem inte, och inget test refererar till dem. Ska de beskrivas i tests/README.md eller inventeras? |
