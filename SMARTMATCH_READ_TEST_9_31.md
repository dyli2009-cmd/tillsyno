# Avläsning TEST 9.31 — tydlig avläsningsvy

Originalet fyller vänster sida på dator och iPad. Hela avläsningsflödet ligger i en panel till höger: steg, markering och sidval, avläsning, granskning och sparande. Stegöversikt och sparknapp är alltid synliga. På smal telefon placeras originalet ovanför samma ordnade kontrollpanel.

Resultatlistan flyttas inte längre under originalet och krymper därför inte bilden efter läsning. Efter avslutad läsning rullas kontrollpanelen till resultatet. Extra läsinställningar och sparad läsmall är valfria utfällbara delar. Omläsning av produkter visar inte den irrelevanta knappen för ritningsträffar.

Avlästa produkter visas direkt i granskningen med fyra kolumner: kategori/grupp, produkt/modell, antal och Mont av. GS och saknad montör har separata färgmarkeringar och text. Källbilden är oförändrad.

Parsern och checklistans sparlogik från 9.30 återanvänds. DS/DA syns endast på iPad/iPhone. Alla tidigare versionsfiler är oförändrade. Intern build 36.174.

Verifiering: single-card reread browser test including left/right placement, full-height original, right-side controls and preserved data; full work/import/export/reopen regression on desktop, emulated iPad and iPhone; offline cache test. Generated PDFs in Chromium. Desktop screenshot inspected.
