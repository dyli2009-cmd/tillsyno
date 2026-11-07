# Projektflöde – egen arkitektur

Status: Aktivt utvecklingsområde.

Projektflödet är ett separat system från Kontrollflödet.

## Egna filer
- `project-workspace.html`
- `project-workspace.css`
- `project-workspace.js`

## Grundprincip
En och samma projekt-PDF är källan för:
1. ritningssidor
2. markerade dörr-/projekt-ID:n
3. dörrkort/protokollsidor

Projektflödet ska:
- läsa flera typer av PDF-markeringar och deras exakta koordinater, inklusive Stamp, Highlight, Square, Circle, FreeText, Ink, Underline och Squiggly
- färgen på markeringen ska inte styra identifieringen
- om markeringen inte själv innehåller ett läsbart ID ska Projektflödet försöka läsa den markerade texten innanför markeringens rektangel
- behandla varje fysisk markering som en egen position
- räkna hur många positioner som finns per ID
- matcha dörr-/projekt-ID mot dörrkortet eller protokollsidan med samma ID i samma PDF
- visa originalprotokollet utan att tappa rubriker, text eller layout
- bygga ett separat interaktivt arbetsprotokoll från originalets innehåll
- ta med ifyllda komponentrader som kontrollpunkter
- inte göra korta tomma fältnamn till kontrollpunkter
- Datum, version och administrativa leverans-/montagerader ska inte räknas som kontrollpunkter
- Arbetsprotokollets automatiska kontrollpunkter ska endast komma från originalrader där ansvar/utförande är märkt `GS`
- Rader märkta `EL`, `DT` eller andra ansvarskoder ska inte visas i egenkontrollen och ska inte påverka procenten; de går fortfarande att läsa i originalprotokollet
- varje fysisk position får egna tillagda, ändrade eller borttagna arbetskontrollpunkter samt kommentarer utan att original-PDF:en ändras
- spara avbockning och procent separat per fysisk position
- återgå till samma ritningssida, zoom och position efter protokollarbete
- projektstatus ska kunna bäddas in direkt i den sparade projekt-PDF:en, inklusive avbockningar, kommentarer, ändringar, egna punkter och procent
- när en sådan PDF öppnas igen ska Projektflödet automatiskt läsa tillbaka den inbäddade statusen
- samma projekt-PDF ska därför kunna flyttas till Files, iCloud Drive, OneDrive eller annan filplats utan separat sidofil
- lokal autosparning får användas som extra skydd, men den portabla PDF-filen är den delbara projektbäraren
- samtidig realtidsredigering av samma molnfil ingår inte i filformatet; den senast sparade filversionen är den som nästa tekniker öppnar
- i iOS-appen ska Projektflödet använda native iOS-filväljare för PDF via Capacitor och falla tillbaka till vanlig HTML-filväljare utanför iOS

## Isolering
Projektflödet får inte importera eller använda Kontrollflödets:
- `security.js`
- `security.css`
- `all-in-one.html`
- `all-in-one.css`

Kontrollflödets lås ska respekteras.

## Webb ↔ iOS spegling
- Under aktiv utveckling av Projektflödet ska webb och iOS uppdateras i samma arbetsomgång.
- Webbens `project-workspace.html`, `project-workspace.css` och `project-workspace.js` är funktionsmässig referens och ska speglas 1:1 till iOS.
- iOS får endast avvika där native-miljön kräver det, exempelvis lokala PDF/jsPDF-runtimefiler, Capacitor FilePicker/Share och safe-area.
- När en Projektflöde-ändring verifieras ska både webb- och iOS-versionen kontrolleras innan arbetet avslutas.
- Kontrollflödet omfattas inte av denna spegling och ska förbli låst.

## iOS PDF-import
- använd explicit öppna-knapp i Projektflödet, inte en label som indirekt aktiverar ett dolt filfält
- kontrollera `Capacitor.isPluginAvailable('FilePicker')` innan native filväljare används
- native iOS använder FilePicker; webb använder vanligt file input
- om native-plugin saknas faller Projektflödet tillbaka till vanlig filväljare och visar tydlig status
- efter filval läses i första hand `webPath`, därefter konverterad `path`

