# System och IT-säkerhet

Inloggning, behörighet, licens, administration, lagring, cache och publicering. Det här är också **granskningsområdet för IT-säkerhet**.

**Låst regel:** [TILLSYNO_LICENSE_RULES_LOCK.md](../../TILLSYNO_LICENSE_RULES_LOCK.md):
- en gemensam ingång,
- administratören tilldelar moduler och licenstid,
- sjudagarsregeln för offline,
- självregistreringen är stängd.

## Filkarta

| Del | Filer |
|---|---|
| Supabase-klient och sessionsskydd | `auth-config.js` (URL och **publik** nyckel), `auth/client.js` (tabell `tillsyno_access`), `auth/guard.js` |
| Inloggningssidor | `auth/login.*`, `auth/forgot-password.*`, `auth/reset-password.html`, `auth/pending.*`, `auth/register.html` (stängd) |
| Modullås och läskod | `auth/module-code-gate.js` (RPC `tillsyno_verify_module_code`), `smartmatch-read-access-v9-85.js` (RPC `tillsyno_verify_read_code`, bara på testsidan *Avläsning TEST*) |
| Administration | `auth/admin.html`, `auth/admin.js`, `auth/admin-*.css` |
| Serverfunktion | `supabase/functions/tillsyno-admin/index.ts`. Hemlig nyckel bara via `Deno.env`. Version 12 i drift enligt VANTANDE_PUNKTER.md, medan README.md nämner version 11. **Kontrollera.** |
| Databasregler | `supabase/schema/tillsyno-security-2026-11-07.sql` (så som de ser ut i drift), `auth/*.sql` (delskript) |
| Integritet och rensning | `auth/integritet.html`, `auth/clear-device.*` (raderar lokal data efter bekräftelse) |
| Offline och cache | `sw.js` (cache `tillsyno-offline-<version>`, listan `CORE`), `offline.js`, `ce-markning-v1-2-sw.js` |
| Publicering | `.github/workflows/pages.yml` och `tools/build-release.mjs`. Bara filer som appen använder publiceras, plus en valfri denylist. |

**Tabeller i Supabase** (enligt schemafilen):
- `tillsyno_access`
- `tillsyno_module_codes`
- `tillsyno_admin_audit`
- privata scheman för kodförsök och inställningar

Det finns **inga tabeller för ritningar, protokoll eller kunduppgifter**.

## Målet: inga kundritningar eller kunduppgifter i appens molndatabas

Användaren ska arbeta lokalt och själv välja en godkänd lagringsplats.

**Läge 7 november 2026: delvis kontrollerat, inte verifierat.**

| Kontroll | Resultat | Metod |
|---|---|---|
| Supabase-anrop i appkoden | Bara `tillsyno_access`, `tillsyno_module_codes`, två kod-RPC:er och admin-funktionen | grep efter `.from(`, `.rpc(`, `.storage.`, `functions.invoke` |
| `fetch()` i appkoden | Läser lokala filer (Capacitor/fil-URL) och appens egna sidor, inga uppladdningar | grep, med genomläsning av träffarna |
| Externa värdar i koden | Supabase, plus länkar till tillverkares webbplatser i produktdata | grep efter `https://` |
| Lokal lagring | IndexedDB per modul, localStorage, service worker-cache | grep efter `indexedDB` |

**Återstår för verifiering:**
- ett automatiskt test som kör appen och fångar all nätverkstrafik vid öppna, arbeta och spara PDF, och som fäller om något annat än inloggning och behörighet skickas,
- en genomläsning av `auth/` och `tillsyno-admin`,
- en granskning av RLS-reglerna mot schemafilen.

## Granskningsområden

| Område | Vad finns i dag | Öppen fråga eller nästa kontroll |
|---|---|---|
| Supabase och autentisering | RLS på `tillsyno_access`, sessionskontroll (`tillsyno_session_active`), admin via serverfunktion | Granska RLS och funktionsrättigheter. *Leaked password protection* kräver Pro. |
| SSO och behörighet | Moduler och licens styrs av administratören | Microsoft Entra ID (VANTANDE_PUNKTER.md punkt 2) |
| Kunduppgifter och klassning | Policy: inga kunddata i repot. `.gitignore` stoppar PDF och DWG. | Informationsklassning beslutas med IT |
| Ritningar och PDF | Bearbetas lokalt (pdf.js, pdf-lib, Tesseract från `vendor/`) | Nätverkstestet ovan. Granska PDF-import mot skadligt innehåll (XSS via text i PDF). |
| Lokal lagring och cache | IndexedDB, localStorage, cache. *Rensa enhetens data* finns. | Data är okrypterad på enheten. Hur länge den ligger kvar, och vad som händer med en förlorad enhet. |
| Molnlagring | Ingen i appen. Användaren sparar själv i Filer eller Dropbox. | Gemensamt arbete är bara en plan: SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md |
| GDPR | Integritetssida och admin-logg | Personuppgifter i Supabase (konton, logg). Personuppgiftsbiträdesavtal och region (eu-central-1). |
| Loggning och spårbarhet | `tillsyno_admin_audit` | Hur länge loggen sparas och vem som läser den |
| Backup och återställning | Inte dokumenterat | Backup i Supabase för konton och behörighet. Lokala data kan inte återställas om enheten rensas. |
| Internetexponering | GitHub Pages och Supabase | CSP saknas i sidorna. Exponeringen av `tillsyno-admin`. |
| Förlorad enhet | Sjudagarsregeln begränsar offline-tiden | Lokal data ligger kvar tills någon rensar den |

## Arbetsregler

- Använd bara testdata tills IT har godkänt (VANTANDE_PUNKTER.md punkt 4).
- Ändra aldrig Supabase-inställningar, regler eller funktioner utan separat godkännande. Läsa (rådgivare, schema) är tillåtet.
- Säkerhetsfynd registreras som en punkt i VANTANDE_PUNKTER.md, eller som GitHub-issue med etiketten `säkerhet` när det införs. Åtgärden görs som en egen uppgift.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules tillsyno-admin-auth admin-ui login- device-data-clear app-startup app-update offline-cache
```
