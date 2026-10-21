# Avläsning 9.89 – manuell koppling i granskningen

På ett avläst kort finns knappen **Koppla manuellt** (öppna kortets rad för att visa knapparna). Välj ritningssida, dra en ruta runt en stämpel och bekräfta **Koppla markeringen till [kod]**. Därefter kan fler stämplar kopplas till samma dörrkort. **Klar med manuell koppling** avslutar markeringen. Träffarna ska fortfarande granskas innan projektet öppnas.

Kopplingen använder det uttryckligen valda kortet; stämpelns text behöver inte kunna OCR-läsas eller ha samma skrivsätt. Detta är en koppling per markerad stämpel, ingen automatisk sökning efter alla liknande stämplar.

Manuella positioner får stabila ID:n, sparas i den befintliga granskade matchningen och följer med till ritningsvyn. En ny sökning behåller manuella kopplingar och avmarkeringar. En automatisk träff på samma plats ersätter inte det manuella valet. Ändrad kortkod eller åsidosatt källa återanvänder inte en inaktuell koppling.

Markering på kortsida, ogiltig ruta, tvetydig kortkod och överlappande vald position stoppas före ändring. För att rätta en redan vald felkoppling måste användaren avmarkera den först. Tidigare borttagna projektpositioner återställs genom befintligt flöde i ritningsvyn, inte tyst av denna funktion.

Verifiering: `node tests/smartmatch-read-manual-v9-89.cjs` kör den verkliga kontrollerns manuella koppling, koordinatomvandling, räknare, konfliktkontroll, avmarkering, omsökning, sparande/återläsning och skydd för borttagna/åsidosatta/tvetydiga källor. `node tests/smartmatch-read-handoff-v9-89.cjs` kontrollerar koppling till ritningsvyn och tidigare räknare/status. Syntax och lokala HTML-resurser kontrollerade. Ingen full webbläsarverifiering med användarens faktiska PDF har gjorts.