## Projekt-ID
- Den vanliga dörrkorts-/projektpositionskopplingen använder **endast GS-ID**, enligt den tidigare fungerande regeln.
- Exempel: `GS1`, `GS2`, `GSTD1`, `GSID`, `GSIDW`, `GSIW`.
- Rena nummer eller generella dörr-ID:n som `1`, `140D`, `815 C` och liknande ska **inte** skapa GS-positioner.
- GS-positioner läses endast från riktiga PDF-annoteringar av typen `Stamp`, precis som i den tidigare fungerande Projektflöde-versionen.
- ID:t normaliseras så enkla mellanrum eller bindestreck inne i själva GS-koden inte hindrar matchning, t.ex. `GS 1` → `GS1`.
- Matchningen mot protokollsidan använder samma exakta GS-ID. `GS1` får inte matcha `GS2` eller `GS10`.
- GS-koden får stå inuti ett fält med annan text runt omkring, t.ex. `VC-GS1` eller `Entré-GS1`; det är den avgränsade GS-tokenen som matchas.
- Ritningssidor används aldrig som dörrkortsträffar. Bara icke-ritningssidor skannas för protokollkopplingen.
- En enda säker exakt GS-träff krävs. Ingen träff eller flera möjliga sidor innebär ingen klickbar koppling; systemet får inte gissa utifrån ord som `lås`, `trycke` eller `elbleck`.
- Om inget protokoll med samma GS-ID hittas skapas ingen fungerande protokollkoppling för den positionen.
- Dörrautomatikens separata strukturerade märkning och egenkontroll är ett annat system och påverkas inte av denna GS-regel.
- GS-läsningen normaliserar även `GS1`, `GS 1`, `GS-1` och inbäddad text som `VC-GS 1` till samma exakta GS-ID. `GS1` får fortfarande inte matcha `GS10`.
- Om en riktig PDF-stämpel saknar GS-kod i sin annoteringsmetadata läser Projektflödet endast texten inom stämpelns rektangel som fallback. Ingen generell GS-sökning över hela ritningen görs.

## Övriga projektstämplar
- Övriga gula projektmarkeringar hanteras av en **separat matchningsmotor** och ändrar inte GS-logiken.
- Kandidaten får vara både kod och text, t.ex. `140 D`, `310-D`, `815 C`, `310 GA`, `22 FS` eller `Cylinder`.
- Kodformat normaliseras så enkla skillnader i mellanslag, bindestreck eller snedstreck inte stoppar matchning, t.ex. `140 D`, `140-D` och `140D` behandlas som samma kod.
- En markering blir klickbar endast om exakt samma identitet kan kopplas till **ett enda dörrkort**.
- Textord som `Cylinder` får vara kandidat, men ett vanligt förekommande komponentord i dörrkortets brödtext räcker inte. För textkandidater krävs att ordet står som dörrkortets identifiering, exempelvis på en ID-/Littera-/Dörr-/Objekt-rad eller tydligt i dörrkortets övre identitetsdel.
- Ingen säker eller unik dörrkortsmatchning innebär ingen knapp.

## Originalprotokoll – zoom
- originalprotokollet ska kunna nypzoomas med två fingrar på telefon och iPad
- en-fingersdrag används för att panorera när protokollet är inzoomat
- `Passa` visar hela protokollsidan direkt och `300%` zoomar direkt till maxnivån
- plus/minus ändrar zoom i större steg upp till 300%
- på dator/trackpad kan Ctrl/Cmd + hjul/pinch zooma kring pekarens position

## Projektpositioner på ritning
- stämpelns PDF-annoteringsrektangel ska mappas genom PDF.js viewport (`convertToViewportRectangle`) i stället för egen x/y-formel
- detta ska ta hänsyn till sidrotation, CropBox/viewBox och PDF-koordinatsystem så klickytan ligger exakt över den gula stämpeln
- samma viewport-transform ska användas när en position väljs från listan och centreras på ritningen
- alla hittade positioner visas med en diskret färgad overlay så det går att kontrollera visuellt var systemet har positionerat dem; ingen extra ID-etikett läggs ovanpå ritningens egen GS-text

## Startvy
- Innan en projekt-PDF öppnas visas en ren Projektflöde-startvy utan projektstatistik, arbetsverktyg eller positionspanel.
- Sidhuvudets `Projektflöde` är centrerat; den extra `Öppna projekt-PDF`-knappen uppe till höger är borttagen.
- Startsidan har endast huvudknappen `Öppna projekt-PDF` i mitten.
- De tidigare förklarande styckena om PDF-matchning och Kontrollflödet visas inte på startsidan.
- Bakgrunden är en diskret teknisk projektillustration med planlinjer, dörrsymboler och projektmarkeringar. Den försvinner när ritningen öppnas.
- `Passa` och övriga ritverktyg visas först efter att en PDF har öppnats.

## Ritning – navigation
- mushjulet zoomar ritningen in/ut kring muspekaren
- zoomförhandsvisning sker direkt och högupplöst PDF-rendering görs efter en kort paus för snabb känsla på stora ritningar
- Hand-knappen visas inte längre; på dator kan vänsterklick + dra på tom ritningsyta panorera och mittenknappen fungerar också
- på telefon och iPad kan ritningen nypzoomas med två fingrar
- en-fingersdrag panorerar när ritningen är horisontellt inzoomad; när den inte är horisontellt inzoomad används horisontell swipe för sidbyte
- enligt önskat flöde går swipe åt höger till nästa PDF-sida och swipe åt vänster till föregående
- klick på GS-markeringar ska fortfarande öppna positionen

