# Ritningszoom och dubbeltryck – TEST v8

Beställt 2026-10-15, endast i den separata revisionstestappen.

## Zoom och panorering

- Ritningens befintliga PDF-bild får omedelbart rätt storlek och position. En skarpare rasterbild ersätter den när PDF-renderingen är färdig. Den tillfälliga förstoringen tas inte längre bort i väntan på PDF-bilden.
- Samma ritningspunkt hålls vid fingrarnas mitt eller muspekaren. Layouten uppdateras högst en gång per animationsram. Slutlig PDF-rendering flyttar inte vyn eller bygger om markeringarna igen när geometrin redan stämmer.
- Mushjul/pekplatta använder små kontinuerliga steg utifrån rullningens storlek och väntar 110 ms efter sista rörelsen innan PDF:n vässas. Den befintliga rastercachen och gränserna 4 miljoner pixlar/4096 px behålls.
- Tvåfingerszoom kan övergå direkt till panorering med fingret som ligger kvar. Zoomgränserna 50–800 procent och sidbyte vid svep i passad vy är kvar.
- Webbläsarens automatiska scrollförankring är avstängd bara för testappens ritningsyta. Äldre sidors canvas visas inte som om den vore den nya sidan medan ett sidbyte renderas.

## Markeringar

- Första trycket väljer objektet utan att ersätta dess DOM-noder. Andra trycket på samma markering inom 600 ms öppnar protokollet direkt vid släpp. Detta fungerar också på pilpunkten.
- Små fingerrörelser tolereras bättre på etiketter i förstorat läge. Ett avsiktligt drag flyttar fortfarande etiketten. Pilens precisionsgrepp och låsning av ritningsscroll vid pilflytt behålls.
- Det efterföljande syntetiska klicket efter ett dubbeltryck fångas, så att det inte råkar bocka i en kontrollpunkt i protokollet som just öppnats. Tangentbordsklick behålls.
- Återgång från protokollet behåller ritningens zoom. Kontroller, objektkoordinater och PDF-export ändras inte av zoom eller tryck.

Projektlayout, importprofiler, checklistor och kund-PDF behålls från v7. TEST v7 finns i `v7/all-in-one.html`; samtliga äldre runtime-filer och den låsta importen bevaras. Ordinarie Kontrollflöde och iOS/TestFlight ändras inte.

## Verifiering

`tests/controlflow-gestures-v8.cjs` körs i Chromium med touchstöd vid 820×1180 och 390×844. Det testar faktisk tvåfingerinmatning via CDP, zoomankare, läget före/efter avsiktligt fördröjd PDF-rendering, sammanslagna hjulhändelser, fortsatt enfingerdrag, zoomgränser, stabil första markering, dubbeltryck, 6 px fingerjitter, oförändrade kontrollsvar, återgång med samma zoom, etikettflytt, pilgrepp med scrollås, ångra och sidbyte mellan stående/liggande ritning.

Kund-PDF-regressionen från v6 har också körts mot den aktiva versionen: identiska pixlar i kundmall och exporterad ritning, signatur, återöppning och tillbaka-länk. `reportDoc` är identisk med v7:s implementation. Grundkopians test och äldre versionshashar kontrolleras. Fysisk iPhone/iPad har inte testats; användarens upplevda mjukhet behöver därför även prövas på den egna enheten.
