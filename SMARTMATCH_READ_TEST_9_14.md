# SmartMatch – Avläsning TEST 9.14

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-14.html`. Intern version: `36.157-READ-TEST`. Tillsyno-version: `v2.4.381`.

## Koppla tillbaka en position som tagits bort

1. Öppna den färdiga projekt-PDF:en och välj **Ritning & dörrkort**.
2. Välj **＋ Koppla stämplar** och markera hela exempelstämpeln, inklusive dess färgade bakgrund och kant.
3. Kontrollera ritningsbeteckningen, välj dörrkortet som positionen ska öppna och välj **Sök på ritningen**.
4. Granskningen visar **Totalt**, **Kopplade**, **Okopplade** och **Tidigare borttagna**. Använd **Visa** för att kontrollera varje fysisk position.
5. En rad med **Redan kopplad** är synlig men har en avstängd kryssruta. En rad med **Tidigare borttagen – kan kopplas igen** kan väljas.
6. Markera bara positionerna som ska återställas och välj **Lägg till valda kopplingar**. De kopplas till dörrkortet du valde i steg 3.
7. Kontrollera resultatet och välj **Spara → Spara PDF** för att föra med återkopplingen till nästa dator eller öppning.

Den återkopplade positionen blir en ny manuell länk och börjar utan gamla avbockningar. Befintliga dörrars produkter, kontroller, tid och kortkälla ändras inte. Den tidigare borttagna automatiska träffen förblir spärrad internt, så en senare helskanning inte skapar en dubblett. I en ny sökning visas den fysiska positionen som kopplad eftersom den nya manuella länken har företräde.

Vanlig sökning eller ett direkt kodanrop kan inte återinföra en borttagen position. Återkoppling kräver att träffen visas, granskas och väljs i dialogen. Positionens sparade ID, sida, beteckning och placering kontrolleras innan ändringen görs. Om ett senare steg misslyckas återställs hela ändringen.

## Verifiering

- Ett prov med två lika WC-stämplar visar **Totalt 2**, **Kopplade 1**, **Okopplade 1** och **Tidigare borttagna 1**.
- Den kopplade raden kan inte väljas igen. Den borttagna raden kan återkopplas exakt en gång och börjar obockad.
- En ny sökning visar två kopplade positioner och ingen möjlig dubblett.
- Den gamla automatiska träffen och bortvalet förblir spärrade genom en senare helskanning.
- PDF-export och öppning i en ren webbläsare återställer exakt de två fysiska positionerna, den befintliga dörrens kontroller och tid samt den nya manuella länken utan OCR, produktläsning eller ny ritningssökning.
- Fel efter påbörjad återkoppling återställer avläsningsdata, manuella positioner, kortkopplingar och kontroller atomiskt.
- Dialogen är kontrollerad på dator, iPad- och iPhone-storlek utan horisontellt överflöde.

TEST 9.13 och tidigare snapshots är oförändrade. TEST 9.14 kan visa lokala projekt från äldre TEST-lagringar enligt 9.13-flödet. Standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte.
