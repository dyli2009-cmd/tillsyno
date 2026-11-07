# CE-märkning

## 1. Version
- **Appversion:** Tillsyno v2.4.581 (utgångspunkt 7 november 2026).
- **Modulversion:** CE-märkning 1.2. Det är modulens version, som visas i länken *CE-märkning version 1.2* och finns i filnamnen `ce-markning-v1-2*`.
- **Dataformat:** 60 (`VERSION=60`, `FORMAT='Tillsyno CE-märkning TEST 60'` i `ce-markning-v1-2.js`).
  - Dataformatet är **sparformatet**, inte modulens version.
  - Det ändras bara när sparformatet ändras och blandas inte ihop med modulversionen (beslut 7 november 2026).
- **Egen service worker:** `ce-markning-v1-2-sw.js`, med versionen **2.4.570** (se avsnitt 7).

## 2. Arbetsflöde från början till slut
Sidan `ce-markning.html` öppnas från Kontrollflödets mapp *Dörrautomatik / Lås* som en separat modul.

1. **Nytt projekt** (`ceNewProject`; det pågående projektet arkiveras först) eller **Öppna projekt-PDF** (`ceOpenPdf`, högst 200 MB). PDF:en måste innehålla Tillsynos CE-data (`TillsynoCETestData`).
2. **Lägg till dörrar.** Beteckningen blir objektnummer-modellkod-serienummer, och modellerna hämtas från `project-ce-markning-test-v6-models.js`.
3. **Importera mallar** som PDF-filer eller ZIP-mappar:
   - högst 30 filer, en PDF högst 20 MB och en ZIP högst 35 MB,
   - mallens typ bestäms av formulärfälten och mappnamnet,
   - digitalt signerade mallar avvisas av optimeraren.
4. **Fyll i dokumenten per dörr:**
   - Riskanalys, Beskrivning av maskin, Loggbok, Tillverkarens försäkran (exporteras som *EG-försäkran*), Produktlista, Egenkontroll och CE-skylt (foto).
5. **Signera:**
   - Varje punkt 10.5.x i Egenkontrollen kräver en egen signatur.
   - *Slutför dörr* markerar dörren som klar.
6. **Spara och dela:**
   - projekt-PDF,
   - ZIP med mappar,
   - ZIP med valda filer,
   - kund-PDF per dörr (avsnitt 5).

## 3. Viktiga funktioner
- **Personliga förval** per konto och enhet (`project-ce-markning-test-v7-personal.js`):
  - uppgifter om utförare och kund, högst 400 tecken per fält,
  - riskmallar för punkterna 4.4 och 4.6.x, med och utan glas.
- **Automatiska ögonblicksbilder:** 15 sekunder efter en ändring sparas en kopia. Det finns historik över tidigare versioner.
- **Äldre data:** dataformatet *TEST 2* (schema 2) och *TEST 3–59* läses och lyfts till 60. Signaturer i Egenkontrollen flyttas över för schema under 6.
- **Kontroll vid sparande:** PDF:en läses om efter sparandet och kontrolleras byte för byte.

## 4. Kodfiler och motor

| Del | Filer |
|---|---|
| Sida och uppstart | `ce-markning.html`, `ce-markning-v1-2.js` |
| Dokument och formulär | `ce-markning-v1-2-module.js` (182 kB), `ce-markning-v1-2-optimize.js` |
| Lagring i PDF | `project-ce-markning-test-v6-storage.js` |
| Automatikmodeller | `project-ce-markning-test-v6-models.js` (fryst kopia av SmartMatch-modellerna) |
| Personliga förval | `project-ce-markning-test-v7-personal.js`, `ce-presets/` (testförval) |
| Export | `ce-file-export-v312.*` |
| Dator och utseende | `ce-desktop-home-v355.css`, `ce-desktop-workspace-v357.*`, `ce-signature-theme-v357.css`, `project-ce-markning-test-v6.css`, `-v7.css`, `tillsyno-theme-fix-v578.css` |
| Service worker | `ce-markning-v1-2-sw.js` |

## 5. Data: inläsning, behandling, lagring, export
- **Inläsning och behandling:** lokalt, med pdf-lib, pdf.js och JSZip.
- **Lagring på enheten:**
  - IndexedDB **`tillsyno-ce-markning-test-v7-<användar-id>`** (bunden till kontot), med tabellen `projects`. Den innehåller det aktiva projektet, historiken och ögonblicksbilderna.
  - localStorage `tillsyno-ce-test-7-account:<användar-id>` innehåller de personliga förvalen.
  - localStorage `tillsyno-ce-desktop-layout-v1` innehåller layouten på dator.
  - Namnen `-v2` till `-v6` finns som konstanter, men ingen kod som läser dem har hittats.
- **Inbäddat i projekt-PDF:en:**
  - `TillsynoCETestData`: komprimerad JSON.
  - `TillsynoSLRTestManifest`: schema 8.
  - Mallar och produktlistor som bifogade filer.
- **Export:**

  | Export | Filnamn |
  |---|---|
  | Projekt-PDF | `<projekt>-CE-projekt.pdf`. Försättsbladet anger *arbetsfil, inte ett utfärdat CE-intyg*. Filen är inte krypterad. |
  | ZIP med mappar | `<projekt>-CE.zip`, bara slutförda dörrar |
  | ZIP med valda filer | `<projekt>-valda-filer.zip` |
  | Kund-PDF | `CE-<dörr>.pdf` per dörr |

  Filerna delas via delningsfunktionen eller laddas ner.

## 6. Beroenden till andra moduler
- **SmartMatch:** automatikmodellerna är en fryst kopia, så CE-märkningen påverkas inte av ändringar i SmartMatch. En SLR-källa kan läsas via `SmartMatchDALink.getSLRSource` om den finns. Om det gör något nätverksanrop är *ej bekräftat*.
- **Kontrollflödet:** länkas från mappen *Dörrautomatik / Lås* men delar ingen kod.
- **Gemensamt:** tema, `vendor/` och `auth/`.

## 7. Säkerhet och lagring
- **Verifierat i koden** (7 november 2026): CE-modulerna gör inga nätverksanrop utöver service workerns hämtning av appfiler och inloggningen och behörigheten via Supabase. Service workern cachar inte konto- eller arbetsdata.
- **Kontobunden lagring:** projekten ligger i en databas per konto, och förvalen per konto och enhet. Lagringen kräver inloggning.
- **Risk, verifierad i koden men inte provad på enhet:** CE-märkningens service worker har versionen 2.4.570 och visar sidan från sin cache i första hand. `ce-markning.html` ändrades i v2.4.578 (temafilen), men service workerns version höjdes inte. **En enhet som redan har CE-modulen offline kan fortsätta visa sidan från 2.4.570.** Det hanteras i uppgiften om säkra uppdateringar (VANTANDE_PUNKTER.md avsnitt 8, steg 5).
- **Rensa enhetens data:** den kontobundna databasen finns inte i listan över kända databaser. Den raderas bara i webbläsare som stöder `indexedDB.databases()`. Se [system-sakerhet.md](system-sakerhet.md).
- **Ej verifierat:** nätverkstestet (kvalitetskontroller.md avsnitt 3E).

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules ce-
```
- Inga kända fel.
- DEVELOPMENT_RULES.md hänvisar till `CE_DESKTOP_357.md`, som saknas (förslag R4).
