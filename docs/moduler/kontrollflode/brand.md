# Kontrollflöde – Brand

**LÅST.** Läs först [README.md](README.md).

## Innehåll

| Protokoll | `SYSTEMS`-nyckel | Prefix | Punkter |
|---|---|---|---|
| Brandcentral | `fire_panel` | BC | 5 |
| Branddetektorer | `fire_detector` | BD | 5 |
| Branddörr / dörrhållning | `fire_door` | BR | 5 |

Punkterna är generella: okulär kontroll, indikering eller placering, funktionsprov, strömförsörjning eller skada, och dokumentation av avvikelser. De finns i `security.js` (ca rad 115–144). En identisk kopia finns i `controlflow-revision/security-v335.js`.

## Var koden finns

- Brand körs på huvudsidan `all-in-one.html` med motorn `security.js`.
- Det finns ingen Brand-specifik kod utöver `SYSTEMS.fire_*` och rubrikerna i protokolltabellen. Allt annat är Kontrollflödets gemensamma arbetsyta.

## Tester

Det finns inget test som bara gäller Brand. Brand ingår i de gemensamma testerna:

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow-dialogs controlflow-overview controlflow-return-links controlflow-selection-delete controlflow-stamp protocol-selection-scope security-automation-checklist security-stamp-selection
```

## Status

- Inga kända fel.
- **Lucka:** inget test kontrollerar kundprotokollet för Brand. Ett förslag finns i [kvalitetskontroller.md](../../kvalitetskontroller.md).
