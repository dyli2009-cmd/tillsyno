# SmartMatch – Avläsning TEST 9.16

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-16.html`. Intern version: `36.159-READ-TEST`. Tillsyno-version: `v2.4.383`.

## Varför TEST 9.15 fortfarande kunde krascha på iPad

TEST 9.15 begränsade själva PDF-renderingen, översiktscanvasen, detaljcanvasen och bildsökningen. Vid pinch-zoom användes ändå en tillfällig CSS-transform av hela ritningens stage för att visa zoomen direkt under fingrarna.

På iOS kan WebKit främja ett transformerat element till en separat GPU-yta utifrån hela elementets CSS-storlek och enhetens DPR, inte bara de pixlar som syns i skärmen. För den aktuella A1-ritningen kunde stageytan därför motsvara omkring **787 MB vid DPR 2**. Den allocationen låg utanför de canvasgränser som TEST 9.15 införde och kunde få Safari att avsluta sidprocessen med meddelandet *Ett problem inträffade flera gånger*.

PDF-filens storlek på disk visar inte den här belastningen. Problemet uppstår när den stora ritningsytan kompositeras i GPU-minnet.

## Transformfri zoom på iOS

TEST 9.16 använder ingen tillfällig CSS-transform av ritnings-stage på iPhone eller iPad:

1. När pinch-gesten börjar tas den skarpa detaljcanvasen bort så den inte ligger kvar som en extra GPU-yta.
2. Medan fingrarna rör sig samlas bara den önskade zoomnivån och fokuspunkten. Hela A1-ytan skalas inte av WebKit.
3. När fingrarna släpps renderas den pixelbegränsade översikten direkt i den nya zoomnivån och rätt position återställs.
4. Den skarpa detaljen renderas efter en kort paus på iPad, när översiktsrenderingen och gesten har avslutats.

En extremt bred skolsida kan bli över 33 000 CSS-pixlar vid den gamla maxzoomen. TEST 9.16 sätter därför också ett dynamiskt tak på 8 192 logiska pixlar för iPadens ritningsyta. Det ger fortfarande flera gångers förstoring från en inpassad översikt utan att skapa en jättelik scroll- eller grafikyta.

För projekt-PDF:er över 24 MB används stabilt läge: den begränsade översikten zoomas direkt, men den separata automatiska detaljläsningen startas inte efter varje zoom. Det skyddar bildtunga dörrkortsfiler där en liten synlig detalj ändå kan tvinga PDF.js att avkoda hundratals inbäddade bilder från hela sidan. PDF.js får dessutom en bildbudget på 12 MB. Resultatet kan vara mjukare vid kraftig zoom, men ritningen, stämplarna och kopplingarna finns kvar och Safari belastas betydligt mindre.

Det innebär att bilden inte förstoras kontinuerligt under själva fingerrörelsen på iPad. Den uppdateras när gesten avslutas och blir sedan skarp. Det är ett avsiktligt minnesskydd. Muszoom på iPad följer samma transformfria väg. Dator och Android behåller den tidigare tillfälliga zoomförhandsvisningen.

De övriga iPad-skydden från TEST 9.15 finns kvar: begränsade pixelbudgetar, riktad bildsökning på aktuell ritningssida, frigöring av PDF-sidor och canvaser, direktknappen **Koppla bara markerad stämpel** och säkert återställningsläge med `?safe=1`.

## Så provar du på en fysisk iPad

1. Öppna `smartmatch-read-test.html` i Safari och kontrollera att rubriken visar **Avläsning TEST 9.16**.
2. Öppna den färdiga stora projekt-PDF:en och välj **Ritning & dörrkort**. Vänta tills ritningsöversikten syns.
3. Zooma in med två fingrar och släpp. På mindre projekt blir den synliga delen skarp efter en kort paus. På projekt över 24 MB visas den stabila översikten utan en ny automatisk detaljläsning.
4. Panorera till en annan del och upprepa in- och utzoomning minst tio gånger. Safari ska inte visa en tom omladdad sida eller meddelandet om upprepade problem.
5. Öppna ett dörrkort och återgå till ritningen. Kontrollera att zoom och skarp detalj fortfarande fungerar.
6. Markera en missad stämpel och använd **Koppla bara markerad stämpel**. Kontrollera kopplingen utan en sökning genom alla ritningssidor.
7. Välj **Spara lokalt nu**, stäng projektet och öppna den lokala kopian igen.
8. Prova även efter att iPad har roterats mellan stående och liggande läge.

Om en äldre kraschloop återkommer kan `smartmatch-read-test.html?safe=1` användas. Det stoppar automatisk projektåterställning men raderar inte lokala projekt.

## Verifieringsgräns

Statiska tester och webbläsaremulering kan kontrollera att iOS-kodvägen aldrig sätter en CSS-transform under pinch-, knapp- eller muszoom, att pixelbudgetarna används och att projektdata bevaras. De kan inte återskapa den faktiska GPU-allokeringen eller WebKit-processens minnestak på användarens modell.

En fysisk iPad med Safari är därför det avgörande slutprovet för TEST 9.16. Resultatet ska bedömas med den stora kundritningen och upprepad verklig pinch-zoom enligt stegen ovan.

TEST 9.15 och tidigare snapshots samt deras lokala arkiv och service-worker-resurser finns kvar. Standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte.
