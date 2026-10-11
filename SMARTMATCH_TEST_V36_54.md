# SmartMatch TEST v36.54 – mobilzoom och enklare återställning

Datum: 2026-10-11. Endast SmartMatch TEST; tidigare v36.53 bevarad.

## Problem och ändring
Snabb upprepad pinch/panorering på telefon kunde följas av en full omladdning. Minnestryck i Safari är en hypotes, inte verifierad kraschorsak. I koden hittades parallella detaljrenderingar och tillfälliga canvasytor som inte nollställdes vid avbruten rendering.

Helbild och detaljbild använder nu samma renderkö. Avbrott behåller taskreferensen tills promise avslutats. Temporära canvasytor nollställs i finally även efter avbrott och inaktuell rendering; dold detaljyta frigörs direkt. Mobil helbild begränsas till cirka 1,8 miljoner pixlar och detaljbild till cirka 1 miljon, högst 2x upplösning. Detaljbild skapas efter 450 ms stillhet på mobil. Zoom och PDF-koordinater behålls.

Extern PDF öppnas direkt. Lokalt utkast med samma filhash och basrevision erbjuds via en kort, icke-modal rad: Återställ / Behåll PDF. Ingen native confirm. Ny öppning, egna ändringar, stängning och lyckad PDF-sparning avfärdar en gammal återställningsrad. Återupptagning av samma aktiva flik och explicit lokalt arkiv återställer arbetskopian utan extra fråga. Lokal status är kortare. Arbetskopian skriver inte automatiskt över Dropbox/Filer; Projekt-PDF måste fortfarande sparas för överföring.

## Verifiering
JS-syntax godkänd. Fasta TEST-HTML identisk med versionerad HTML, resurser v36.54 och unika DOM-ID:n kontrollerade.
Deterministiska mocktester av faktiska renderfunktioner: avbruten hel-/detaljrendering frigör canvas, högst en samtidig rasterrendering, capped raster återanvänds, lyckad detaljrendering frigör temporär yta.
Återställning: samma session utan popup, Behåll PDF, explicit Återställ, avfärdad inaktuell återställning och olika basrevision testade.

Ingen riktig Safari/iPhone eller faktisk PDF-rendering i webbläsare körd här. Chromium saknas i miljön. Testa samma PDF med snabb upprepad zoom/panorering, vänta på skärpa, byt PDF och kontrollera sparad Projekt-PDF på annan enhet. Ingen garanti att Safari-omladdning är slutligt löst före fysisk test.
