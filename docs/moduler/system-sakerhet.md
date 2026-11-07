# System och IT-säkerhet

Inloggning, behörighet, licens, administration, lagring på enheten, cache och publicering. Det här är granskningsområdet för IT och underlaget till IT-granskningen.

## 1. Version
- **Appversion:** Tillsyno v2.4.585 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Serverfunktionen `tillsyno-admin`:** version 12 i drift enligt VANTANDE_PUNKTER.md, medan README.md nämner version 11. *Kontrollera* (förslag R6).
- **Databasregler:** som i `supabase/schema/tillsyno-security-2026-11-07.sql`.
- **Låst regel:** [TILLSYNO_LICENSE_RULES_LOCK.md](../../TILLSYNO_LICENSE_RULES_LOCK.md).

## 2. Arbetsflöde från början till slut
1. **Inloggning** (`auth/login.js`):
   - e-post och lösenord via Supabase (`signInWithPassword`),
   - tidpunkten sparas i `tillsyno-last-login-v1`.
   - Självregistrering är stängd, och konton skapas av administratören genom inbjudan.
2. **Behörighetskontroll på varje sida** (`auth/guard.js` → `verify()` i `auth/client.js`):
   - Online läses användaren och den egna raden i `tillsyno_access`: roll, tillåtna moduler och licensens slutdatum.
   - Saknas raden visas ett väntrum. Utgången licens eller ogiltig roll nekas. Administratören har alla moduler.
   - Modulen bestäms per sida (`moduleForPage`).
   - Kontrollen görs om vid online, när fönstret får fokus, när fliken blir synlig, och varje timme.
3. **Sjudagarsregeln (offline):**
   - Resultatet sparas i `tillsyno-offline-access-v1`.
   - Offline godtas det bara om både den senaste kontrollen och den senaste lösenordsinloggningen är högst 7 dagar gamla.
   - Online gäller licensens riktiga slutdatum.
   - Administrationssidan fungerar inte offline.
4. **Kodlås per modul** (`auth/module-code-gate.js`):
   - Är låset på krävs en fyrsiffrig kod, som kontrolleras på servern (`tillsyno_verify_module_code`): aktiv session, modulbehörighet, licens och bcrypt-hash.
   - Fem fel inom 15 minuter ger 15 minuters spärr.
   - Upplåsningen gäller i fliken (sessionStorage).
5. **Administration** (`auth/admin.*` och serverfunktionen `tillsyno-admin`):
   - Åtgärder: lista, logg, kodinställningar, bjuda in eller skapa länk (standard 30 dagar), godkänna, radera, uppdatera, förlänga eller avsluta licens, och skapa länk för inbjudan eller återställning.
6. **Glömt lösenord:**
   - Ett neutralt svar, som inte avslöjar om kontot finns.
   - En separat klient utan sparad session.
7. **Utloggning och *Rensa enhetens data*** (`auth/clear-device.js`): görs efter bekräftelse. Andra flikar får besked.

## 3. Viktiga funktioner och skydd
- **Serverfunktionen `tillsyno-admin`:**
  - tillåter bara vissa ursprung (github.io, capacitor, localhost) och bara POST,
  - kontrollerar token och avstängda konton,
  - kontrollerar sessionen (`tillsyno_session_active`) och att rollen är `admin`,
  - ändrar aldrig ägar- eller administratörskonton,
  - körs med `verify_jwt=false` och gör kontrollerna själv.
- **RLS:**
  - `tillsyno_access`: en inloggad användare kan bara läsa sin egen rad och inte skriva den.
  - `tillsyno_module_codes`: kolumnerna `module_key`, `enabled` och `updated_at` kan läsas, men inte kodens hash.
  - Ändringar görs av serverfunktionen.
- **Administratörsloggen `tillsyno_admin_audit`:**
  - innehåller vem som gjorde vad, mot vem, och detaljer som moduler, licensdagar, utskick och länktyp,
  - innehåller **inte** lösenord, koder, länkar eller tokens,
  - poster äldre än 365 dagar raderas, och de 200 senaste visas.
- **Ej bekräftat:** `verify()` på klienten anropar inte `tillsyno_session_active`. Det gör bara serverfunktionen.

## 4. Kodfiler

| Del | Filer |
|---|---|
| Klient och skydd | `auth-config.js` (URL och **publik** nyckel), `auth/client.js`, `auth/guard.js` |
| Inloggningssidor | `auth/login.*`, `auth/forgot-password.*`, `auth/reset-password.html`, `auth/pending.*`, `auth/register.html` (stängd) |
| Modullås och läskod | `auth/module-code-gate.js`, `smartmatch-read-access-v9-85.js` (bara på testsidan *Avläsning TEST*) |
| Administration | `auth/admin.html`, `auth/admin.js`, `auth/admin-*.css` |
| Serverfunktion | `supabase/functions/tillsyno-admin/index.ts`. Den hemliga nyckeln finns bara i `Deno.env`. |
| Databasregler | `supabase/schema/tillsyno-security-2026-11-07.sql`, `auth/*.sql` |
| Integritet och rensning | `auth/integritet.html`, `auth/clear-device.*` |
| Offline och cache | `sw.js`, `offline.js`, `controlflow-revision/offline.js`, `ce-markning-v1-2-sw.js` |
| Publicering | `.github/workflows/pages.yml`, `tools/build-release.mjs` |

