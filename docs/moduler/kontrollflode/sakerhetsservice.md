# Kontrollflöde – Säkerhetsservice

**Upplåst** sedan v2.4.581. Läs först [README.md](README.md), som förklarar motorerna, vad som fortfarande gäller och filkartan.

## Innehåll

| Protokoll | `SYSTEMS`-nyckel | Prefix | Punkter |
|---|---|---|---|
| Detektorer | `detector` | DET | 1 (funktionskontroll) + nummer, kod, bedömning och anmärkning |
| Inbrottslarm | `alarm` | I | 10 |
| Lås & Dörrmiljö | `lock` | L | 13 (eget protokoll, skilt från *Checklista revision lås*, se [las.md](las.md)) |
| Passer | `access` | P | 7 |

## Var koden finns

Säkerhetsservice körs på huvudsidan `all-in-one.html` med motorn `security.js`.

| Funktion | Filer |
|---|---|
| Detektorhantering: placera, numrera, identitet | `security-detectors-v344.*`, `security-manual-numbering.js`, `security-manual-sequence-v544.css`, i motorn `detectorIdentityCell` och `securityObjectIdentity` |
| Automatisk detektorsökning på ritning | `detector-scan-core.js`, `detector-scan-vision.js`, `security-detector-scan.*` |
| Serviceöversikt | `security-service-overview-v554.*` |
| Stämpelval och verktygsrad | `security-stamp-selection-v549.*`, `security-toolbar-v543.*` |
| Kompakt layout | `security-*-compact-v52x.css`, `security-overview-*-v530.*`, `security-result-labels-v529.css`, `security-workspace-*` |

**Samma filer används på fler sidor:**
- `security-detectors-v344.*` laddas också av **revisionssidan** (`controlflow-revision/all-in-one.html`, med en äldre `?v=2.4.359`). En ändring där påverkar alltså även Dörrautomatik och Lås.
- **Fristående `security.html`** använder samma `security.js` utan `ALL_IN_ONE` och laddar **inte** `security-detectors-v344.*`. Detektorflödet där är alltså inte detsamma som på huvudsidan. En ändring i motorn påverkar ändå båda sidorna. Se README.md.

`controlflow-revision/security-v335.js` har inte `detectorIdentityCell`, så den detektor-ID-cellen finns bara i huvudsidans PDF.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules security- detector- controlflow-
```

Filtret omfattar bland annat `security-detectors-v344` och `security-manual-numbering`. Detektorsökningen testas av `detector-appearance-test`, `detector-careful-test`, `detector-mixed-test`, `detector-robust-test` och `detector-size-test`.

## Status

- **Kända fel** (i `known-failures.json`):
  - `security-detectors-v344`: testet hittar ingen detektor efter tryck på ritningen.
  - `security-uncheck-v531`: andra tryck på samma svar. Önskat beteende behöver bekräftas.
  - `security-drawing-rotation`: testritningen öppnas inte.
- Historik för gränssnittet: UI_RULES.md, avsnitten v2.4.527–v2.4.546.
