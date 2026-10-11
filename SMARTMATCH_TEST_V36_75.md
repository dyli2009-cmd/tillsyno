# SmartMatch TEST v36.75 – GS-koppling och kompakt DA-dialog
2026-10-11. Endast fristående SmartMatch TEST; Kontrollflöde, ordinarie Projektflöde och native iOS/TestFlight oförändrade.

## Tydlig koppling
När teknikern väljer **Koppla / ändra GS** på en automatik visar dialogen en sammanfattning i två rader: **Kopplad: GS11 · position 2 · sida 2** samt **Objektnummer 21-28-92-3 · Maskin SW300 · Antal 1** (exempelvärden). All text hämtas från den valda automatiken och GS-positionen; inga uppgifter gissas. Väljer man en annan GS uppdateras texten som ett *val* tills man trycker Spara GS-koppling. GS-listans alternativ anger GS-kod, position och sida. Sidofältets automatikrad visar aktuell verifierad GS-koppling, maskintyp, antal och sida utan att gissa om länk saknas.

## Renare och mer kompakt meny
- De två främsta valen vid tryck på automatik: **Egenkontroll dörrautomatik** och **SLR-dokumentmapp**.
- **Justera pil** finns bara i automatikpositionens ⋯-meny, inte i dokumentdialogen. Underliggande piljustering och lagrad pil lämnas oförändrade.
- Tidigare **Hitta alla andra automatiker** bevaras men flyttas till ett diskret hopfällt område **Sök fler automatiker** under huvudvalen; sidofältets sökfunktion finns fortfarande kvar.
- Knapparna får mer balanserad höjd, padding, radavstånd och tvåkolumnslayout på telefon/iPad. GS-kopplingsrutan får tydligare radbrytningar och sammanfattningsfärg.
- Endast SmartMatch TEST HTML/JS/CSS och isolerad DA-modul versioneras till v36.75. PDF-/revisions-/sessionsmodulerna ligger kvar oförändrade på v36.71.

## Kontroller
Källkodsbaserad JS-syntaxkontroll av huvudkod och DA-modul, GS/DA-format och unika HTML-ID:n. Riktig PDF och fysisk iPhone/iPad saknas för fälttest.