## 5. Data: var informationen finns

| Plats | Innehåll | Kunddata? |
|---|---|---|
| **Supabase** (EU, eu-central-1): `tillsyno_access`, `tillsyno_module_codes`, `tillsyno_admin_audit`, privata tabeller för kodförsök | Konton, roller, moduler, licenser, kodstatus, administratörslogg | Personuppgifter om användarna. **Inga ritningar, protokoll eller kunduppgifter** (enligt schemafilen) |
| **localStorage** | Session (`sb-*-auth-token`), åtkomstcache, arbete i Kontrollflödet (`doorservice-all-in-one:<kontrollsumma>`), mallar i Avläsning, förval i CE, inställningar | **Ja** (Kontrollflödet, CE-förval) |
| **IndexedDB** | `tillsyno-offline-work` (ritningar i Kontrollflödet), `smartmatch-read-test-v9-shared-local-pdf-resume` (PDF:er i Avläsning och SmartMatch), `tillsyno-projektering-v2` och `-bibliotek-v1`, `tillsyno-ce-markning-test-v7-<användar-id>`, `tillsyno-digital-doorcards-v1`, `doorservice-drawing-transfer-v1` | **Ja**, ritningar och projektdata |
| **Cache Storage** (service workers) | Bara appens egna filer (`tillsyno-offline-<version>`, `tillsyno-ce-markning-<version>`) | Nej |
| **Exporterade filer** | PDF, ZIP, CSV, JSON som användaren sparar själv. Arbets-PDF:er innehåller originalritningen och alla projektuppgifter, okrypterat. | **Ja** |

**All lagring på enheten är okrypterad** och ligger i webbläsaren eller appen.

## 6. Beroenden
Alla sidor utom integritetssidan laddar `auth-config.js`, `auth/client.js` och `vendor/supabase-*.js`. Se [gemensamt.md](gemensamt.md).

## 7. Säkerhet: verifierat och oklart

**Verifierat i koden** (7 november 2026, genom genomläsning och sökning):
- Supabase-anropen i appen gäller bara `tillsyno_access`, `tillsyno_module_codes`, två kod-RPC:er och serverfunktionen.
- `fetch` används bara för lokala filer, för appens egna sidor (versionskontroll) och för serverfunktionen. Ingen uppladdning av ritningar eller PDF har hittats.
- OCR (Tesseract) och PDF-bibliotek laddas från appens egen `vendor/`.
- Endast den publika Supabase-nyckeln finns i appen.

**Brister och oklarheter:**

| Område | Läge | Nästa steg |
|---|---|---|
| Inget data lämnar enheten | Bara kodgranskat | Nätverkstestet (kvalitetskontroller.md avsnitt 3E) |
| *Rensa enhetens data* | Raderar alla IndexedDB-databaser som webbläsaren listar, plus en lista över kända databaser, och all localStorage och sessionStorage utom tre inställningar för utseende. **Den kontobundna CE-databasen finns inte i listan**, så den blir kvar i webbläsare utan `indexedDB.databases()`. Cache Storage rensas inte, men den innehåller bara appfiler. | Lägg till CE-databasen i listan (egen uppgift) |
| Uppdateringar | Kontrollflödets revisionssida registrerar `sw.js?v=2.4.567`, och resten av appen `?v=2.4.581`. Det ger en ominstallation på ca 19 MB vid sidbyte, mätt i Chromium. CE:s service worker är höjd till 2.4.582 (v2.4.582), men höjs fortfarande för hand. | Kraschuppgiften (steg 2) och säkra uppdateringar (steg 5) |
| Autentisering | Ingen MFA. *Leaked password protection* är avstängd och kräver Supabase Pro. | Beslut inför IT-granskningen. SSO med Microsoft Entra ID (VANTANDE_PUNKTER.md punkt 2). |
| Förlorad enhet | Offline gäller högst 7 dagar, men lokal data ligger kvar tills någon rensar den | Rutin för förlorad enhet, beslutas med IT |
| Internetexponering | GitHub Pages och Supabase. Ingen CSP i sidorna. | Bedömning med IT |
| PDF-import | Användarens filer tolkas lokalt | Granska risken att text i PDF körs som kod (XSS) |
| Backup | Inte dokumenterad för Supabase. Lokal data kan inte återställas. | Dokumentera med IT |
| GDPR | Integritetssida och administratörslogg (365 dagar) | Personuppgiftsbiträdesavtal och region |

## 8. Arbetsregler, tester och status
- Använd bara testdata tills IT har godkänt (VANTANDE_PUNKTER.md punkt 4).
- Supabase-inställningar, regler och funktioner ändras bara efter separat godkännande.
- Säkerhetsfynd förs in i VANTANDE_PUNKTER.md och åtgärdas som en egen uppgift.

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules tillsyno-admin-auth admin-ui login- device-data-clear app-startup app-update offline-cache
```
