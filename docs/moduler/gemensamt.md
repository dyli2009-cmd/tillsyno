# Gemensamma funktioner och delade filer

**Version:** Tillsyno v2.4.581 (utgångspunkt 7 november 2026). Det här är en referens över delade filer, inte en funktionsbeskrivning. Funktionerna beskrivs i respektive moduldokument.

En ändring i en fil som flera sidor laddar ska testas mot **alla** sidorna. Tabellen visar vem som laddar vad. Den är framtagen ur sidornas `<script>`- och `<link>`-taggar den 7 november 2026.

Förkortningar:

| Förkortning | Sida |
|---|---|
| Hem | `app.html` |
| KF | `all-in-one.html` |
| KF-rev | `controlflow-revision/all-in-one.html` |
| SS-fri | `security.html` |
| CE | `ce-markning.html` |
| Rit | `drawing-tools.html` |
| Proj | `smartmatch-projektering.html` |
| Avl+SM | `smartmatch-read-v9-100.html` |
| AvlTEST | `smartmatch-read-test.html` |
| SM1.5 | `smartmatch-slr-test.html` |
| Auth | sidorna i `auth/` |

## Delade filer som rör flera moduler

| Fil | Laddas av | Testa |
|---|---|---|
| `auth-config.js`, `auth/client.js`, `vendor/supabase-*.js` | alla sidor | allt |
| `auth/guard.js` | alla utom inloggnings- och rensningssidorna | allt |
| `auth/module-code-gate.js` | KF, KF-rev, SS-fri, CE, Rit, Proj, Avl+SM | allt |
| `tillsyno-appearance.css` och `.js` (tema) | Hem, KF, SS-fri, CE, Rit, Avl+SM, AvlTEST, SM1.5, Auth | `theme-consistency save-theme navigation-theme customer-preview-theme ce-signature-theme` + berörda moduler. **Påverkar också Kontrollflödet:** kör även Kontrollflödets tester. |
| `tillsyno-theme-fix-v578.css` | CE, Rit, Avl+SM, AvlTEST, SM1.5, Auth (rensning) | som raden ovan, utom Kontrollflödet |
| `style.css` | Hem, KF, SS-fri | KF-tester + `app-startup` |
| `ui-text-scale.js` | Hem, SS-fri, Rit | `app-startup drawing-tools security-workflow` |
| `session-history.js`, `offline.js`, `drawing-transfer.js` | Hem, KF, SS-fri | KF-tester + `app-startup app-update` |
| `vendor/pdf.min.js`, `vendor/pdf-lib.min.js` | nästan alla | allt |
| `vendor/jspdf.umd.min.js` | Hem, KF, KF-rev, SS-fri, Avl+SM, AvlTEST, SM1.5 | KF, SmartMatch, Avläsning |
| `vendor/jszip-3.10.1.min.js` | CE, Avl+SM, AvlTEST, SM1.5 | `ce-`, `smartmatch-` |
| Projekteringsfiler som SmartMatch laddar (lista i [projektering.md](projektering.md)) | Proj, Avl+SM, SM1.5 | `smartmatch-projektering sensor-package time-overview smartmatch-` |
| `smartmatch-pdf-v36-71.js`, `smartmatch-protocol-*`, `smartmatch-slr-test-*`, `smartmatch-stamp-shapes-v36-78.js`, `smartmatch-table-layouts-v36-94.js`, `smartmatch-beslagskod-v36-133.js` | Avl+SM, AvlTEST, SM1.5 | `smartmatch- slr-` |
| `sw.js` (offlinelistan `CORE`) | hela appen | `offline-cache app-update app-startup` + `node tools/build-release.mjs` |

Filer som bara används inom Kontrollflödet (KF och KF-rev) står i [kontrollflode/README.md](kontrollflode/README.md).

## Startsidan (`app.html`)

- Visar modulvalen, *Mitt konto*, appversionen och, för administratörer, *Testversioner*.
- Laddar dessutom `app.js`, `v2.js` och `reports.js`. Det är äldre dörrservicekod med egna kontrollpunkter och en egen rapport (`buildServiceReportDoc`). Den ligger i dolda paneler. **Om koden används är inte verifierat.** Ändra den inte, och använd den inte som mall.

## Appversion och cache

- Synlig version `v2.4.x` i `app.html` (en serie för hela appen, DEVELOPMENT_RULES.md avsnitt 4).
- Sidor och filer laddas med `?v=`-parametrar. Nya eller ändrade filer som ska fungera offline måste finnas i `CORE` i `sw.js`. Annars stoppar `tools/build-release.mjs` publiceringen.

## Göra en fil fristående i stället för att dela den

Om en funktion börjar skilja sig mellan moduler ska den hellre delas upp än fyllas med specialfall (DEVELOPMENT_RULES.md avsnitt 7).
