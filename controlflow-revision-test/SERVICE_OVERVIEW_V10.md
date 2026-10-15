# Valfri serviceöversikt på ritningen – TEST v10

Beställt och godkänt för implementation 2026-10-15. Endast den separata revisionstestappen ändras.

## Användning

Öppna Ritverktyg och välj **Lägg till serviceöversikt**. Första ritningssidan öppnas. Rutan kan dras till valfri plats på sidan och skalas med hörngreppet eller knapparna Mindre/Större. Klart avslutar redigeringen; ett nytt tryck på rutan aktiverar greppet igen. Verktyget heter Ändra serviceöversikt när en ruta redan finns. Ta bort gör den valfria rutan osynlig i både ritning och export.

Rutan visar Totalt, Klara, Åtgärdade, Anmärkning, Ej godkända och Ej kontrollerat med samma aktuella urval och statusregler som kundrapportens anmärkningsöversikt. Detaljerade feltexter visas på anmärkningssidan, inte i rutan.

Texten är **Resultat av service** följt av **Klicka här för att se anmärkningar och vad som kräver åtgärd.** Hela rutan länkar till anmärkningsöversikten i den exporterade PDF:n. Samma klick fungerar i kundmallens ritningsförhandsvisning. Under redigering finns också Visa anmärkningar.

## Lagring och PDF

- Val, normaliserad placering och storlek sparas i `project.serviceOverview`. Inga nya dataformat eller externa tjänster behövs. Lokal lagring, arbets-PDF, ångra/gör om och offline följer befintlig projektlagring.
- Ny service behåller rutans placering och räknar om till dagens återställda kontroller. Det är aktuella statusantal, aldrig sparade gamla siffror, som visas.
- En gemensam vektor-PDF för rutan används både som underlag för arbetsvyn och inbäddad vektor i kundens ritning. Kundmallens ritningssidor använder samma PDF-rendering som exporten. Stående och roterad ritning behåller rätt orientering och länkens träffyta.
- Arbets-PDF:n bär den ursprungliga ritningen och projektdata, så rutan dubbleras inte när filen återöppnas och sparas igen.
- Drag/skalning låser ritningens panorering under greppet och ändrar inte objektens pilar eller kontrollsvar. Telefon får stora grepp och en kompakt separat verktygsrad.

TEST v9 finns i `v9/all-in-one.html`. Import, checklistor, filnamnsregler, ordinarie Kontrollflöde och iOS/TestFlight ändras inte. Äldre runtime-filer och den låsta importen bevaras.

## Verifiering

`tests/controlflow-service-overview-v10.cjs`: valfri av/på, sex statusantal, musdrag, hörnskalning, storleksknappar, ångra/gör om, lokal lagring, dynamiska antal, inbäddad vektor utan feltexter, korrekt PDF-destination, kundmallens pixlar jämfört med export, klick till anmärkningssidan, arbets-PDF och återöppning utan dubblett, touchdrag på telefon, borttagning, ny service, ångra återställning och offlineåterladdning/export. Samma export och placering har verifierats med 90 graders ritningsrotation. Båda PDF-varianterna har renderats och granskats visuellt.

Kundrapportens tidigare regression från v9 har körts mot aktiva v10 utan vald ruta. Grundkopians test och historiska runtime-hashar kontrolleras. Fysisk iPhone/iPad har inte testats.
