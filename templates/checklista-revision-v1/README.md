# Sparad designmall: Checklista revision v1

Fryst referens från 2026-10-08 för framtida checklistor med samma design som **Checklista revision dörrautomatik**. Ändra inte dessa referensfiler; skapa en ny mallversion om designen senare ändras.

## Vad som är sparat

- `security.js`: hela motorn, inklusive `buildChecklist`, `reportDoc`, PDF-kolumner, projektrutor, signaturer, kundrapport och anmärkningar.
- `licensed-door-v1.html`: hela arbetsvyn för ritning och protokoll.
- Fyra CSS-filer: färger, typografi, mobil- och datorlayout.
- `manifest.json`: ursprungsfiler, Git-blobbar och exakta kolumnbredder.

Hela ursprungsappen, även hjälpskript som HTML-filen laddar, finns permanent i commit [a979b5941af0c980fcc6ceeb4e975c2483f343ac](https://github.com/dyli2009-cmd/tillsyno/tree/a979b5941af0c980fcc6ceeb4e975c2483f343ac). Referensfilerna i denna mapp är en kodmall, inte en separat publicerad app.

## Samma design för ett nytt protokoll

1. Använd ett nytt tekniskt protokoll-ID och en separat `SYSTEMS`-definition med `label`, `markerLabel`, `prefix`, `checks` och `faults`.
2. Återanvänd befintliga `buildChecklist` och `reportDoc`; ändra bara titel, kontrollpunkter och tillhörande anmärkningar för det nya protokollet.
3. Behåll PDF-kolumnerna: Nr (9 mm), Benämning/kontrollpunkt (101 mm), Ingår ej (14 mm), Klart utan anmärkning (21 mm), Klart med anmärkning (25 mm), Signatur (16 mm).
4. Lägg till eget protokollval, egen lägg-till-knapp och explicit behörighetsvalidering. Koppla det nya protokollet i Floot med samma tekniska ID.
5. Kontrollera att de två befintliga dörrdefinitionerna, deras kontrollpunkter och den gemensamma layoutkoden fortfarande är oförändrade.

## Skyddade original och separat låsprotokoll

`automation` (revision dörrautomatik) och `automation_selfcheck` (egenkontroll dörrautomatik) ska lämnas oförändrade när en ny checklista läggs till. Detta är en bevarad utvecklingsreferens; befintliga arbetsfunktioner ändras inte.

Det nya `lock_revision` heter **Checklista revision lås** och ligger under **Dörrautomatik / Lås**. Det är separat från det äldre `lock` under Säkerhetsservice. Låsprotokollet har användarens 11 kontrollpunkter (1.1–1.11). Kontrollflödets protokollval finns också sparat i `all-in-one.html` och `all-in-one.js` i denna mapp. Framtida ändringar av låspunkterna ska inte röra dörrprotokollen eller designmallen.