## Positioner och sparande
- Positioner-panelen ska kunna döljas helt och öppnas igen via en liten `Positioner`-knapp så ritningen får maximal arbetsyta
- valet att dölja panelen får kommas ihåg lokalt på enheten
- huvudknappen heter `Spara` och öppnar en Spara-meny.
- `Aktuell ritningssida` finns inte längre som separat export i Projektflödet.
- På dator med stöd för File System Access API öppnas projekt-PDF via systemets filväljare och filhandtaget behålls, så `Spara projekt` kan skriva arbetsstatus tillbaka till samma PDF-fil.
- `Spara som…` öppnar datorns riktiga filväljare så användaren kan välja exempelvis Skrivbord/Desktop och valfritt filnamn; den valda filen blir därefter den aktuella projektfilen för fortsatt `Spara projekt`.
- `PDF-kopia` sparar en oförändrad kopia och byter inte aktuell projektfil.
- I webbläsare utan stöd för systemets filskrivning används vanlig nedladdning som reserv. På iOS används delningsbladet när det stöds så användaren kan välja Files, iCloud eller annan tillgänglig destination.

## Ritningsanteckningar
- Ritverktygen ligger samlade under en kompakt `Verktyg`-meny med `Text`, `Text + pil`, `Pil`, `Bild` och `Ta bort markerad`; `Ångra` och `Gör om` ligger direkt bredvid.
- Text kan flyttas efter placering. `Text + pil` är en sammanhållen markering där textläget och pilspetsen kan flyttas separat; hela markeringen kan också flyttas via linjen. Fristående pilar kan flyttas och finjusteras via ändpunkterna.
- Verktyget heter `Ta kort` och använder enhetens kamera när den stöds. Fotot komprimeras innan det läggs i projektstatusen, placeras på ritningen och kan flyttas, storleksändras eller tas bort igen.
- Ångra/gör om använder vänster/höger historikpilar och omfattar nya ritanteckningar, bilder och flyttningar i den aktuella arbetssessionen.
- Text, text+pilar, pilar och bilder sparas i Projektflödets projektstatus (schema 4) och följer med när `Projekt-PDF med status` sparas och öppnas igen i Tillsyno.
- Ritanteckningar och bilder är i denna version inte plattade som synliga objekt i en vanlig kund-PDF eller i `Aktuell ritningssida`; kundexport/klart-markering lämnas till senare beslut.

## Massmarkering och tidsrapport
- `Välj` gör GS-positioner valbara utan att öppna protokollet. På dator kan användaren dra en markeringsruta över flera positioner; på touch kan positioner väljas en och en. `Alla på sidan` väljer alla positioner på aktuell ritningssida.
- `Klarmarkera` bockar automatiskt av alla effektiva GS-kontrollpunkter för de valda positionerna. När positionens protokoll öppnas efteråt ska samma punkter redan vara ikryssade och progressen vara 100% när alla punkter finns.
- `Tid` öppnar en beräknad projektrapport baserad endast på effektiva GS-kontrollpunkter. Rapporten visar total beräknad tid, beräknat utfört, kvar, tidsvägd projektprocent samt antal punkter utan tidsestimat.
- Grundvärden: WC/toalettbehör 10 min, cylinder 15 min, slutbleck 10 min, trycke 10 min, låshus 30 min, dörrstängare 30 min, dörrautomatik 480 min, armbågskontakt 150 min och magnet 480 min.
- Standardtider kan ändras direkt i tidsrapporten. En inbyggd tidskategori kan tas bort från beräkningen och senare återställas utan att kontrollpunkterna tas bort.
- Egna tidstyper kan läggas till med namn, minuter och ett eller flera sökord, till exempel `Dörrstopp` eller `Handikapptoalett`. Egna tidstyper kan ändras och tas bort.
- Tidsrapporten visar antal punkter och sammanlagd tid per tidstyp samt en kompakt sammanfattning av arbetsmoment, klart, kvar och aktiva tidstyper.
- Tidsfält skrivs som `timmar,minuter`: `8` = 8 timmar, `0,10` = 10 minuter, `0,15` = 15 minuter och `3,10` = 3 timmar 10 minuter. Appen konverterar detta till minuter internt för all beräkning.
- Varje enskild kontrollpunkt kan få en egen tid via `Ändra`. Tomt tidsfält använder standardtiden för kategorin; `0` gör att punkten inte väger tid i beräkningen.
- Projekt- och positionsprocent vägs efter beräknade minuter i stället för att varje kontrollpunkt väger lika. En position kan dock bara bli 100% när alla dess kontrollpunkter är klarmarkerade.
- Positioner utan effektiva GS-kontrollpunkter räknas inte in i projektprocenten eller den tidsvägda färdigställandegraden.
- Tidsinställningarna är uppskattad arbetstid, inte en faktisk tidsstämpel/timer.

## Pausad funktion – dörrautomatik i Projektflödet
- Automatisk dörrautomatikdetektering och egenkontrollsmarkering är tillfälligt avstängd i webbens Projektflöde från v2.4.249.
- Orsak: siffermönster kunde feltolkas, bland annat datumliknande text.
- Sparad dörrautomatikdata raderas inte; funktionen är bara inaktiv och dold tills en säkrare detekteringsregel beslutas.
- GS-matchning och övrig projektmatchning påverkas inte.
