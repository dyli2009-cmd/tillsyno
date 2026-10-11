# SmartMatch TEST v36.60 – normal helhetsvy och lugn mobilskärpning

2026-10-11. Användaren vill återgå till originalets normala ritningsutseende och skärpa alla delar i den synliga ytan, utan att filen laddas om från början. v36.59:s separata stämpelutsnitt tas bort; tidigare extra text/ID-lager förblir borttagna.

Mobilen behåller en fast begränsad helsidesförhandsbild under rörelse. Hela det synliga PDF-området skärps efter 1200 ms stillhet, med högst cirka 1 miljon pixlar/2x upplösning. Rendering görs direkt i en enda dold detaljcanvas; ingen temporär canvas och efterföljande stor kopia. Detaljbilden visas endast när helt klar. Under upprepade rörelser döljs bilden och gamla resultat avfärdas, men en startad PDF-rendering får slutföras utan upprepad cancel/restart. En gemensam renderkö förhindrar parallell helbild/detaljrendering. Canvasen får inte storleksändras medan PDF.js använder den; inaktuella resultat frigör ytan först efter avslutad task. Identisk färdig vy återanvänds med filhash i cachen för att aldrig visa annan fils detaljbild.

Mobil pinch förhandsvisas med CSS zoom och bibehållen fokuspunkt, i stället för transform av en stor compositing-yta. Efter gester återställs normal layout. Skydd hindrar en gammal asynkron touchend från att skriva över en nyare påbörjad gest. Datorns detaljrendering kvar. Filnamnsfält/flyttbara datorrutor kvar.

Ingen automatisk location.reload i zoom-/ritningskoden. Endast uttrycklig Uppdatera i sessionsmodulen laddar om sidan. Safari kan själv döda en process vid minnes-/rendererproblem; detta kan inte förhindras genom ett vanligt JS-uppdateringslås. Rotorsaken på fysisk iPhone är fortfarande inte verifierad.

Verifiering: JS-syntax och identiska HTML/resursversioner. Mocktest av faktiska funktioner: en bounded detaljcanvas utan extra kopia; rörelse avbryter/storleksändrar inte aktiv render; stale-resultat frigörs; samma vy återanvänds; ingen detalj under pågående gesture; separata stamp/textlager borttagna; ingen location.reload i ritningskoden. Verkligt test med miljöns PDF.js/native canvas och syntetisk 90-graders PDF: faktiska v36.60 mobilfunktionen renderade hela 390x600-visningsområdet till 780x1200 pixel (936k), pixelidentiskt med originalrenderingens motsvarande område (medelskillnad 0). Detta ersätter inte fysisk Safari/iPhone-test av användarens PDF och CSS zoom/touch.

Endast SmartMatch TEST och dokumentation. v36.59 bevarad. Löpande publiceringsgodkännande gäller enligt överlämningen.
