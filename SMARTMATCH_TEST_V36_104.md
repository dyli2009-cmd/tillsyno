# SmartMatch TEST v36.104 – återställ öppningen av Egenkontroll och SLR

Datum: 2026-10-11. Användaren rapporterade att tryck på fysisk dörrautomatik, t.ex. `2001-34-28-24-1`, inte längre visar menyn med **Egenkontroll dörrautomatik** och **SLR-dokumentmapp**.

## Bekräftad kodorsak

I `smartmatch-da-v36-102-module.js` (använd av v36.103) innehöll `refreshGsSuggestion(o)` ett anrop:
```js
const guess = chooseNearestGS(o); // BUGG
```
men `chooseNearestGS(item,cardCache)` kräver dörrkortscachen i andra argumentet och `eligibleGS` anropar `cardCache.get(...)`. Detta ger ett JavaScript-fel när GS-kandidater finns, **innan** `openDoor` når `pwDADoorDialog.showModal()`. Öppningsflödet slutar alltså tyst; befintlig egenkontroll/SLR har inte raderats.

## Minimal åtgärd

En enda beteendeförändring i den nya `smartmatch-da-v36-104-module.js`:
```js
const guess = chooseNearestGS(o, linkCardCache); // RÄTT
```
Ingen ändring av sökningen, GS-matchningsalgoritmen, lokalt sparad projektdata, checklista, SLR-status, menytext eller ritningsplacering. Testversionen `project-workspace-smartmatch-v36-104.{html,js,css}` är separat kopierad från v36.103 för rollback. Den fasta testadressen `project-workspace-smartmatch-test.html` hänvisar till v36.104-modulen och HTML är exakt versionerad kopia.

## Kontroller

- Alla `chooseNearestGS`-anrop i modulen inspekterade: varje anrop har nu korrekt cache-argument.
- Syntax kontrollerad för JS.
- Öppningsflödet testat i isolerad JavaScript/DOM-stub med ID `2001-34-28-24-1`: dialogen öppnar, både Egenkontroll- och SLR-val visas, och Egenkontroll-knappen anropar `openRevision`.
- Regressionstest sparat i `tests/smartmatch-da-dialog-click-v36-104.cjs` för `node`.
- Browser GUI-test i användarens faktiska iPhone/iPad med verklig ritnings-PDF är ännu **inte** genomfört; andra möjliga lokal-/touchspecifika fel kan därför inte uteslutas.

**Version v36.104 ändrar bara dörrklicksbuggen.** Regler om en fysisk automatik → högst en rätt GS och verifierad SLR-källa från v36.101/v36.102 ligger kvar. Ordinarie app och iOS/TestFlight är orörda.