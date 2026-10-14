# CE TEST 34 – mindre mappknappar och kompakt produktlista

- Dokumentmapparna visar nu kompakta, små ikoner och etiketter så Fil, Visa, Standard, Bara denna, Klar och ⋯ ryms på en rad, inklusive iPhone/iPad.
- Riskanalys, Egenkontroll och övriga CE-formulär får sex anpassade kolumner; mindre ikon- och textstorlek men bibehållna tryckbara ytor.
- Kontrollknappens korta etikett heter nu Klar, med ✓ Klar när dokumentet markerats kontrollerat. Befintlig kontrollstatuslogik är oförändrad.
- Formulärets redigeringsknappar behåller namnen Standard/Bara denna även efter att redigeraren öppnas/stängs.
- Produktlistan har endast två kompakta knappar: + Ny produkt och Spara PDF. Hämta från dörr är borttagen.
- Ny produkt skapar en ny ifyllbar rad; listan växer och minskar med antal produkter. Tidigare sparade produktrader laddas oförändrat; nya listor inleds med en tom rad i stället för automatisk import.
- Produktlistans editor och tabell är centrerade, maxbredd 590 px på större skärmar; mindre kolumner, mindre paddning och kompakt två-radslayout på mobil utan att trigga Safari textfältszoom.
- Inga ändringar i CE-PDF-generering, datumunderskrift, kontrollprocent, delade glasstandarder eller ZIP-export.

Tester: JS-syntax för app, modul och offline-worker. Simulerad UI-test verifierar exakt två produktknappar, att Ny produkt utökar tabellen och att × tar bort rader. Visuell kontroll på iPad/iPhone återstår.