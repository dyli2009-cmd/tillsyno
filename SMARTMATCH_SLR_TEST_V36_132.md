# SmartMatch SLR TEST v36.132 – direktmarkering utan popup

## Användarens ändring 13 oktober 2026
Knappen **Markera fem dokument kontrollerade** ska markera direkt vid tryck. Ingen popup, ingen extra fråga, ingen separat bekräftelse.

Det gäller endast den aktuella dörrautomatiken och dessa fem mappar: Riskanalys, Beskrivning av maskin, Loggbok, EG-försäkran – tillverkare av maskin och Egenkontroll.

Produktlista och CE-skylt lämnas helt orörda. Varje enskild mapp kan fortfarande öppnas igen med sin egen kontrollknapp. Om en av de fem mallarna saknas visas ett felmeddelande i den befintliga statusraden och INGEN mapp ändras. Upprepade klick när alla fem redan är kontrollerade är verkningslösa.

Efter ett lyckat klick ändras mappstatus och den valda dörrautomatiken sparas med en enda sparning/omritning. SLR 100 % kräver fortfarande separat kontroll av Produktlista och CE-skylt samt det ordinarie Klart-flödet.

## Omfattning
Endast separat SLR TEST v36.132. Knappens bekräftelselogik har förenklats i en versionsmärkt kopia av SLR-modulen. V36.131 bevaras som återgång. Maskin-ID, procentetiketter från v36.130, GS-logik, PDF-sparning, ordinarie SmartMatch, Kontrollflödet och iOS ändras inte. Fast testadress `smartmatch-slr-test.html` uppdateras till v36.132.

## Verifiering
Test av ja-scenariot utan popups, enbart fem mappar på vald dörr, inga ändringar på andra dörrar, ingen förändring på Produktlista och CE-skylt, saknade mallar och upprepat klick. Fullständigt praktiskt iPhone/iPad-test återstår.
