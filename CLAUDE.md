# Tillsyno – arbetsregler för Claude

Tillsyno är en webbapp (PWA) utan byggsteg: vanliga HTML-, JS- och CSS-filer i repots rot. Ritningar och protokoll bearbetas lokalt i webbläsaren. Inloggning och behörighet går via Supabase. Den här filen läses i varje ny session. Håll den kort.

## 1. Starta en uppgift

Användaren skriver till exempel *"Vi ska arbeta med Kontrollflöde – Säkerhetsservice – Detektorer"*. Gör då så här:

1. Slå upp modulen i tabellen nedan och läs **bara** den modulens dokument, plus dokument som det hänvisar till för just den funktionen.
2. Leta upp koden med filkartan i moduldokumentet. Sök med grep efter funktionsnamn. Läs aldrig filer över ca 100 kB i sin helhet (se avsnitt 5).
3. Kontrollera senaste ändringarna för modulens filer: `git log --oneline -10 -- <filer>`. Historiken i repot börjar med v2.4.574 (`fefacf5`). Det som hände före det står i modulens dokument, i låsfilerna och i Kontrollflödets ändringslogg `CONTROLFLOW_LOCK.md`.
   Kontrollera också om uppgiften är tydlig nog. Är det oklart vad som ska bli bättre: fråga användaren innan du lägger fram en plan.
4. Presentera för användaren: vad som finns i dag, vad som behöver ändras, vilka filer som berörs, vilka moduler, undermoduler och motorer som påverkas (också via delade filer), om låsta regler berörs, och vilka tester som ska köras. **Vänta på godkännande innan någon kod ändras.**

| Användaren säger | Läs |
|---|---|
| Kontrollflöde (allmänt, ritning, översikt, kundmall, stämplar) | [docs/moduler/kontrollflode/README.md](docs/moduler/kontrollflode/README.md) |
| Kontrollflöde – Dörrautomatik | [docs/moduler/kontrollflode/dorrautomatik.md](docs/moduler/kontrollflode/dorrautomatik.md) |
| Kontrollflöde – Lås | [docs/moduler/kontrollflode/las.md](docs/moduler/kontrollflode/las.md) |
| Kontrollflöde – Säkerhetsservice (detektorer, larm, passer) | [docs/moduler/kontrollflode/sakerhetsservice.md](docs/moduler/kontrollflode/sakerhetsservice.md) |
| Kontrollflöde – Brand | [docs/moduler/kontrollflode/brand.md](docs/moduler/kontrollflode/brand.md) |
| PDF-design, kundprotokoll, utskrift i Kontrollflöde | [docs/moduler/kontrollflode/pdf-design.md](docs/moduler/kontrollflode/pdf-design.md) |
| Avläsning (dörrkort, tabeller, OCR, stämplar) | [docs/moduler/avlasning.md](docs/moduler/avlasning.md) |
| SmartMatch (koppla dörrkort, GS, ändringar, arbetslista) | [docs/moduler/smartmatch.md](docs/moduler/smartmatch.md) |
| Projektering, Tillsyno Projekt, produkter, tider, material | [docs/moduler/projektering.md](docs/moduler/projektering.md) |
| CE-märkning | [docs/moduler/ce-markning.md](docs/moduler/ce-markning.md) |
| Ritningsverktyg, OCR i ritning, digitalisera dörrkort | [docs/moduler/ritningsverktyg.md](docs/moduler/ritningsverktyg.md) |
| Inloggning, admin, licens, Supabase, säkerhet, lagring, GDPR | [docs/moduler/system-sakerhet.md](docs/moduler/system-sakerhet.md) |
| Teman, startsida, offline/cache, delade filer | [docs/moduler/gemensamt.md](docs/moduler/gemensamt.md) |
| Tester och automatiska kontroller | [docs/kvalitetskontroller.md](docs/kvalitetskontroller.md), [tests/README.md](tests/README.md) |
| Vad som väntar och vem som gör vad | [VANTANDE_PUNKTER.md](VANTANDE_PUNKTER.md) |
| Versioner, modulversioner, arbetsordning | [VANTANDE_PUNKTER.md](VANTANDE_PUNKTER.md) avsnitt 8 |

För en undermodul i Kontrollflödet: läs undermodulens dokument och [kontrollflode/README.md](docs/moduler/kontrollflode/README.md) (motorerna, beroendena och filkartan).

Är det oklart vilken modul eller undermodul som avses: fråga, gissa inte.

## 2. Regler som alltid gäller

