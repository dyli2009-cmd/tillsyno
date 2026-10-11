# SmartMatch TEST v36.96 – bara protokoll under Spara → Protokoll

Användaren vill ta bort Ta med ritning och GS-länkar och bara spara de protokoll som väljs när de är klara. Alternativet tas bort ur dialogen. Den nya fristående protokollsexportmodulen kopierar enbart de valda revisionsprotokollens sidor och har ingen gren för ritningssidor, GS-menyer eller interna GS-länkar. Förhandsgranskning, Spara fil och Skicka mejl använder samma förberedda protokollsfil.

Godkända protokoll är redan förvalda i det befintliga flödet. Urval, statusfilter, filnamn, lokal sparning och delningsrutiner bevaras. Ett valt protokoll ger dess PDF; flera valda protokoll sammanfogas utan ritning. Protokollens egna befintliga externa företagslänkar behålls.

Verifiering: faktisk v36.96-sida i lokal Chromium genom Spara → Protokoll. Underlaget har sju godkända protokoll förvalda. Alternativet finns inte. Export med ett respektive två valda protokoll ger exakt en respektive två protokollsidor, inga interna GS-länkar och inga originalritningsläsningar i protokollsexporten. Inga JavaScript-fel. Testet finns i tests/smartmatch-protocol-only-browser-v36-96.cjs och använder en lokal projekt-PDF som argument; kund-PDF publiceras inte.

Huvudkodens enda ändringar är versionssträngar och ny separat lagringsnyckel. HTML använder den nya protokollsexportmodulen. CSS behåller sidhuvudets önskade placering: Stäng intill Spara, versionen centrerad och Senaste versionen dold. DA92, profilen94, avläsning, GS-kopplingar och sessionslogik är oförändrade. Hela projektets sparning är separat och ändras inte. Äldre version95 behålls. Kontrollflöde och native iOS/TestFlight är orörda.
