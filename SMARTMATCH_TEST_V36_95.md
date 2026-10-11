# SmartMatch TEST v36.95 – samma kända tabellprofil även med en utrustningsrad

Användaren vill att det nya tabellupplägget kan återanvändas för andra kort, även när antalet utrustningsrader varierar. Ett extra webbläsartest med korttitel, Objekt-rad, Komponent/Produkt och bara Dörrautomatik/ED100 visade att v36.94 läste ID men ändå sorterade bort kortet. Den äldre sidklassningen krävde ytterligare ord som Låshus eller Cylinder.

v36.95 accepterar därför `known-layout-card-heading` från den redan verifierade profilen som kortbevis. Det är en extra OR-gren i kortklassningen. ID läses fortfarande av profilen från den uttryckliga korttiteln; själva profilmodulen v36.94 och de låsta första-cell-funktionerna är oförändrade. Gammal avläsning har företräde och ritningsskydden körs fortfarande innan profilen. Detta ändrar inget när tidigare koden redan identifierade ett kort.

Verifiering:

- `node tests/smartmatch-table-layouts-v36-95.cjs <lokal exempel-PDF>` passerar för verkliga fem kort, geometri, negativa/tvetydiga fall och alla 15 tidigare kortfixturer. Testet jämför de låsta funktionerna med v36.94 och använder samma profilmodul.
- `node tests/smartmatch-table-layouts-browser-v36-95.cjs <lokal exempel-PDF>` kör den faktiska fasta TEST-sidan i lokal Chromium. Fem kort identifieras utan ritning. Exempelprojektet ger 14 separata positioner och knappar: 140C × 7, VC × 2, WC × 1, HWC × 2, 130C × 2. Klick på varje korttyp öppnar dess ursprungliga kortsida. Kontor och Teknik har inga kort i filen och kopplas inte.
- Samma webbläsartest genererar ett nytt GC2-kort i samma upplägg med endast en automatikrad och en ritningsposition. ID:t indexeras på sida 2 och ritningen får sin GC2-position. Inget visst exempel-ID eller antal rader är hårdkodat.
- Regression i faktisk v36.95-HTML med tidigare Snidaren-PDF behåller alla 15 gamla kort-ID:n och sidor, hittar 17 automatiker med 17 GS-pilar och bevarar samtliga 18 tidigare sparade poster med kontroller, anteckningar och SLR-data. Riktiga Egenkontroll-/SLR-klick fungerar; inga JavaScript-fel.
- Syntax, fast entry och versionsreferenser kontrollerade. CSS, profilen v36.94 och DA-modulen v36.92 är oförändrade. v36.94-snapshots behålls.

Tabell-PDF:en räcker som underlag för att lägga till ett känt upplägg. Andra kort med samma kontrollerade uppbyggnad återanvänder stödet; de aktuella korten och ritningen behöver finnas i appens projekt för koppling. Automatisk inlärning av godtyckliga mallar är inte införd. Roterade/skannade eller andra tabellupplägg är inte verifierade här.

Kund-PDF:er publiceras inte. Kontrollflöde och native iOS/TestFlight är orörda. Se [tabellregelns avsnitt 8–9](SMARTMATCH_TABLE_RULE_LOCK.md) och [samlade funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md).