- **Kontrollflödet är UPPLÅST** sedan v2.4.581 (ägarens beslut 7 november 2026). Frasen *"Lås upp Kontrollflödet"* behövs inte längre, och låset ska inte återinföras. Kontrollflödet ändras som andra moduler, efter beställning. Det som fortfarande gäller (de första raderna i [CONTROLFLOW_LOCK.md](CONTROLFLOW_LOCK.md) och avsnitt 3A i [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)):
  - Ändra bara det som är beställt. Använd inte en ändring i en annan modul för att samtidigt ändra Kontrollflödet.
  - Stämplarnas placering och storlek, sparade arbetsfiler, import av äldre protokoll och den exporterade PDF:en ska fungera som förut, om inget annat är beställt.
  - Kör Kontrollflödets tester före och efter ändringen.
  - Skriv in varje ändring i ändringsloggen `CONTROLFLOW_LOCK.md`, med datum, version och vad som ändrats.
  - Redovisa i planen och i PR:en vilka undermoduler och vilken motor som påverkas (se [kontrollflode/README.md](docs/moduler/kontrollflode/README.md)).
- **Låsta regler** ändras bara efter ett nytt, uttryckligt beslut från användaren:
  - [TILLSYNO_LICENSE_RULES_LOCK.md](TILLSYNO_LICENSE_RULES_LOCK.md): inloggning, licens, sjudagarsregeln.
  - [SMARTMATCH_FUNCTION_RULES_LOCK.md](SMARTMATCH_FUNCTION_RULES_LOCK.md), [SMARTMATCH_TABLE_RULE_LOCK.md](SMARTMATCH_TABLE_RULE_LOCK.md), [SMARTMATCH_AUTOMATION_RULE_LOCK.md](SMARTMATCH_AUTOMATION_RULE_LOCK.md).
  - [UI_RULES.md](UI_RULES.md) och [DESKTOP_SIZE_RULES.md](DESKTOP_SIZE_RULES.md).
- **Ändra bara den modul och undermodul uppgiften gäller.** En förbättring i en modul flyttas inte automatiskt till en annan.
- **Kontrollpunkter och protokollinnehåll blandas aldrig** mellan Dörrautomatik, Lås, Säkerhetsservice och Brand.
  - Den visuella PDF-designen ska vara gemensam och innehållet eget per undermodul: [pdf-design.md](docs/moduler/kontrollflode/pdf-design.md).
- **Kontrollflödets två motorer behålls** (beslut 7 november 2026). `security.js` (Säkerhetsservice, Brand) och `controlflow-revision/security-v335.js` (Dörrautomatik, Lås) slås inte ihop, och funktioner flyttas inte mellan dem. En godkänd designändring görs i båda.
- **Protokoll flyttas inte mellan undermoduler** utan användarens godkännande. Det gäller till exempel *Checklista revision lås* (Dörrautomatik/Lås) och *Lås & Dörrmiljö* (Säkerhetsservice).
- **Inga kunddata i repot:** inga kundritningar, ritningsutdrag, kund- eller projektnamn eller objektnummer från kunder. Tester använder genererade data.
- **Inga hemligheter** (nycklar, lösenord, tokens) i kod, dokument eller chatt. `auth-config.js` innehåller bara den publika nyckeln.
- **En synlig appversion** för hela Tillsyno (`v2.4.x`). Varje användarsynlig ändring höjer den ett steg. Detaljer finns i DEVELOPMENT_RULES.md avsnitt 4, och den aktuella versionen visas i `app.html`. Varje modul har dessutom en **modulversion** i `versions.json`, som visas i appen. Kontrollflödet har tre: Dörrautomatik / Lås, Säkerhetsservice och Brand. Regler: VANTANDE_PUNKTER.md avsnitt 8.
- **Gamla versionsfiler** (`*-v9-94.js`, `*-v524.js` osv.) raderas eller flyttas aldrig utan att användningen först har verifierats och användaren har godkänt. De flesta laddas fortfarande.
- **Supabase, publicering, GitHub-inställningar och CI** ändras bara efter separat godkännande.

## 3. Arbetsflöde för kodändringar

