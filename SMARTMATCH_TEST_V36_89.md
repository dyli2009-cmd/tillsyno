# SmartMatch TEST v36.89 – sök från placerad automatik

Användaren vill att manuellt placerad första automatik är referens för Hitta alla andra automatiker: sök efter hela objektnumret, läs maskintyp och sista nummer från varje hittad märkning, koppla sedan med verifierat dörrkort.

Knappen skickar nu vald automatik explicit och ger återkoppling om referens saknas. Vid uttrycklig sökning rensas automatikradscachen, så aktuellt tilldelat dörrkort läses igen innan GS-förslag. PDF-annoteringar söks i Contents, Subj och T i stället för bara det första fyllda fältet; ett generiskt innehåll får inte dölja ett ID i ämnet. Samma ID i flera fält dedupliceras. Sökstatus visar objektnumret och att maskintyp läses individuellt; nollresultat anger vilket objektnummer som sökts.

Objektnummersökning och individuell maskintypstolkning fanns redan. Tidigare upplevt nollresultat i användarens aktiva webbläsarprojekt har inte reproducerats. Den skickade Snidaren-PDF:en ger 17 märkningar för 200154-28 även med tidigare annotationkod; detta är en förstärkning av referens/fältavläsning och aktuell kortkontroll, ingen bevisad diagnos av användarens session.

Verifierat: node tests/smartmatch-da-object-v36-89.cjs. Testen täcker generiskt Contents med ID i Subj, deduplicering, samma objektnummer med maskintyp 24 respektive 37, exakt objektnummergräns och uteslutna kortsidor. Samma test med användarens riktiga PDF ger 17 märkningar. JavaScript-syntax passerar. Automatisk GS-koppling behåller befintliga krav på fysisk position, tilldelat kort, passande maskintyp, ledig GS och ej tvetydigt val; redan sparade kopplingar skrivs inte över. Verifiering av alla 17 faktiska GS-pilar i webbläsarens användarsession återstår.

Ny DA-modul och versionerade HTML/JS/CSS, identisk fast TEST-entry. Tabellregeln, v36.88:s UI-förenkling, Kontrollflöde och native iOS/TestFlight är oförändrade. Förberedelse av kortcache vid återöppning behålls för befintliga pilar.
