# CE-märkning

CE-märkning tar fram CE-underlag för dörrautomatik:
- riskanalys,
- beskrivning av maskin,
- loggbok,
- tillverkarens försäkran,
- egenkontroll.

Underlaget sparas i projektets egen PDF och delas som en ZIP-fil.
- **Sida:** `ce-markning.html`. Den öppnas från Kontrollflödets mapp *Dörrautomatik / Lås* som en separat modul.
- **Egen service worker:** `ce-markning-v1-2-sw.js` med scope `ce-markning.html` och cache `tillsyno-ce-markning-*`.

CE-märkning är **en egen modul**. Kontrollflödets lås gäller inte här, men ändra inget i Kontrollflödet i samband med CE-ändringar (DEVELOPMENT_RULES.md avsnitt 4).

## Filkarta

| Del | Filer |
|---|---|
| Sida och uppstart | `ce-markning.html`, `ce-markning-v1-2.js` (format *Tillsyno CE-märkning TEST 60*) |
| Dokument och formulär | `ce-markning-v1-2-module.js` (182 kB, sök i den), `ce-markning-v1-2-optimize.js` |
| Lagring i PDF | `project-ce-markning-test-v6-storage.js`: en komprimerad JSON-ström i arbets-PDF:en |
| Automatikmodeller | `project-ce-markning-test-v6-models.js`: en **fryst kopia** av SmartMatch-modellerna |
| Personliga förval | `project-ce-markning-test-v7-personal.js` (per enhet och konto), `ce-presets/` (testförval) |
| Export | `ce-file-export-v312.*`: valda dokument som filer i ZIP |
| Dator och utseende | `ce-desktop-home-v355.css`, `ce-desktop-workspace-v357.*`, `ce-signature-theme-v357.css`, `project-ce-markning-test-v6.css`, `project-ce-markning-test-v7.css` |

**Lokal lagring:** IndexedDB `tillsyno-ce-markning-test-v2` … `-v7`. Flera databasversioner finns kvar för att äldre data ska kunna läsas.

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules ce-
```

## Status

- **Kända fel:** inga i `known-failures.json`.
- **Inaktuell hänvisning:** DEVELOPMENT_RULES.md hänvisar till `CE_DESKTOP_357.md`, som inte finns kvar. Beslutet finns sammanfattat i DEVELOPMENT_RULES.md, rader om v2.4.355–v2.4.358.
