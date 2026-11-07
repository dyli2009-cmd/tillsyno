# Tillsyno

Webbapp (PWA) för tillsyn, kontroll och dokumentation: Kontrollflöde, Avläsning + SmartMatch, Tillsyno Projekt, CE-märkning och Ritningsverktyg.

## Så fungerar appen
- Ritningar och protokoll öppnas och bearbetas **lokalt i webbläsaren** (pdf.js, pdf-lib, Tesseract OCR från `vendor/`). Inga ritningar skickas till någon server.
- Arbetsdata sparas lokalt i webbläsaren (IndexedDB/localStorage) tills användaren exporterar PDF/ZIP. **Logga ut** och **Rensa enhetens data** raderar den efter bekräftelse (`auth/clear-device.html`).
- Inloggning, roller, modulbehörighet och licenstid hanteras i Supabase (`auth/`, `supabase/functions/tillsyno-admin`). Konton skapas av administratören; självregistrering är stängd.
- Databasens säkerhetsregler som de ser ut i drift (Supabase, region eu-central-1/EU): [`supabase/schema/tillsyno-security-2026-11-07.sql`](supabase/schema/tillsyno-security-2026-11-07.sql). `supabase/functions/tillsyno-admin/index.ts` motsvarar version 11 i drift (driftsatt 7 november 2026), med administratörsloggen. Loggtabellen: [`auth/admin-audit.sql`](auth/admin-audit.sql).

## Publicering
`.github/workflows/pages.yml` bygger med `tools/build-release.mjs` och publicerar **bara de filer appen använder** till GitHub Pages. Dokument, tester och serverkod i repot publiceras inte.

```sh
node tools/build-release.mjs                      # bygger build/release
node tools/build-release.mjs --denylist <fil>     # stoppar bygget om förbjudna ord/mönster finns
```

## Kunddata
Inga kundritningar, ritningsutdrag, projektnamn eller objektnummer från kunder får läggas i repot. `.gitignore` stoppar PDF/DWG/DXF m.fl. Tester använder genererade data.

## Regler för utveckling
Det som är beslutat men inte klart (SMTP, Microsoft-inloggning, IT-granskning m.m.) och vem som gör vad står i [VANTANDE_PUNKTER.md](VANTANDE_PUNKTER.md).

**Börja här:** [CLAUDE.md](CLAUDE.md) beskriver arbetssättet, och vilket moduldokument i [docs/moduler/](docs/moduler/) som gäller för en viss uppgift. Där finns filkarta, tester och status per modul.

Läs [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) före ändringar. Kontrollflödets ändringslogg: [CONTROLFLOW_LOCK.md](CONTROLFLOW_LOCK.md) (låset är borttaget sedan v2.4.581). Låsta regler: [TILLSYNO_LICENSE_RULES_LOCK.md](TILLSYNO_LICENSE_RULES_LOCK.md), [SMARTMATCH_FUNCTION_RULES_LOCK.md](SMARTMATCH_FUNCTION_RULES_LOCK.md), [SMARTMATCH_TABLE_RULE_LOCK.md](SMARTMATCH_TABLE_RULE_LOCK.md), [SMARTMATCH_AUTOMATION_RULE_LOCK.md](SMARTMATCH_AUTOMATION_RULE_LOCK.md), [UI_RULES.md](UI_RULES.md).

Äldre versionsrapporter och tidigare versioner av modulerna finns inte i detta repo. Historiken från det tidigare repot är inte medtagen.