1. Läs modulens funktionsbeskrivning (avsnitt 6) och undersök den befintliga funktionen. Presentera en ändringsplan (avsnitt 1).
2. Användaren godkänner planen.
3. Arbeta i en egen branch, aldrig direkt i `main`. Push till `main` publicerar appen.
4. Gör minsta möjliga ändring, bara av den beställda funktionen.
5. Kör modulens tester, och vid ändring i en delad fil testerna för alla moduler som använder filen. Se [gemensamt.md](docs/moduler/gemensamt.md).
6. Kontrollera med `git diff --stat` att inga filer utanför modulen har ändrats.
7. I samma PR:
   - Höj appversionen i `versions.json`, `app.html` (meta och synlig version), `sw.js`, `offline.js`, `auth/admin.html`, `auth/login.html` och `ce-markning-v1-2-sw.js`. `tests/module-versions-v582.cjs` kontrollerar att de stämmer.
   - Höj modulversionen i `versions.json` om funktionens beteende har ändrats (VANTANDE_PUNKTER.md avsnitt 8). Tills kontrollsummorna finns görs det för hand.
   - **Skriv om** modulens funktionsbeskrivning till det nya nuläget.
   - Kontrollera och uppdatera vid behov beskrivningarna för andra berörda moduler.
   - Bocka av i VANTANDE_PUNKTER.md.
8. Öppna en pull request med en beskrivning av vad som ändrades, **vilka moduler och motorer som påverkas**, versioner före och efter, vad som testades och vad som inte testades.
9. Bara användaren godkänner och för in ändringen i `main`.

## 4. Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules            # alla
node tools/run-tests.mjs --modules <mapp>/node_modules security-   # namnfilter
```

Hur `<mapp>` förbereds står i [tests/README.md](tests/README.md). Kända fel finns i `tests/known-failures.json` och fäller inte körningen. Varje moduldokument listar sina tester.

## 5. Kontextfönstret

- En avgränsad uppgift per session. Det som ska överleva sessionen skrivs i moduldokumentet, i PR:en eller i VANTANDE_PUNKTER.md, inte bara i chatten.
- Läs inte hela kodbasen. JavaScript-koden är ca 5 MB, alltså mer än hela kontextfönstret.
- Mycket stora filer ska sökas i, inte läsas i sin helhet:
  - `smartmatch-read-main-v524.js` (610 kB)
  - `smartmatch-read-main-v9-94.js` (586 kB)
  - `smartmatch-main-v524.js` (382 kB)
  - `smartmatch-pdf-v36-71.js` (320 kB)
  - `smartmatch-slr-test-v36-132.css` (200 kB)
  - `security.js` (170 kB)
  - `controlflow-revision/security-v335.js` (170 kB)
  - `ce-markning-v1-2-module.js` (182 kB)
- Läs dem med `grep -n` och `sed -n 'start,slut p'`. Många filer har mycket långa rader, så använd `cut -c1-300`.
- Låt en Explore-underagent göra bred kartläggning, så att bara slutsatsen hamnar i huvudkontexten.
- Låsfilerna, ändringsloggen `CONTROLFLOW_LOCK.md` och SMARTMATCH_FORTSATTNING_2026-10-10.md är långa historikloggar. Läs regeln överst och sök sedan i dem, läs dem inte i sin helhet.

## 6. Funktionsbeskrivningar (permanent regel, beslut 7 november 2026)

- Varje huvudmodul och undermodul har **en levande funktionsbeskrivning** i `docs/moduler/`. Den beskriver hur funktionen arbetar i den **aktuella** versionen, inte vilka ändringar som har gjorts.
- **Gemensam struktur** i varje beskrivning:
  1. Version: appversion och modulversion.
  2. Arbetsflöde från början till slut.
  3. Viktiga funktioner och hur de arbetar.
  4. Kodfiler och motor.
  5. Data: inläsning, behandling, lagring och export.
  6. Beroenden till andra moduler.
  7. Säkerhet och lagring: verifierat, och vad som är oklart.
  8. Tester och status (kända fel, beslut som väntar).
- **Beteende och arbetsflöden beskrivs.** Ikoner, knappar, färger och mindre designjusteringar beskrivs inte.
- **Beskrivningen skrivs om** när funktionen ändras. Gammal text läggs inte till under den nya, och inga dokumentkopior skapas per version. Tidigare kod och dokumentation finns i Git-historiken.
- **Underlag för IT-granskning:** avsnitt 5–7 beskriver databehandling, lagring, behörigheter och nätverk. Det som inte är verifierat i kod eller test skrivs som *ej verifierat*.
- **Historik och återställning:**
  - Tidigare läge visas med `git log -- <fil>` och `git show <commit>:<fil>`.
  - Återställning görs med `git revert` i en egen PR, aldrig genom att skriva om `main`.
  - Godkända utgångslägen märks med Git-taggar, till exempel `tillsyno-2.4.581-utgangspunkt`. Taggar sätts bara efter användarens godkännande.
