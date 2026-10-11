# SmartMatch TEST v36.55 – stabil mobilzoom

2026-10-11. Användaren bekräftar att v36.54 fortfarande ger Safari-felet ”ett problem inträffade flera gånger” vid upprepad zoom på telefon, även efter raderad lokal historik. v36.54 är därför inte en verifierad lösning.

Mobilen använder nu en fast, pixelbegränsad helsidesraster per PDF-sida, oberoende av zoomnivå. Zoom återanvänder raster och ändrar visningsstorlek samt positionsöverlägg. Automatisk detaljrendering är helt avstängd på mobil, även vid direkt anrop. Därmed körs inte PDF-sidans operatorlista igen vid varje zoom/panorering. Canvasens permanenta will-change tas bort; mobilens canvasskuggor tas bort. Datorns detaljrendering och upplösningsanpassning kvar.

Avvägning: vid hög mobilzoom kan text/ritning vara suddigare och skärps inte automatiskt. Det här är en stabilitetsversion för att isolera Safari-kraschen, inte en garanti om perfekt skärpa. Bekräfta först att snabb upprepad zoom är stabil på den aktuella telefonen; utvärdera sedan skärpa separat. Rotorsaken på fysisk iPhone är inte fastställd.

Verifiering: JS-syntax godkänd. Mocktest av faktiska renderfunktioner: åtta upprepade mobilzoomar från 25 till 350 procent startar sammanlagt endast en helsidesrendering; ingen mobil detaljrendering startar; temporär yta frigörs; dator renderar fortfarande vid ändrad upplösning. Versionerad/fasta HTML och resursversioner synkroniserade. Fysisk Safari/iPhone-test återstår.

Endast SmartMatch TEST. v36.54 behålls. Återställningsval från v36.54 kvar. Lokal historikradering ändrar inte PDF-filen. iOS/TestFlight och Kontrollflöde orörda.
