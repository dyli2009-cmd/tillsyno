# Kontrollflöde – Dörrautomatik

**LÅST.** Läs först [README.md](README.md), som förklarar motorn, kopiorna och filkartan.

## Innehåll

| Protokoll | `SYSTEMS`-nyckel | Prefix | Punkter |
|---|---|---|---|
| Checklista revision dörrautomatik | `automation` | DA | 18 (1.1 Samtal med nyttjaren … 1.18 Mindre justering) |
| Egenkontroll dörrautomatik | `automation_selfcheck` | DA-E | 6 |

Kontrollpunkter och felval finns i `SYSTEMS.automation` och `SYSTEMS.automation_selfcheck` i **båda** motorerna. Revisionssidan är den som används.

## Var koden finns

- **Körs på revisionssidan:** `controlflow-revision/all-in-one.html` med `controlflow-revision/security-v335.js`. Hit skickar `all-in-one.js` användaren när ett DA-protokoll väljs.
- **Dörrautomatik-specifikt i motorn:** sök på `isDoorAutomationItem` och `normalizeAutomationIdentity` (serienummer och numrering, *"Dörrautomatik N"* i PDF).
- **Bluebeam-import:** `legacy-door-import.js` och kopian `controlflow-revision/legacy-door-import.js`. Filen har ett eget **permanent regressionslås** i sitt sidhuvud och får inte återanvändas för andra protokolltyper.
- **Revisionsspecifikt:**
  - `controlflow-revision/revision-callout-profile-v4.js`
  - `revision-signature-v6.js`
  - `revision-inline-v310.js`
  - `service-overview-v12.*`
  - `customer-preview-v310.*`
- **Äldre dörrkod på startsidan:** `app.js`, `v2.js` och `reports.js` på `app.html` har en egen kopia av de 18 kontrollpunkterna (`CHECKS` i `app.js`). Om den koden fortfarande används är **inte verifierat**. Ändra den inte som en följd av ändringar här.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules security-automation-checklist revision-uncheck controlflow-production controlflow-pdf-roundtrip protocol-selection security-protocol-scope
```

## Status

- **Kända fel:** inga egna utöver Kontrollflödets gemensamma. Se README.md.
- **Planerat, kräver upplåsning:** tunga ritningar kraschar. Plan i fyra steg: [CONTROLFLOW_HEAVY_PDF_PLAN.md](../../../CONTROLFLOW_HEAVY_PDF_PLAN.md).
- **Ingen avsiktlig skillnad** mellan kopiorna av `SYSTEMS.automation*` (kontrollerat 7 november 2026).

## Får inte påverka

Lås (`lock_revision`) körs på samma sida och i samma motor. Säkerhetsservice och Brand har egna `SYSTEMS`-poster. Ändra aldrig deras punkter i samband med en ändring i Dörrautomatik.
