# Kontrollflöde – Lås

## 1. Version
- **Appversion:** Tillsyno v2.4.583 (utgångspunkt v2.4.581, taggen `tillsyno-2.4.581-utgangspunkt`).
- **Modulversion:** Dörrautomatik / Lås 1.0. Lås har ingen egen version, eftersom den delar mapp, sida och motor med Dörrautomatik (beslut 7 november 2026). Versionen finns i `versions.json` och visas med liten text på startsidan, i mappvalet och i modulens sidhuvud.
- Kontrollflödet är upplåst. Gemensamma regler och filkarta: [README.md](README.md).

## 2. Arbetsflöde från början till slut
1. Startsidan → **Kontrollflöde** → mappen *Dörrautomatik / Lås* → *Checklista revision lås*. Sidan går vidare till revisionssidan `controlflow-revision/all-in-one.html`.
2. **Öppna PDF** på samma sätt som i [Dörrautomatik](dorrautomatik.md) avsnitt 2. Samma laddningsruta och samma sparläge för tunga ritningar gäller.
3. **Placera lås** på ritningen. De numreras *Lås 1, Lås 2 …* (prefix L-R).
4. **Fyll i 11 kontrollpunkter** med svaren *OK*, *Anmärkning* eller *Ej aktuell*. Ett nytt tryck på ett valt svar avmarkerar det.
   - 1.1 Prata med kunden.
   - 1.2–1.4 Funktionsprov och smörjning av cylindrar, låshus och hänglås.
   - 1.5 Orienteringsritningar.
   - 1.6 Fastsättning.
   - 1.7 Slutbleck.
   - 1.8 Förändringar i byggnaden.
   - 1.9 Nödkåpor och plombering.
   - 1.10 Dörrstängare.
   - 1.11 Kontrolljournal.
5. **Översikt**, **Kundmall** (förhandsvisning) och **Spara PDF** fungerar som i Dörrautomatik.

## 3. Viktiga funktioner
- Protokoll: `SYSTEMS.lock_revision` (11 punkter). Infört i v2.4.252.
- Låsprotokollet följer motorns allmänna väg:
  - ingen kundstil (den finns bara för *Checklista revision dörrautomatik*),
  - ingen import av äldre Bluebeam-protokoll (den gäller bara Dörrautomatik),
  - ingen automatiknumrering.
- **Två låsprotokoll med olika placering:** båda behålls där de ligger, enligt beslut 7 november 2026. De slås inte ihop och flyttas inte utan ägarens godkännande. En ändring i det ena ändrar inte det andra.

  | Protokoll | Nyckel | Mapp | Sida och motor |
  |---|---|---|---|
  | Checklista revision lås | `lock_revision` | Dörrautomatik / Lås | revisionssidan, `security-v335.js` |
  | Lås & Dörrmiljö (13 punkter, prefix L) | `lock` | Säkerhetsservice | huvudsidan, `security.js`, se [sakerhetsservice.md](sakerhetsservice.md) |

## 4. Kodfiler och motor
- **Sida:** `controlflow-revision/all-in-one.html`.
- **Motor:** `controlflow-revision/security-v335.js`, som delas med Dörrautomatik. Sök på `lock_revision`.
- Visningsnamnen står i `names` i motorn.
- Övriga filer är desamma som för Dörrautomatik, se [dorrautomatik.md](dorrautomatik.md) avsnitt 4.

## 5. Data: inläsning, behandling, lagring, export
Detsamma som för Dörrautomatik, se [dorrautomatik.md](dorrautomatik.md) avsnitt 5. Lokal inläsning, lagring under `doorservice-all-in-one:<kontrollsumma>`, och export av en PDF med inbäddade arbetsdata under `SecurityServiceWork`.

## 6. Beroenden till andra moduler
- **Dörrautomatik:** samma sida och samma motor. Ändringar där påverkar Lås. Sparläget och laddningsrutan (v2.4.580–581) gäller därför även Lås, men testerna öppnar bara `automation`. Att det fungerar när bara låsprotokollet är valt är *ej verifierat*.
- **Säkerhetsservice:** *Lås & Dörrmiljö* är ett eget protokoll i en annan motor och påverkas inte.

## 7. Säkerhet och lagring
Samma förhållanden som för Dörrautomatik, se [dorrautomatik.md](dorrautomatik.md) avsnitt 7. Det som inte är verifierat är också detsamma.

## 8. Tester och status
```sh
node tools/run-tests.mjs --modules <mapp>/node_modules revision-uncheck security-automation-checklist protocol-selection security-protocol-scope controlflow-pdf-roundtrip
```
- Inga kända fel som gäller bara Lås.
- **Lucka:** det finns inget test som bara gäller låsprotokollet eller dess kundprotokoll. Förslag finns i [kvalitetskontroller.md](../../kvalitetskontroller.md) avsnitt 3D.
