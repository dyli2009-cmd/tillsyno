# Avläsning 9.87 – granskade kopplingar och träffantal

Ordinarie Avläsning öppnar 9.87. Befintliga testsidor och den separata SmartMatch-ingången ändras inte.

## Fel och ändringar

- Grön kortstatus byggde tidigare endast på lyckad kortläsning. Den visade inte om några stämplar hade hittats. Varje kort visar nu hittade och valda stämplar direkt under statusen, även när kortet är hopfällt. Ingen vald träff ger röd status ”Ej kopplad”. Oavslutad eller inaktuell sökning är neutral, inte grön. Produktläsning använder fortsatt sin separata status.
- Sparade gruppkopplingar (`groupMappings`) saknades i kortindexet som ritningsvyn använde. Indexet innehåller nu uttryckligen vald ritningsbeteckning och dess källkort. Hela koder behålls; VCDS blir inte automatiskt WC DS utan en uttrycklig koppling.
- Granskade kortsidor filtrerades mot antalet originalsidor. Kort som lagts till efter originalets slut kunde därför försvinna ur indexet. Granskade kort indexeras nu inom hela projekt-PDF:en. Även manuell komplettering kan välja dessa kort. Gränsen för sökning på originalritningen behålls.
- När ritningsvyn öppnas jämförs de granskade positionerna med de faktiskt kopplade positionerna, med kod, sida och positionens identitet/geometri. Avvikelser redovisas per kod. Manuella ändringar och borttagningar återställs inte automatiskt.

## Verifiering

`node tests/smartmatch-read-handoff-v9-87.cjs` kör den verkliga läsaren och ritningsvyns index-/kopplingsfunktioner i en VM: DBL, DBL B uppst, WC DS med uttrycklig VCDS-koppling, GS1/GS2, kort efter originalets sidgräns, manuella val, tvetydiga kort, borttagna och avmarkerade positioner, status och träffantal. En annan position med samma kod får inte dölja en tappad position.

`node tests/smartmatch-stamp-reading-v9-86.cjs` verifierar fortsatt färg och hela flerradiga stämpelbeteckningar med riktig PDF-rendering; OCR-resultatet i rasterdelen är simulerat. Syntaxkontroll av de tre nya JavaScript-filerna godkänd.

Ingen full genomgång i iPhone/iPad-webbläsare eller verifiering med användarens kompletta ritnings-PDF har gjorts. Det går därför inte att lova att varje stämpel i den filen hittas.
