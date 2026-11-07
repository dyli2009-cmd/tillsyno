# Kontrollflöde – Lås

**Upplåst** sedan v2.4.581. Läs först [README.md](README.md), som förklarar motorerna, vad som fortfarande gäller och filkartan.

## Innehåll

| Protokoll | `SYSTEMS`-nyckel | Prefix | Punkter |
|---|---|---|---|
| Checklista revision lås | `lock_revision` | L-R | 11 |

Punkterna är:
- 1.1 Prata med kunden
- 1.2–1.4 funktionsprov och smörjning av cylindrar, låshus och hänglås
- 1.5 orienteringsritningar
- 1.6 fastsättning
- 1.7 slutbleck
- 1.8 förändringar i byggnaden
- 1.9 nödkåpor och plombering
- 1.10 dörrstängare
- 1.11 kontrolljournal

Checklistan infördes i v2.4.252 (CONTROLFLOW_LOCK.md).

## Två låsprotokoll med olika placering (beslut 7 november 2026)

| Protokoll | Nyckel | Mapp i protokollväljaren | Sida och motor |
|---|---|---|---|
| Checklista revision lås | `lock_revision` | Dörrautomatik / Lås | revisionssidan, `security-v335.js` |
| Lås & Dörrmiljö (13 punkter, prefix L) | `lock` | Säkerhetsservice | huvudsidan, `security.js` |

**Båda behålls med sin nuvarande placering.** De slås inte ihop och flyttas inte utan användarens godkännande.
- Det här dokumentet gäller `lock_revision`.
- `lock` dokumenteras under [Säkerhetsservice](sakerhetsservice.md).
- En ändring i det ena protokollet ändrar inte det andra.

## Var koden finns

- Revisionssidan `controlflow-revision/all-in-one.html` med motorn `controlflow-revision/security-v335.js`. Sök på `lock_revision`, som förekommer ca 7 gånger.
- Visningsnamnet finns i `names` i motorn (ca rad 953 i `security.js`).

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules revision-uncheck security-automation-checklist protocol-selection security-protocol-scope controlflow-pdf-roundtrip
```

Det finns inget test som bara gäller låsprotokollet. Ett förslag finns i [kvalitetskontroller.md](../../kvalitetskontroller.md): ett test som låser innehållet i kontrollpunkterna.

## Status

- Inga kända fel som gäller bara Lås.
- **Påverkas av ändringar i Dörrautomatik.** Sparläget, zoomskyddet och laddningsrutan (v2.4.580–581) ligger i revisionsmotorn och revisionssidan, som även kör *Checklista revision lås*. Testerna för detta öppnar bara `automation`. **Det är inte verifierat** att det fungerar lika när bara låsprotokollet är valt.
