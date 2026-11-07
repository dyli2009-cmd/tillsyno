# Kontrollflöde – Lås

**LÅST.** Läs först [README.md](README.md).

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

## Behöver beslut: var hör "Lås & Dörrmiljö" hemma?

Koden har **två** låsprotokoll:

| Protokoll | Nyckel | Mapp i protokollväljaren | Sida |
|---|---|---|---|
| Checklista revision lås | `lock_revision` | Dörrautomatik / Lås | revisionssidan |
| Lås & Dörrmiljö (13 punkter, prefix L) | `lock` | **Säkerhetsservice** | huvudsidan |

Det här dokumentet behandlar bara `lock_revision` som undermodulen **Lås**. `lock` dokumenteras under [Säkerhetsservice](sakerhetsservice.md), eftersom det är där det ligger i appen i dag.

Om `lock` i stället ska höra till undermodulen Lås är det ett användarbeslut. Det kräver upplåsning om något ska flyttas i appen.

## Var koden finns

- Revisionssidan `controlflow-revision/all-in-one.html` med motorn `controlflow-revision/security-v335.js`. Sök på `lock_revision`, som förekommer ca 7 gånger.
- Visningsnamnet finns i `names` i motorn (ca rad 953 i `security.js`).

## Tester

```sh
node tools/run-tests.mjs --modules <mapp>/node_modules revision-uncheck security-automation-checklist protocol-selection security-protocol-scope controlflow-pdf-roundtrip
```

Det finns inget test som bara gäller låsprotokollet. Ett förslag finns i [kvalitetskontroller.md](../../kvalitetskontroller.md): ett test som låser innehållet i kontrollpunkterna.

## Status

Inga kända fel som gäller bara Lås.
