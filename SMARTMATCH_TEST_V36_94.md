# SmartMatch TEST v36.94 – ytterligare känt tabellupplägg

Den tidigare avläsningen hittade de fem kortsidorna i användarens sexsidiga exempel men gav inget kort-ID och därför inga ritningskopplingar. I detta upplägg står `Dorrkort 140C` ovanför tabellen, följt av en Objekt-rad. Tabellens första cell är Komponent och nästa kolumn Produkt. Den låsta standardprofilen sökte ID i första cellen och stannade korrekt när den bara hittade komponentrubriken.

Användaren begärde att nya tabeller kan läggas till som kända upplägg och att fungerande logik ska behållas. v36.94 lägger därför till en separat profil, `card-title-object-components-v1`, i `smartmatch-table-layouts-v36-94.js`. Den kräver en unik uttrycklig korttitel, omedelbar Objekt-rad, Komponent/Produkt-tabell och en närliggande utrustningsrad i rätt kolumn. ID läses enbart från korttiteln för just denna profil. Relativa avstånd används; sidans absoluta placering och de fem exempel-ID:na är inte hårdkodade.

Den befintliga första-cell-avläsningen har företräde och är byte för byte oförändrad. Tillägget används när den inte gav något ID. Titeltext som kommer från en avlägsen högerruta, flera korttitlar, saknad struktur eller flera nummergrupper som `GS1 1` godtas inte av den nya profilen. Tidigare standardprofil fortsätter exempelvis tolka `WC GS1 1` enligt sin befintliga GS-regel.

Efter identifieringen används samma hela-ID-sökning, koordinater, knapp och kortöppning som tidigare. En kort-PDF kan identifieras utan ritning. För koppling behövs de aktuella korten och ritningen i appens projekt. Ett exempel räcker som utvecklingsunderlag för en ny profil; appen lär sig inte godtyckliga mallar automatiskt vid uppladdning.

Verifierat:

- Före ändringen gav den faktiska v36.93-sidan fem kortsidor utan ID och noll kopplade positioner i exemplet.
- `node tests/smartmatch-table-layouts-v36-94.cjs <lokal exempel-PDF>`: alla fem verkliga kort, rubrikfragment, skalning/förflyttning, tomt produktvärde, negativa struktur-/tvetydighetsfall och de 15 gamla Snidaren-fixturerna passerar. Testet kontrollerar också att de tidigare läsfunktionerna är identiska med v36.93.
- `node tests/smartmatch-table-layouts-browser-v36-94.cjs <lokal exempel-PDF>`: faktiska fasta HTML-sidan i lokal Chromium identifierar fem kort ensamma utan påhittade ritningspositioner. Med ritningen finns 14 separata knappar: 140C × 7, VC × 2, WC × 1, HWC × 2 och 130C × 2. Klick på ett exemplar av varje beteckning öppnar dess ursprungliga kortsida 2–6. Kontor och Teknik har inga kort i filen och kopplas inte.
- Det tidigare Teknik-kortet med titel i första sammanfogade cellen fungerar även ensamt och med två exakta Teknik-positioner; Teknikrum/STeknik matchas inte.
- Full faktisk placering och sökning på tidigare Snidaren-PDF behåller exakt alla 15 gamla kort-ID:n och sidor, hittar 17 automatiker med 17 GS-pilar och bevarar samtliga 18 tidigare sparade poster med kontroller, anteckningar och SLR-data. Egenkontroll och SLR öppnas genom riktiga klick; inga JavaScript-fel.
- JavaScript-syntax och versionsreferenser kontrollerade. Fast HTML är samma filinnehåll som versionsmärkt v36.94. CSS och den godkända DA-modulen v36.92 är oförändrade.

Kund-PDF:er publiceras inte. Övriga tabellupplägg, roterad text och OCR är inte verifierade genom detta tillägg. Äldre versioner behålls. Kontrollflöde och native iOS/TestFlight är orörda.

Se [låst standardprofil och nya profilens regel](SMARTMATCH_TABLE_RULE_LOCK.md) samt [samlade funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md).
