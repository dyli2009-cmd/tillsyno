# CE TEST 41 – tydlig dokumentstatus utan procent inne i CE-mapparna

## Visning
- Dokumentmappar visar endast **Ej påbörjad**, **Pågår** eller **✓ Klar**. Tidigare 0 %, 50 % och 100 % på mappkort och inne i knapparna är borttagna.
- Separat kompakt statusrad per mapp: **Pågår** (klockikon) och **✓ Klar** (checklista/bock). De markerade lägena syns diskret orange respektive grönt.
- Mappens befintliga åtgärder Mall, Visa PDF, Gemensamt, Endast denna och Mer har en egen kompakt rad, vilket minskar risken för för små tryckytor på telefon.
- Alla sju CE-mappar följer samma statuslogik, även Produktlista och CE-skylt.
- Hela dörren: knappen visar **Slutför dörr**, och efter avslut **✓ Klar · Återöppna**, utan procentsiffra i CE-detaljvyn.
- Dörrlistan på start/översikt har kvar den ursprungliga procentberäkningen. 100 % visas först efter att hela dörren slutförts.

## Logik
- **Pågår** kan markeras manuellt även innan ett dokument är färdigifyllt. Detta sparas som status='doing' på rätt dörr och mapp och ändrar inte PDF-ifyllnad, signaturer eller andra dörrar.
- **✓ Klar** återanvänder tidigare validering: dokument ska finnas, Egenkontrollens krävda signaturer ska finnas, och Produktlista ska kunna exporteras.
- När ett färdigmarkerat dokument förs tillbaka till Pågår nollställs dess granskadstatus och dörrens tidigare slutförande återöppnas, men innehållet bevaras.
- Arbetsstatus i mapparna uppdateras även vid redigering av fält. Lokal projektlagring och kopiering av dörr med dokumentstatus fungerar vidare som tidigare.
- ZIP-export kräver fortsatt att hela dörren är slutförd. Procenten i översikten går 0–99 % för ej slutförd dörr och 100 % för slutförd.

## Kontroller
- JavaScript syntax verifierad.
- Simulerad statusväxling 0→50→100→50 och tillbaka, samt 99→100 i dörröversikten. Värden sparas utan att svar måste tas bort.
- CSS kontrollerad för mobil/iPad/dator. Fysiskt iPad-test återstår.
