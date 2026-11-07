# Kontrollflöde – Brand

## 1. Version
- **Appversion:** Tillsyno v2.4.589 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Brand 1.0. Versionen finns i `versions.json` och visas med liten text på startsidan, i mappvalet och i modulens sidhuvud.
- Kontrollflödet är upplåst. Gemensamma regler och filkarta: [README.md](README.md).

## 2. Arbetsflöde från början till slut
1. Startsidan → **Kontrollflöde** → mappen *Brandsäkerhet* → välj *Brandcentral*, *Branddetektorer* och/eller *Branddörr / dörrhållning*. Sidan stannar på `all-in-one.html`.
2. **Öppna PDF**, placera objekt och fyll i kontrollpunkter. Översikt, Kundmall och Spara PDF fungerar som i [Säkerhetsservice](sakerhetsservice.md) avsnitt 2.

## 3. Viktiga funktioner
- **Protokoll:**

  | Protokoll | Nyckel | Prefix | Punkter |
  |---|---|---|---|
  | Brandcentral | `fire_panel` | BC | 5 |
  | Branddetektorer | `fire_detector` | BD | 5 |
  | Branddörr / dörrhållning | `fire_door` | BR | 5 |

  Punkterna är okulär kontroll, indikering eller placering, funktionsprov, strömförsörjning eller skada, och dokumentation av avvikelser. De står i `security.js` ca rad 115–144, och rubrikerna i kundprotokollet ca rad 323–325.
- **Import av äldre PDF:er:** texten tolkas, och ord som brandcentral, rök- och värmedetektor, branddörr, dörrhållning och uppställningsmagnet känns igen (ca rad 736–738). Det gäller bara på huvudsidan och bara för valda protokoll.
- **Inget annat är brandspecifikt.** Det finns ingen egen sökning och inget eget gränssnitt. Allt annat är Kontrollflödets gemensamma arbetsyta.

## 4. Kodfiler och motor
- **Sida:** `all-in-one.html`.
- **Motor:** `security.js`, som delas med Säkerhetsservice.
- Posterna `SYSTEMS.fire_*` finns också i `controlflow-revision/security-v335.js`, men används inte där.

## 5. Data: inläsning, behandling, lagring, export
Detsamma som för Säkerhetsservice, se [sakerhetsservice.md](sakerhetsservice.md) avsnitt 5. Lokal inläsning, lagring under `doorservice-all-in-one:<kontrollsumma>` och i `tillsyno-offline-work`, och export av en PDF med inbäddade arbetsdata under `SecurityServiceWork`.

## 6. Beroenden till andra moduler
- **Säkerhetsservice:** samma motor och sida. Ändringar i `security.js` påverkar båda.
- **Dörrautomatik och Lås:** påverkas bara via delade filer och samma lagringsnyckel, se README.md.

## 7. Säkerhet och lagring
Samma förhållanden som för Säkerhetsservice, se [sakerhetsservice.md](sakerhetsservice.md) avsnitt 7. Det som inte är verifierat är också detsamma.

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules controlflow-dialogs controlflow-overview controlflow-return-links controlflow-selection-delete controlflow-stamp protocol-selection-scope security-automation-checklist security-stamp-selection
```
- Inga kända fel.
- **Lucka:** inget test gäller bara Brand eller kundprotokollet för Brand. Förslag finns i [kvalitetskontroller.md](../../kvalitetskontroller.md) avsnitt 3D.
