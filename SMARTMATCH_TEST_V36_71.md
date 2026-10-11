# SmartMatch TEST v36.71 – tre sparval, en kundrubrik och uppdatering utan avbrott

Datum: 2026-10-11. Gäller bara den responsiva SmartMatch TEST-webbappen (dator/iPad/iPhone), inte ordinarie Kontrollflöde eller native iOS/TestFlight.

## Kundprotokoll och mall
- En enda kund-PDF-rubrik: **EGENKONTROLL** inne i övre ramen. ”Checklista revision dörrautomatik” och extra ”Egenkontroll” tas bort från kund-PDF:s rubrikfält. Metadata/tabell/anmärkningar behålls.
- Själva revisionsdialogens rubrik är kort ”Egenkontroll”; ”Checklista revision dörrautomatik” finns fortsatt som internt val under DA.
- Separat namngiven mall i `smartmatch-protocol-templates.js` (nyckel `egenkontroll-v1`) och beskrivning `SMARTMATCH_MALL_EGENKONTROLL.md`. PDF-generatorn läser rubrik och 9/101/14/23/23/16 mm kolumner därifrån. Gammal v36.70-generator ligger kvar för återgång.

## Projekt: spara och stäng
- Synliga knappval i Spara projekt: **Spara lokalt / Spara PDF / Skicka mejl**. ”Spara fil” finns kvar enbart internt för äldre händelsekoppling, inte som synligt alternativ.
- Lokal arkivering flushar alla aktuella kontrollpunkter och återanvänder i möjligaste mån den oförändrade original-PDF-blobben från lokalt projekt eller aktiv cache; slipper göra `bytes.slice()` och kopiera samma stora PDF vid varje sparning. Första sparningen måste fortfarande lagra originalfilen en gång. Autosparning av utkast efter ändringar fanns redan och bevaras.
- **Spara PDF** öppnar direkt filplatsväljaren på dator om tillgänglig, därefter bygger och verifierar projekt-PDF före skrivning. På iOS måste PDF-data vara färdiga före delningsbladet, så första stora genereringen kan fortfarande ta tid. Generering sker i befintliga verifierade flödet, kan förberedas i webbläsarens lediga tid när spara-dialogen är öppen, och återanvänder färdig PDF tills projektdata ändras. Stora PDF-bufferter frigörs när dialogen stängs för att minska minnesbelastning.
- **Skicka mejl** skapar PDF automatiskt vid behov innan delning; inget extra skapa/ladda ner-steg. Webbläsare utan fil-delning kan kräva manuell bilaga som tidigare.
- **× Stäng ritning** flyttad från projektraden till bredvid Spara i sidhuvudet. Automatisk lokal arkivering och återgång till startsidan bevarad.

## Uppdatering
- TEST-webben kontrollerar den fasta sidans publicerade versionsmarkör vid öppning, online igen, när fliken visas och var femte minut.
- Visar ”Senaste versionen” och ingen uppdateringsknapp när allt är aktuellt; visar ”Ny v…” och knappen endast när nyare version har hittats.
- Uppdateringsklick när en ritning är öppen **skjuter upp omladdningen tills ”Stäng ritning” har sparat och stängt ritningen**, så användaren inte kastas ur en tung ritning. Är ingen ritning öppen kan sidan laddas om direkt.
- **Inte live hot-swap** av redan laddade JavaScript-moduler. Säker kodaktivering behöver fortfarande en sidomladdning, men inte medan arbetet är öppet. PDF-import/rescan av samma aktiva ritning undviks vid uppdateringen eftersom aktivt dokument redan har stängts.

## Kontroll och begränsningar
- JavaScript-syntax för nya moduler, versionskopplingar och HTML-ID:n kontrollerade statiskt.
- All exportbevisning/GS-kopplingar ligger kvar i befintligt verifieringsflöde; appens egen PDF-projektintegritetskontroll får inte kringgås.
- Ingen test med användarens verkliga stora PDF, fysisk Safari/iPad, lokal IndexedDB-prestanda eller GitHub Pages-distribution har körts i den här ändringen.
- Första PDF-genereringen kan fortfarande ta tid beroende på PDF-storlek och mobilens minne; ”snabbare” är inte löfte om omedelbar filgenerering.
