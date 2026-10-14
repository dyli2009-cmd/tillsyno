# CE TEST 48 – frivillig PDF-optimering

- Ny knapp **Optimera PDF-mallar**, med en rad för varje PDF-mall: Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran och Egenkontroll.
- **Testa optimering** beräknar verkliga MB före och efter. Ingenting ändras förrän användaren väljer **Använd optimerad**. **Visa original** och **Visa testfil** finns för visuell kontroll. **Återställ original** fungerar under aktuell session.
- Algoritmen slår bara samman identiska dubbla typsnittsströmmar. Inga sidor omvandlas till bilder, inga formulärfält plattas och ingen bild komprimeras.
- Sidantal och formulärfältsnamn/typer/värden verifieras i den optimerade filen; digitalt signerade mallar avvisas. Om ingen minskning sker behålls originalet.
- Godkänd optimerad mall sparas som enda mall för sin dokumenttyp när användaren nästa gång sparar/skickar projekt-PDF, och följer med ZIP. Befintliga dörrdata/kryss/foton/underskrifter förändras inte.
- Testas i iPad efter publicering. Olika mallar kan ge olika minskning. Originalmallarna återimporteras via Mall om så behövs efter att sidan stängts.
