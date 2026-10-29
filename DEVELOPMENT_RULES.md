# Dörrservice – utvecklingsregler

Det här dokumentet ska läsas innan någon ändring görs i Dörrservice.

## Gränssnittsstandard, 29 oktober 2026

Läs [UI_RULES.md](UI_RULES.md) före nya storleks- och layoutändringar. Användaren har beställt första utrullningen i Kontrollflödet. Övriga moduler anpassas först när de beställs; ändra en sida/modul i taget.

## 1. Grundregel: ändra bara rätt arbetsområde
Varje arbetsområde behandlas som en egen modul.

- Kontrollflöde
- Dörrautomatik
- Säkerhetsservice
- Brand
- Projektflöde
- Ritningsverktyg

Om en ändring gäller ett visst arbetsområde får andra arbetsområden inte ändras samtidigt, om det inte uttryckligen är nödvändigt och godkänt först.

Exempel:
- "Ändra Säkerhetsservice" betyder att bara Säkerhetsservice ska ändras.
- "Ändra Projektflöde" betyder att bara Projektflöde ska ändras.
- En förbättring i Projektflöde får inte automatiskt flyttas till Kontrollflöde.

## 2. Projektflöde ska vara helt separat
Projektflöde är ett eget systemflöde och ska hållas isolerat från Kontrollflöde.

Regler:
- Projektflöde får ha egen kod, egen logik, egen navigation och egen versionsserie.
- Ändringar i Projektflöde får inte påverka Kontrollflöde.
- Gemensam kod får bara användas om den är tydligt avgränsad och inte ändrar beteendet i Kontrollflöde.
- Om en ändring i gemensam kod riskerar att påverka Projektflöde eller Kontrollflöde ska det sägas innan ändringen görs.

## 2A. Projektflöde – strikt isolering

Projektflöde ska behandlas som ett **eget system** och utvecklas så separat som möjligt från Kontrollflöde.

Regler:
- när användaren pratar om Projektflöde ska arbetet avgränsas till Projektflöde
- återanvänd inte Kontrollflödets UI, navigation, protokoll- eller arbetslogik bara för att det är enklare
- skapa egen HTML, CSS, JavaScript, state/lagring, PDF-logik och projektlogik där det är praktiskt möjligt
- ändringar i Projektflöde får inte kräva ändringar i Kontrollflöde
- gemensamma hjälpfunktioner får bara användas om de är neutrala och inte skapar beroende mellan systemen
- Projektflöde får ha egna idéer, egna arbetssteg, egna verktyg och egen UX
- Kontrollflödets lås gäller fortfarande och får inte kringgås genom ändringar i Projektflöde
- den nya fristående Projektflödesytan ligger i `project-workspace.html`, `project-workspace.css` och `project-workspace.js`; dessa filer får inte importera Kontrollflödets `security.js`, `security.css` eller `all-in-one.*`

När Projektflöde diskuteras ska fokus ligga på Projektflöde och inga ändringar göras i Kontrollflöde om användaren inte uttryckligen först låser upp Kontrollflödet.

## Inloggning, modulbehörigheter och licenser – beslutad regel

Läs **[TILLSYNO_LICENSE_RULES_LOCK.md](TILLSYNO_LICENSE_RULES_LOCK.md)** före ändringar i inloggning, användarhantering, modulbehörigheter, licenstid eller offlineverifiering.

**Beslut 12 oktober 2026:** Administratören tilldelar moduler och licenstid. En verifierad användare kan arbeta offline i högst den resterande delen av sju dagar från senaste inloggning/kontroll, även om licensen löper ut under offlineperioden. Vid ny onlinekontroll gäller licensens riktiga slutdatum direkt; efter sju dagar krävs ny inloggning. Senare företags- och betallicenser ska inte byggas utan nytt beslut.

Detta är en låst funktionsregel och får inte ändras som bieffekt av annat arbete.

## Fortsättning från senaste arbetspasset

Läs **[SMARTMATCH_FORTSATTNING_2026-10-10.md](SMARTMATCH_FORTSATTNING_2026-10-10.md)** före fortsatt SmartMatch-kodning. Här finns beslut, befintlig TEST-status, återöppningstest, Dropbox-delning, olösta risker och prioriterade förbättringar. Detta är en dokumentationspost, ingen ny funktionsversion.

## SmartMatch – samlade och låsta funktionsregler

Läs **[SMARTMATCH_FUNCTION_RULES_LOCK.md](SMARTMATCH_FUNCTION_RULES_LOCK.md)** före fortsatt SmartMatch-utveckling och när användaren frågar hur en funktion är tänkt. Den samlar gällande principer, avläsningskällor, kopplingar, motiv, verifiering och beslutshistorik.

**[SMARTMATCH_AUTOMATION_RULE_LOCK.md](SMARTMATCH_AUTOMATION_RULE_LOCK.md)** låser det uppdaterade v36.101-flödet: placerad märkning → sök hela objektnumret → egen knapp per fysisk träff → kontrollera GS:s eget dörrkort → pil till närmaste verifierade GS på samma sida. Exakt en synlig pil per fysisk automatik; inga sparade kontroller raderas. Ren närmaste-GS från v36.92 är historik. Manuella val bevaras.

Dessa beteendeprinciper ändras endast efter ett nytt uttryckligt användarbeslut. Felrättningar som återställer beslutad funktion är tillåtna inom beställd omfattning. Äldre versionsanteckningar är historik och överstyr inte aktuell låst regel.

## SmartMatch – låst tabellregel

Läs **[SMARTMATCH_TABLE_RULE_LOCK.md](SMARTMATCH_TABLE_RULE_LOCK.md)** före ändringar i dörrkortsidentifiering eller ritningskoppling. Regeln är låst av användaren: identifiera tabellens celler först, läs ID från översta vänstra rutan och matcha sedan hela beteckningen mot ritningen. Nya tabellupplägg ska läsas in och verifieras med ett exempel; den låsta standardprofilens ID-källa ändras inte. Separata kända läsprofiler läggs endast till enligt ett uttryckligt användarbeslut och dokumenteras med egen ID-källa och verifiering; se tabellregelns avsnitt 8 (TEST v36.94).

## SmartMatch TEST – versionsregel

SmartMatch TEST är en fristående experimentversion och ska inte förväxlas med Tillsynos globala appversionsnummer.

- SmartMatch TEST kan ha en underrevision inom samma huvudversion när användaren vill det, t.ex. v36.13 → v36.14 → v36.15. Höj bara till nästa heltal efter ett uttryckligt beslut. Använd bindestreck i filnamn för underrevisioner, t.ex. `project-workspace-smartmatch-v36-14.js`.
- Skapa nya versionsmärkta HTML-, JS- och CSS-filer för varje ny testversion (t.ex. `project-workspace-smartmatch-v36-14.html`, `.js`, `.css`). Behåll föregående version oförändrad som jämförelse/återgång.
- Uppdatera konsekvent sidrubrik, versionsmärkning, resursreferenser, logg- och nedladdningsnamn. Använd en separat lokal lagringsnyckel för varje testversion.
- Läs gärna tidigare testversioners inbäddade projekt-PDF-data så att tidigare arbete går att ta med till den nya versionen. Skriv däremot nytt projektformat under den nya versionen.
- Nuvarande aktiva testversion: **TEST v36.106**. Nästa underrevision blir **TEST v36.107**.
- **En enda fast adress för SmartMatch TEST:** `project-workspace-smartmatch-test.html` på GitHub Pages. Denna fil är alltid en full kopia av senaste `project-workspace-smartmatch-vNN.html` och länkar till samma versionsmärkta JS/CSS (ingen vidarebefordran, inget iframe).
- **Varje gång en ny TEST vNN görs måste samma commit också uppdatera `project-workspace-smartmatch-test.html`**, så användaren alltid kan använda samma bokmärke/hemskärmsikon. Öppna den fasta adressen först för att verifiera rätt testnummer.
- TEST-versionen betyder **inte** att Tillsyno-appen eller TestFlight har uppdaterats. Publicering dit kontrolleras separat.

## 3. Kontrollflöde
Kontrollflöde är den gemensamma arbetsytan för kontroll/protokoll.

Dörrautomatik, Säkerhetsservice och Brand får använda samma grundfunktioner, till exempel:
- ritning
- markering av objekt
- checklista/protokoll
- översikt
- fel och anmärkningar
- beskriv åtgärd
- kundmall
- spara PDF
- projektuppgifter

Texterna, kontrollpunkterna, benämningarna och innehållet får vara olika för respektive område.

Målet är:
**samma arbetssätt och funktion – olika protokollinnehåll.**

En ändring i den gemensamma funktionen ska kontrolleras mot alla berörda protokoll innan den görs.

## 3A. KONTROLLFLÖDE ÄR LÅST

**STATUS: LÅST från och med Tillsyno v2.4.215.**

Kontrollflöde får inte ändras så länge detta lås är aktivt.

Det innebär:
- gör inga ändringar i Kontrollflödes funktion, design, navigation, protokoll, översikt, kundmall, PDF-flöde eller projektdata
- ändra inte gemensam kod om ändringen kan påverka Kontrollflöde
- ändra inte `all-in-one.html`, `all-in-one.css`, `security.js`, `security.css` eller andra filer som påverkar Kontrollflöde, om inte Kontrollflöde först uttryckligen har låsts upp
- en ändring i en annan modul får inte användas som anledning att samtidigt justera Kontrollflöde
- cache-/versionsändringar får inte i sig användas för att smyga in funktionella ändringar i Kontrollflöde

Kontrollflödet får endast låsas upp efter en **uttrycklig instruktion från användaren**, till exempel:
**"Lås upp Kontrollflödet."**

När användaren låser upp Kontrollflödet får endast den uttryckligen beställda ändringen göras. Efter avslutat arbete ska Kontrollflödet betraktas som låst igen om användaren inte tydligt säger att det ska fortsätta vara upplåst.

Det separata låsdokumentet `CONTROLFLOW_LOCK.md` ska också kontrolleras innan arbete som kan påverka Kontrollflöde.

## 4. En gemensam synlig appversion

Tillsyno ska ha **en enda synlig versionsserie** för hela appen.

Aktuell version: **v2.4.398**

Beställd CE-uppdatering 15 oktober 2026: se [CE_DESKTOP_357.md](CE_DESKTOP_357.md). Delad/flyttbar/storleksjusterbar vy gäller endast dator. Samma enkla Ny dörr-ikon och temakopplad underskrift gäller även iPhone/iPad enligt den kompletterade beställningen. CE-data, PDF-beräkningar, övriga moduler och authregler bevaras. Kontrollflödet är fortsatt låst utanför den fristående CE-modulen.

Regler:
- Samma appversion gäller Kontrollflöde, Dörrautomatik, Säkerhetsservice, Brand, Projektflöde och Ritningsverktyg.
- Visa inte separata versionsnummer för enskilda moduler.
- Varje användarsynlig uppdatering ska höja Tillsyno-versionen med ett steg.
- Exempel: v2.4.244 → v2.4.245 → v2.4.247.
- Versionsnumret ska visas på Home så att det är enkelt att kontrollera vilken uppdatering som körs.
- Tekniskt buildnummer för TestFlight får finnas separat, men den synliga versionsbeteckningen ska följa Tillsyno-versionen.
- När en ny version görs ska webb och iOS speglas till samma Tillsyno-version.

## Gemensamma datorstorlekar

Läs **[DESKTOP_SIZE_RULES.md](DESKTOP_SIZE_RULES.md)** före nya storleksanpassningar på dator. Användarbeslut 15 oktober 2026: utgå från storleksskalan på Tillsynos första sida (v2.4.323), med 700 px ram, 640 px valkort och 20/14 px korttitel/beskrivning. Guiden anger kompletta mått, enhetsvillkor och den beställda CE-startsidan.

## 5. Stabil funktion ska inte ändras i onödan
När en del är godkänd och fungerar ska den betraktas som stabil.

Gör inte:
- spontana designändringar
- omstrukturering bara för att "städa"
- ändringar i fungerande navigation
- ändringar i protokoll som inte hör till uppgiften
- massändringar i gemensam kod utan kontroll

Gör minsta möjliga ändring för den aktuella uppgiften.

## 6. Innan en ny ändring
När arbete återupptas ska följande göras:

1. Läs detta dokument.
2. Kontrollera vilket arbetsområde användaren pratar om.
3. Kontrollera senaste relevanta ändringarna i GitHub.
4. Bekräfta vilken modul som ska ändras.
5. Ändra bara den modulen.
6. Kontrollera att andra moduler inte har påverkats.
7. Spegla motsvarande ändring till iOS endast när samma modul ska finnas 1:1 där.

Om användaren säger:
"Kan du kolla vad vi gjorde sist?"
ska senaste relevanta GitHub-ändringar för just den aktuella modulen kontrolleras innan fortsatt arbete.

## 7. Gemensam kod
Gemensam kod är tillåten för verkligt gemensamma funktioner, men ska behandlas försiktigt.

Före ändring i gemensam kod:
- identifiera vilka moduler som använder den
- kontrollera risken för bieffekter
- undvik att ändra beteendet för andra moduler
- separera modulspecifik logik när det behövs

Om en funktion börjar skilja sig mycket mellan två arbetsområden ska den hellre delas upp än fyllas med specialfall som gör systemen beroende av varandra.

## 8. Webb och iOS
Webb och iOS ska normalt ha samma funktionalitet för samma modul.

### Aktiv regel för Projektflödet
Så länge användaren uttryckligen arbetar med **Projektflödet** ska varje användarsynlig ändring i Projektflödet speglas till både webb och iOS i samma arbetsomgång.

Det innebär:
- `project-workspace.html`, `project-workspace.css` och `project-workspace.js` ska hållas funktionellt 1:1 mellan webb och iOS
- efter en webbändring i Projektflödet ska motsvarande iOS-filer uppdateras innan arbetet betraktas som klart
- efter en iOS-specifik korrigering ska webbversionen kontrolleras så att funktionerna fortfarande motsvarar varandra
- endast nödvändiga native-skillnader får avvika, till exempel Capacitor FilePicker, Share, lokala runtime-filer eller iOS safe-area
- samma synliga Tillsyno-version ska användas på webb och iOS
- denna speglingsregel gäller endast den aktiva Projektflödesutvecklingen och får inte användas för att ändra Kontrollflödet eller andra låsta moduler

Men:
- ändring i webb ska inte automatiskt innebära förändring i andra arbetsområden
- iOS-specifik kod får vara separat
- native-anpassningar ska inte ändra webbflödets funktion

## 9. Huvudprincip
**Rätt ändring, på rätt plats, i rätt modul – utan att röra det som redan fungerar.**


## Startsida på dator – 15 oktober 2026, v2.4.323

Endast datorns startsida förstoras enligt DESKTOP_HOME_323.md. Telefon, iPad och temafärger bevaras. Kontrollflödet är fortsatt låst.

## Områdesval på dator – v2.4.324

Godkänd avgränsad förstoring av text/ikoner enligt DESKTOP_AREA_324.md. Telefon/iPad, kortmått, färger och checklistor bevaras. Kontrollflödet är åter låst.

## Checklistval på dator – v2.4.325

Godkänd förstoring av checklistvyn i alla tre områden enligt DESKTOP_CHECKLISTS_325.md. Telefon/iPad, färger och protokollinnehåll bevaras. Kontrollflödet är åter låst.

## Ritningsrubrik på dator – v2.4.326

Beställd områdesrubrik, checklistrad och större ritningsstart på dator enligt DESKTOP_DRAWING_HEADER_326.md. Telefon/iPad, färger och protokollinnehåll bevaras. Kontrollflödet är åter låst.


2026-10-15, Tillsyno v2.4.327: Beställd rättning av datorns PDF-start för Säkerhetsservice och Brandsäkerhet. Samma DOM-presentation som i revisionen aktiveras även i ordinarie all-in-one.js. Rätt områdesnamn och valda checklistor visas, befintliga större CSS-mått återanvänds. Routing, PDF, projektdata och telefon/iPad bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.328: Användaren beställde samma korrekta områdesrubrik och valda checklistnamn på dator, iPhone och iPad. Texten följer protokollvalet på alla enheter; de större måtten aktiveras fortfarande bara på dator. Mobilens och iPadens befintliga typografi och knappar bevaras. Ingen ändring av routing, PDF eller projektdata. Kontrollflödet är åter LÅST.


## Gemensamma texter på alla enheter – användarbeslut 15 oktober 2026

Texter och benämningar ska vara identiska på dator, iPhone och iPad. När text ändras ska motsvarande text uppdateras för samtliga enheter och i webb-/iOS-källorna. Endast storlek, radbrytning och layout får anpassas till skärmen; enhetsvillkor får inte lämna kvar gamla formuleringar.


2026-10-15, Tillsyno v2.4.329: Användaren bekräftade samma synliga områdesrubrik och checklistnamn i alla tre områden på dator, iPhone och iPad efter Fortsätt till ritningen. Revisionssidans kompakta CSS dolde checklistnamnen på små enheter. Kontexttext visas nu med normal radbrytning på alla enheter; större mått kvarstår endast på dator. Verifierat i 18 Chromium-flöden genom protokollvalet i två teman och tre enhetsvyer, med synlighetskontroll av underrubriken. Protokollval och befintliga textstorlekar bevaras. Ingen fysisk enhet eller ny TestFlight-build testad. Kontrollflödet är åter LÅST.


## Gemensamt innehåll och visuella delar på alla enheter

Användarbeslut 15 oktober 2026: alla ändringar av texter, logotyper, ikoner och andra visuella delar ska gälla dator, iPhone och iPad. Endast storlek, placering, radbrytning och layout anpassas till skärmen. Detta är en generell utvecklingsregel; ingen extra designändring beställs genom regeln.


2026-10-15, Tillsyno v2.4.330: Beställd temarättning av Sparad servicefil hittad efter öppning av arbets-PDF. Dialogens bakgrund, rubrik, text, hjälptext, knappar och backdrop följer vald palett på alla enheter. Ingen ändring av Ny service/Fortsätt ändra, PDF-innehåll eller projektdata. 105 färg- och fortsättkontroller passerade i Chromium: sju teman på telefon, iPad och dator med en riktig arbets-PDF med ett objekt. Fortsätt behåller objektet och visar ritningen utan runtime-fel. Ljus iPad-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.331: Användaren beställde förstoring endast av Sparad servicefil hittad på dator. Dialogen får 640 px arbetsbredd, 22 px rubrik, 16 px brödtext, 14 px hjälptext, 16 px knapptext och minst 48 px knappar. Avgränsat till minst 1100 px, hover och precis pekare med telefon-/surfplatteval undantagna. Andra rutor, tema, textinnehåll, PDF och arbetslogik bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.332: Användaren prioriterade att menyraden Ritning/Översikt/Protokoll/Projekt ska följa valt färgtema. Gemensam CSS kopplar bakgrund, text, ikoner, hover, fokus och aktiv flik till paletten på alla enheter. Geometri och navigation bevaras. 168 Chromium-kontroller passerade i sju teman på telefon, iPad och dator inklusive faktisk växling av flikar efter öppnad arbets-PDF. Ljus iPad-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.333: Beställd rymligare ritningsarbetsyta på dator och tydligare moderna verktygsikoner. När en PDF visas på dator samlas snabbverktygen i sid-/zoomraden, rubrikdelen komprimeras och kontroller får 44 px klickytor. Ritytan ökade från 663 till cirka 734 px vid 1440×1000 och från 463 till cirka 534 px vid 1100×800. Den ursprungliga verktygsplaceringen återställs på telefon/iPad, vid mindre fönster och i andra vyer. Nya SVG-ikoner för sidbyte/zoom är gemensamma för alla enheter. PDF-beräkningar, koordinater, protokoll, projektdata och export ändras inte. Ny UI-modul inkluderas i offlinecachen. Verifierat: 21 flöden i sju teman på tre enhetsvyer och sex ytterligare flöden på 1100 px i revision/Säkerhetsservice/Brand. Meny, zoom, vynavigering och synlighet kontrollerade utan runtime-fel; telefon/iPad behåller ritningsytans höjd. Datorbild visuellt granskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.334: Beställt gemensam datorstorlek på rubrikdel, A+/A− och nedersta meny i Ritning, Översikt, Protokoll och Projekt. Desktop-kontexten behålls medan en PDF är öppen, oberoende av aktiv flik. Endast den samlade ritningsverktygsraden återställs vid byte till annan vy; även ordinarie Säkerhetsservice/Brand-översikt övervakas. A+/A− har 44 px klickyta och 14 px text; nedersta menyn har 13 px text och 44 px knappar i alla datorflikar. Innehåll, textskalningsfunktion, projektdata och PDF bevaras. Verifierat: 105 flikväxlingskontroller över sju teman och tre enhetsvyer samt 30 ytterligare kontroller på 1100 px för alla tre områden i ljust/mörkt tema. Rubrikhöjd, kontrollstorlekar och menymått är identiska mellan flikarna. Inga runtime-fel; datorns Projekt-vy bildgranskad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.335: Beställt Öppna annan ritning med synlig text och mappikon vid filnamnet i rubrikdelen på alla enheter. Långa filnamn kan visas fullt genom tryck. Beställt Justera stämplar direkt i Kundmalls ritningsvy: storlek för alla eller en vald stämpel, dragning av etikett utan flytt av objektpunkt, samt Spara PDF via befintligt sparflöde. Skalan sparas per objekt i customerStampScale (0,5–3); labelX/labelY sparar justerad placering. Samma ritningsbyggare används för Kundmall och export, även för äldre arbetsfiler. Dörrautomatikens båda protokolltyper har gemensam större standard (15,4/13,2 punkter för kort/lång etikett; 10 procent över tidigare revisionsstorlek). Återöppning förstorar inte stämplarna på nytt. PDF-zoom och stämpelstorlek är separata. PDF-objektens ankare, nummer och övriga kontrolluppgifter bevaras. Webb och native-källa speglas; ingen ny TestFlight-build verifierad. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.336: På användarens beställning läggs Återställ alla storlekar i Kundmall → Justera stämplar. Återställer samtliga aktiva protokolls stämplar på alla sidor till 100 %, även med en enskild stämpel vald. Sparas via samma projekt-/PDF-flöde. Etikettplacering, objektpunkter och kontrolluppgifter bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.337: Beställd justering av pillinjens tjocklek i Kundmall → Justera stämplar. Normal, Lite tjockare, Tjock och Extra tjock gäller alla aktiva stämplar eller vald stämpel. Egen skala customerArrowScale (1–3), oberoende av etikettstorlek. Samma PDF-byggare används i kundmall och export. Pilspetsens linjer förstärks och storlek anpassas; objektpunkter och etikettplacering bevaras. Återställ alla storlekar ändrar enbart stämpelstorlek. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.338: Beställd tvåfingerzoom i kundmallens ritning. Separat visningszoom, skarp omrendering efter gest, zoom kring fingrarnas mittpunkt och begränsad canvasminnesåtgång. Ingen ändring av stämplarnas PDF-storlek, pillinjens bredd eller projektuppgifter. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.339: Användaren beställde samma kundmallsverktyg även i Säkerhetsservice och Brandsäkerhet. Ordinarie säkerhetsruntime använder nu samma ritningsbyggare för förhandsvisning och export och samma stämpelredigerare: alla/vald, storlek, återställ storlekar, pillinje, flyttning och tvåfingerzoom. Befintliga checklistor, rapporter, PDF-länkar, projektdatalagring och protokollval bevaras. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.340: Beställd muszoom i kundmallens ritning på dator för samtliga kontrollområden. Ctrl + mushjul (⌘ på Mac) zoomar kring pekaren, vanlig rullning bevaras. Samma separata visningszoom som tvåfingerzoom; PDF-data ändras inte. Kundmallsdialogens ritningsyta får korrekt kvarvarande höjd när verktygen radbryts. Webb och native-källa speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.341: Beställd mindre text i Översikt → Beskriv åtgärd, inklusive hjälptexten Beskriv vad som gjordes för att lösa felet. 12 px på större skärmar, befintliga kompakta 10 px på små skärmar. Samma ändring för samtliga kontrollområden och i native-källan. Texter, innehåll och sparfunktion bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.342: Beställd standard i Kundmall för alla kontrollområden: Extra tjock pillinje (3×) och 177 % stämpelstorlek. Gäller när sparat eget val saknas; befintliga individuella justeringar bevaras. Återställ alla storlekar återgår till nya standarden 177 %. Kontroller för egna justeringar behålls. Samma byggare för kundmall och PDF-export, webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.343: Beställd hand/panorering i kundmallens ritningsvy. Vänster musknapp drar ritningen, handmarkör visar läget och klick efter dragning undertrycks. Stämpelhandtag behåller separat etikettflyttning. Samma redigerare i alla tre kontrollområden, webb/native-källor speglas. Zoom, PDF och projektdata bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.344: Användaren beställde och godkände publicering av Detektorer som eget protokoll och egen flik under Säkerhetsservice. Ikon per fysisk detektor, automatisk lägsta lediga positiva nummer, namn/kod, placering, fyra bedömningar och anmärkning. Samma statusregler, översikt, projektlagring och arbets-/kund-PDF används. Andra objekttyper behåller sin numrering. Blandat val med Dörrautomatik/Lås stöds. Webb och native-källa speglas; fysisk iOS/TestFlight har inte verifierats. Kontrollflödet är åter LÅST efter den avgränsade beställningen.


2026-10-15, Tillsyno v2.4.345: Beställd mindre detektorikon på arbetsritningen i Säkerhetsservice. Synlig storlek 22×28 px dator, 20×26 px iPad/surfplatta och 18×24 px telefon; manuellt enhetsval följs. Pekskärm behåller 44×44 px transparent tryckyta. Endast CSS för ritningsikonen ändras; statusfärger, checklistor, placering, PDF-symboler och data bevaras. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.346: Beställd lagom stor knapp Visa på ritningen i detektorprotokollet. Global danger-marginal på grannknappen sträckte flexraden och gav 76 px knapphöjd. Marginal nollställs endast i detektorredigerarens åtgärdsrad; knappar centreras och Visa på ritningen behåller 44 px tryckhöjd. Kontrollerat vid 390, 820 och 1440 px. Text, navigering och övriga knappar utanför denna rad bevaras. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.347: Beställd uppdelning av Säkerhetsservice → Projekt. Serviceföretag och Tekniker & dokument placeras i vänster kolumn, Anläggning & jobb och Beställare i höger. Ny service behåller en egen rad under uppgifterna. Kolumner från 720 px, telefonläge och små skärmar behåller staplade kort. Aktiveras endast när Säkerhetsservice-protokoll är valda; Brand och revisionens befintliga projektlayout bevaras. Samma fält, ID och sparlogik. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.348: Beställd kortare detektoretikett på ritningen: endast löpnummer och eventuell kod, t.ex. 12 · IR-101. Ordet Detektor tas bort från arbetsritning, kundmallens ritning och PDF-ritning. Namnet i protokoll och anmärkningsöversikt, sparat ID, numrering, status och övriga objekttyper bevaras. Samma markeringsetikett används under stämpeldragning. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.349: Beställd lätt genomskinlig detektorikon. 80 % opacitet på arbetsritningen och i kund-/arbets-PDF:s detektorsymbol. Nummer/kod och stämpeletikett behåller full opacitet. PDF verifierad med nummer/kod utan ordet Detektor, symbolopacitet 0,8 och lyckad sparning/återöppning. Status, koordinater och kontrolluppgifter bevaras. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.350: Två beställda förbättringar. Klicka på stämpelprocenten i Kundmall → Justera stämplar för att skriva 50–300 % direkt och använda värdet för alla aktiva stämplar på alla sidor eller vald stämpel. Använd/Enter tillämpar exakt skala; Klart tillämpar ett påbörjat värde. Återställ 177 %, pillinjer, zoom och inaktiva protokoll bevaras. Detektor tas bort direkt utan webbläsar-popup; en lokal meddelanderad erbjuder Ångra genom befintlig sessionshistorik, med skydd mot att ångra fel senare åtgärd/projekt. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.351: Beställd ordning på detektorns ritningsetikett: kod först, bindestreck och löpnummer sist, t.ex. IR-101-12. Utan kod visas bara löpnumret. Samma etikett i arbetsritning, kundmall och PDF-ritning; sparade koder/nummer och namn i protokoll/översikt bevaras. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.352: Beställt detektorprotokoll i Kundmall. Från detektorfliken öppnas vald detektors egen protokollsida direkt. PDF-sidan har rubriken DETEKTORPROTOKOLL, detektornummer, namn/kod, placering och bedömning, samt samma projekt-/kundrutor och kontrollresultat som övriga serviceprotokoll. PDF och sidval verifierade. Webb/native-källor speglas; TestFlight ej verifierat. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.353: Beställd samordning av detektorer med befintliga Protokoll. Den extra Detektorer-fliken och specialvyn tas bort. Detektorns ritningsikon och översiktskort öppnar ordinarie protokoll med objektuppgifter, kontrollpunkter och anmärkningar. Kundmall från Protokoll öppnar vald detektors ifyllda PDF-protokoll direkt. Borttagning utan popup och Ångra bevaras. Flöde, PDF-resultat och ångra kontrollerade i telefon-, surfplatte- och datorbredder. Webb/native-källor speglas. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.354: På användarens uttryckliga beställning får Säkerhetsservice samma kontrollpunktsuppställning som Checklista revision dörrautomatik: gemensamma kolumnrubriker och – / ✓ / × för Ingår ej, Klart utan anmärkning och Klart med anmärkning. Gäller Inbrottslarm, Detektorer, Lås & Dörrmiljö och Passer; responsiv CSS är avgränsad till dessa checklistor. Befintliga resultatvärden, anmärkningar, statuslogik, PDF-rapport och andra områdens protokoll bevaras. CSS ingår i webbens offlinecache. Samma checklistefunktion och CSS speglas till native-källan med befintliga native-anpassningar kvar. Verifierat i Chromium: 48 protokollflöden i tolv kombinationer av webb/native-källa, telefon/iPad/dator och ljust/mörkt tema, 144 resultatval samt sparning och återöppning av alla fyra objekttyper per kombination. Kolumnplacering och skärmbredd kontrollerade; inga runtime-fel. Telefon- och datorbilder granskade. Fysisk iOS och ny TestFlight-build har inte verifierats. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.355: På användarens beställning får CE-märkningens första sida (Öppna projekt-PDF / Nytt projekt) samma datorskala som Tillsynos startsida i v2.4.323: 700 px ram, 640 px valkort, minst 108 px korthöjd, 28/20/14 px rubrik/korttitel/beskrivning och 60 px ikonrutor. Endast dator från 1100 px med hover och precis pekare; uttryckligt telefon-/surfplatteval undantas. Avgränsad CSS under ceProjectPickerOpen; färger och CE-arbetsytans funktioner bevaras. CSS ingår i CE:s offlinecache. Användaren bad även att den gemensamma datorskalan sparas på GitHub: DESKTOP_SIZE_RULES.md är länkad från utvecklingsreglerna och speglas till native-repot. Verifierat i Chromium: 16 före/efter-fall i ljust/mörkt tema; sex datorfall med exakta mått och tio pixelidentiska telefon-/iPad-/manuella enhetsvyer. Nytt projekt, Öppna projekt-PDF och Sparade projekt kontrollerade utan runtime-fel. Ljus dator och mörk låg datorvy bildgranskade. Native saknar CE-modulen och får endast samma synliga appversion och dokumentation. Kontrollflödet är fortsatt LÅST.


2026-10-15, Tillsyno v2.4.356: På användarens beställning rättas blinkningen när CE-märkning öppnas. HTML markerar CE-uppstart separat från behörighetskontrollen; befintligt tema visas medan innehållet hålls dolt tills lokala projektuppgifter och rätt startvy är färdiga. Ingen extra laddningsvy läggs till. Startflaggan tas bort i finally även vid lagringsfel. Befintligt val mellan projektmenyn och ett aktivt lokalt CE-projekt samt spara/öppna/stäng bevaras. Endast CE:s initiala synlighet ändras funktionellt; authregler och övriga moduler bevaras. Verifierat i Chromium: 18 starter i telefon/iPad/dator och ljust/mörkt tema, med tomt projekt, aktivt sparat projekt och stängt sparat projekt. IndexedDB-öppning fördröjdes; bildrutornas synlighet kontrollerades utan en enda felaktig vy. Sparade företagsuppgifter och Nytt projekt/Stäng kontrollerade. Ytterligare test av lagringsfel bekräftade att startspärren släpps och befintligt felmeddelande visas. Native saknar CE-modulen och speglar endast det gemensamma versionsnumret och anteckningen. Kontrollflödet är fortsatt LÅST.


2026-10-15, Tillsyno v2.4.358: Beställd rättning av datorns ZIP-delning i den fristående CE-modulen. Både valda filer och komplett CE-underlag använder samma färdiga ZIP även när webbläsaren nekar direktdelningen. Avbrott ger ingen nedladdning och dubbelklick spärras under delning. Data, PDF-innehåll och godkännanden bevaras. Se CE_ZIP_SHARING_358.md. Kontrollflödet är fortsatt LÅST.


2026-10-16, Tillsyno v2.4.359: Beställd förenkling av Administration. Väntande ansökningar först, filtrerbara räknare, tydliga modul- och licensuppgifter, samlad behörighet/licens och separat meny för kontoradering. Admin-specifik CSS följer alla sju teman. Godkännande och radering kan provas igen efter tillfälliga serverfel utan att stänga dialogen. GitHub-kopian av adminservern synkas med redan aktiv Supabase-funktion v9; servern ändras inte. Övriga moduländringar är endast versions-/cachereferenser. Se ADMIN_UI_359.md. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.366: Beställd rättning av Ritningsverktygets sparflöde efter borttagna sidor. Spara PDF får ett tydligt val mellan vanlig export av kvarvarande sidor och separat bildoptimering. Vanlig export kräver inte den valfria jämförelsen av identiska bilder, vars gräns för många korsreferenser annars kunde hindra sparandet. Bildoptimeringens strikta verifiering och skyddet för signerade filer bevaras. Se DRAWING_TOOLS_366.md för arbetsgång och verifieringsstatus. SmartMatch TEST 9, Kontrollflöde och auth ändras inte funktionellt. Ingen tillgänglig native-källkopia eller TestFlight-build har verifierats. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.367: Beställd testfunktion i Ritningsverktyget för sökbara dörrkort. Ett markerat helt kort eller annat valt område läses på uttryckligt valda sidor; originalets synliga bilder, tabeller och ritningslinjer behålls medan granskade OCR-ord får ett osynligt textlager på samma plats. En guide, val av sidor med samma format, avläsningsstatus med sida/område/procent/tid, avbrott och separat PDF-/JSON-export tillkommer. Befintlig PDF-text återanvänds; blandade bild-/textsidor kontrolleras inom markeringen. Detta är en webbläsarbaserad testfunktion, inte ett löfte om mindre PDF eller stöd för användarens ej tillgängliga 251 MB-fil. Se DRAWING_TOOLS_367.md för arbetsgång och verifieringsstatus. SmartMatch TEST 9, Kontrollflöde och auth ändras inte funktionellt. Ingen native-källkopia eller TestFlight-build har verifierats. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.368: Beställd tydligare avläsningsstatus i den separata SmartMatch Avläsning TEST 9.1. Kortupptäckt, kod-/tabelläsning, ritningssökning och produktsteget visar aktuell fas, PDF-sida, kort eller bildområde, verkliga framsteg inom fasen, förfluten tid och försiktig återstående tid när tillräckligt underlag finns. Bildläsningens lokala procent redovisas separat; tidräkningen stoppas vid klart, fel eller avbrott. Läsregler, söksätt, matchning och GS-urval bevaras. En rättning tillåter manuellt valda kortsidor i kodläget även utan den valfria tabellmarkeringen. Fast testsida följer TEST 9.1 och tidigare TEST 9 finns kvar separat. TEST 9.1 har egen lokal lagring; sparad projekt-PDF används för övergång från tidigare test. Se SMARTMATCH_READ_TEST_9_1.md för arbetsgång och verifieringsstatus. Ritningsverktyg, ordinarie SmartMatch, Kontrollflöde och auth ändras inte funktionellt. Ingen fysisk iOS, native-källkopia eller TestFlight-build har verifierats. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.369: Beställd fortsättning i separata SmartMatch Avläsning TEST 9.2. GS-checklistor visar produktvärden från Övrigt / Produkt och grupperas efter kortets avsnitt; Monteras av styr fortfarande ansvar, inte Levereras av. Upprepade tabellrubriker får egen kolumngeometri och radbrutna produktceller bevaras. Lägg till kopplingar söker en markerad hel beteckning över ritningssidorna, förvalt med samma textfärg, och låter användaren granska träffarna samt välja dörrkortssida utan att gamla positioner eller kontroller ersätts. Saknade kort kan läggas till från fler PDF-filer; senare produktläsning begränsas som standard till väntande kort. När alla listor är färdiga öppnar Läs produkterna igen en ny produktläsning utan ny ritningsmatchning. Äldre automatiska GS-listor kan byggas om från sparade tabellord med befintliga radnycklar/svar, medan manuellt ändrade listor behålls. TEST 9.1 bevaras och TEST 9.2 använder egen lokal lagring; projekt-PDF används vid versionsövergång. Se SMARTMATCH_READ_TEST_9_2.md för steg och verifiering. Användaren beställde dessutom rättning av svenska bokstäver i Ritningsverktygets Förbered sökbara dörrkort: en lokal svensk OCR-modell används tillsammans med engelska där och i TEST 9.2. Osäkra ord behöver fortfarande granskas; säkerhetströsklarna behålls. Arbetsgång och verifiering finns i DRAWING_TOOLS_369.md, språkmodellens källa/licens/kontrollsumma i vendor/tesseract/NOTICE.md. Ritningsverktygets övriga PDF-logik, ordinarie SmartMatch, automatisk DA-koppling, standardprofilens ID-källa, Kontrollflöde och auth ändras inte. Ingen fysisk iOS eller ny TestFlight-build verifierad. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.370: Beställd fortsättning i separata SmartMatch Avläsning TEST 9.3. Ursprunglig dörrkortsbeteckning och uttryckligen vald ritningsbeteckning redovisas separat, exempelvis DBL på kortet och DBL-1 på ritningen. Individuella kod- och tabellmarkeringar kan sparas per sida eller kort och läsas om riktat utan att andra kort eller befintliga kopplingar tyst ersätts. Avvikande verklig kod kräver ny matchning och granskning. TEST 9.2 bevaras och TEST 9.3 har egen lokal lagring; projekt-PDF används för övergång. GS-regler, ordinarie SmartMatch, automatisk DA-koppling, standardprofilens ID-källa, Ritningsverktygets funktioner, Kontrollflöde och auth ändras inte. Ritningsverktygets redan befintliga vanliga sidvalsexport verifierades på nytt efter användarens fråga om filstorlek; ingen ny sparfunktion införs. Se SMARTMATCH_READ_TEST_9_3.md för steg och verifieringsstatus. Ingen fysisk iOS eller ny TestFlight-build verifierad. Kontrollflödet är fortsatt LÅST.


2026-10-17, Tillsyno v2.4.371: Felrättning i separata SmartMatch Avläsning TEST 9.4 efter användarens produktläsningsfel på alla dörrkort. Sparad OCR-text kan innehålla överlappande rubrikfragment som Monta + av. Bara geometriskt bekräftat upprepad bokstav i en fullständig känd kolumnrubrik sammanfogas; produktvärden, koder och GS/DT ändras inte. Produktläsning med olästa montage-/produktkolumner får inte spara över befintliga arbetslistor med tomma resultat. Lokala omläsningar kan rätta de misslyckade korten, och produktvyn hänvisar till sparad ritningskoppling. Tidigare TEST 9.3 bevaras; egen 9.4-lagring och projekt-PDF för övergång. Ingen ändring i Ritningsverktygets funktioner, ordinarie SmartMatch, DA-koppling, standardprofilens ID-källa, Kontrollflöde eller auth. Se SMARTMATCH_READ_TEST_9_4.md för faktisk kundprovning och syntetiska regressionstester. Ingen fysisk iOS eller ny TestFlight-build verifierad.

2026-10-17, Tillsyno v2.4.372: Felrättning i separata SmartMatch Avläsning TEST 9.5 efter rapporterad PDF på 0 byte. Förbered och verifiera före filväljaren; fånga oföränderlig fil före väntan; avbryt misslyckad skrivning; kontrollera diskfilens innehåll före lyckat besked. Tom indata ersätter inte ett öppet projekt. Föregående TEST 9.4 är oförändrad; dess lokala arkiv kan kopieras en gång till ny separat lagring utan att källan ändras. Se SMARTMATCH_READ_TEST_9_5.md.

2026-10-17, Tillsyno v2.4.373: Beställd rättning i separata SmartMatch Avläsning TEST 9.6 för svenska bokstäver och uppdelade rubrikord. Angränsande PDF-textfragment på samma baslinje återförenas geometriskt utan ordlista eller ändring av bokstäver. Hela kända rubrikord kan kännas igen trots interna fragmentmellanrum; okända beteckningar och verkliga bokstavsskillnader behålls. Kundprovet ger 7 kort och 35 ritningskopplingar automatiskt utan OCR. GS-ansvar och övriga modulers logik är oförändrade. Tidigare TEST 9.5 bevaras. Se SMARTMATCH_READ_TEST_9_6.md.

Kompletterat användarbeslut samma arbetspass, TEST 9.6: skilj Avläsning av ritning och dörrkort från Öppna PDF. Full läsning av koder och produkter är förvald; explicit kodläge finns kvar. Sparad granskad avläsning öppnas direkt via båda knapparna när en färdig projekt-PDF väljs; råa eller ogiltiga filer startar ingen automatisk ny avläsning via Öppna PDF. Färdiga produkter visas direkt och omläsning är ett frivilligt verktyg. PDF-kopia sparar projektdata. Lokala original-PDF:er återställs tillsammans med sitt arbetsutkast före avläsningskontrollen. Se SMARTMATCH_READ_TEST_9_6.md.

2026-10-17, Tillsyno v2.4.374: Felrättning i separata SmartMatch Avläsning TEST 9.7 efter återöppningsfel. Reproducerad korsning av exportcache mellan olika projekt rättas med projektägarskap och ogiltigförklaring vid byte/stängning. Ingen projekt-PDF godkänns utan verifierad granskad avläsning. Samma metadataavkodare används före öppning, i projektläsningen och vid exportkontroll; indirekta PDF-referenser stöds och läsfel skiljs från saknade data. Fördröjda sparningar får inte ändra nästa projekts filhandtag eller sparstatus. 9.6-arkiv samt granskade aktiva utkast kan kopieras till 9.7 utan att källan ändras. Föregående versioner, beta 10, GS-regler, Ritningsverktygets funktioner, Kontrollflöde och auth är oförändrade. Se SMARTMATCH_READ_TEST_9_7.md.

2026-10-17, Tillsyno v2.4.375: Användaren godkände fyra tillägg i separata SmartMatch Avläsning TEST 9.8: Ändra grupp för gemensamt namn/målkort på alla gruppens positioner över hela projektet; Ta bort den här positionen i dörrkortsvyn; direkt exempelmarkering vid Koppla stämplar; projektspecifikt filter för stämpelns bakgrundsfärg och form. Vanlig WC-rumstext sorteras bort när den inte liknar den markerade stämpeln. Originalkortens namn/innehåll bevaras, hela beteckningar jämförs och varje dörr har eget ID, placering och arbetshistorik. Borttagna placeringar får inte återkomma vid återsökning. Avläsning och ändringar följer med i projekt-PDF:en. Tidigare 9.7 bevaras; egen 9.8-lagring med kopiering av tidigare lokala arkiv. GS-regler, ordinarie SmartMatch, DA/SLR-regler, Ritningsverktygets funktioner, Kontrollflöde, auth och separata beta 10 ändras inte. Se SMARTMATCH_READ_TEST_9_8.md för arbetsgång och faktisk verifiering.

2026-10-17, Tillsyno v2.4.376: Användaren beställde större och tätare datorvy i separata SmartMatch Avläsning TEST 9.9 samt möjlighet att fortsätta med klara kort när vissa beteckningar är dubbla eller olästa. Kortgranskningen ligger under förhandsvisningen med filter, sökning och tydliga orsaker. Ett uttryckligt val kan lägga problemkort åt sidan utan att PDF-sidor tas bort eller kortkoppling gissas. Dubbla koder kräver val av vilket kort som ska användas; oklara kort och läsdata sparas separat för senare rättning. Tidigare kopplingar, arbetslistor, grupper, bortval och arbete bevaras vid riktad fortsättning. 9.8-snapshot, standard-SmartMatch, GS-regler, DA/SLR, Ritningsverktygets funktioner, Kontrollflöde, beta 10 och auth ändras inte. Se SMARTMATCH_READ_TEST_9_9.md.

2026-10-17, Tillsyno v2.4.377: Beställd uppdelning inom separata SmartMatch Avläsning TEST 9.10: Förbered ny PDF för avläsning/granskning och Öppna färdigt projekt för att återställa sparade kopplingar, kontrollpunkter och arbete. Återöppning återanvänder samma fils validerade PDF-data och återställer kortregistret ur sparade data utan ny text-/bildavläsning. Senare ändring av förberedelsen är ett uttryckligt val. 9.9 och tidigare snapshots, standard-SmartMatch, beta 10, GS-regler, DA/SLR, Ritningsverktygets funktioner, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_10.md för arbetsgång, verifiering och gränser.

2026-10-17, Tillsyno v2.4.378: Beställd rättning i separata Avläsning TEST 9.11 för PDF-export som inte kan läsa tillbaka stor inbäddad projektinformation. UTF-16-projekttext avkodas linjärt i begränsade block, utan stora funktionsargument eller stackkrävande upprepade regexgrupper. Samma läsare används för öppning och exportkontroll. Sparvyn visar färdiga arbetssteg, procent och tid; verifierad PDF klar att spara skiljs från faktisk filskrivning och läsning tillbaka från disk. 9.10 och tidigare snapshots, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktygets funktioner, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_11.md.

2026-10-17, Tillsyno v2.4.379: Snabbrättning i separata Avläsning TEST 9.12 efter att Spara lokalt såg ut att vara borttaget under en lång PDF-export. Den befintliga lokala säkerhetskopian ligger nu före exportförloppet, visar egen sparstatus och kan användas medan PDF-förberedelsen arbetar eller har stoppats. Original-PDF och komplett arbetsutkast arkiveras fortsatt lokalt; PDF-exportens metadata-, verifierings- och diskskrivningsskydd från 9.11 är oförändrade. 9.11 och tidigare snapshots, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_12.md.

2026-10-17, Tillsyno v2.4.380: Rättning i separata Avläsning TEST 9.13 för lokala projekt som blev osynliga efter en TEST-uppdatering. Förstasidan bygger en skrivskyddad lista från TEST 9.1–9.12 även när den nya lagringen redan innehåller en aktiv fil eller andra projekt. Äldre stora PDF-filer dupliceras inte vid listning; de öppnas från sin befintliga källa med sparade kopplingar, produkter, kontroller och tider och utan ny OCR eller matchning. En tydlig knapp söker äldre lagring igen. 9.12 och tidigare snapshots, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_13.md.

2026-10-17, Tillsyno v2.4.381: Beställd återkoppling i separata Avläsning TEST 9.14 för en ritningsposition som tidigare tagits bort. Sökgranskningen visar totalt antal, redan kopplade, okopplade och tidigare borttagna träffar. Redan kopplade positioner är synliga men kan inte väljas igen; en uttryckligen vald borttagen position får en ny manuell koppling till valt dörrkort och börjar obockad. Den gamla automatiska träffen och bortvalet sparas som dubblettskydd även efter helskanning, PDF-export och återöppning. 9.13 och tidigare snapshots, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_14.md.

2026-10-17, Tillsyno v2.4.382: iPad-anpassning i separata Avläsning TEST 9.15 efter rapporterad omstart av Safari vid stora ritningar, zoom och komplettering av en missad stämpel. Moderna iPad-modeller identifieras även i liggande läge. Översikt, skarp detaljrendering och bildsökning har begränsade pixel- och minnesbudgetar; tillfälliga canvas-, OCR-worker- och PDF-sidresurser frigörs mellan sökstegen. Ett litet sparat stämpelindex återanvänds utan ny PDFLib-tolkning, tidigare dörrkortssidor städas och SLR undviker en långlivad tredje kopia av hela PDF-filen på iPad. Bildsökning på iPad begränsas till den aktuella ritningssidan. **Koppla bara markerad stämpel** skapar en granskad manuell koppling för den valda rutan utan att bildläsa hela ritningen. Efter en avbruten tung öppning stoppas automatisk återöppning; lokala projekt raderas inte, och `?safe=1` öppnar återställningsläget direkt. 9.14 och tidigare snapshots och cachar, standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth bevaras. Se SMARTMATCH_READ_TEST_9_15.md. Automatiska och emulerade kontroller ersätter inte slutlig provning på en fysisk iPad med Safari.

2026-10-17, Tillsyno v2.4.383: Akut iOS-rättning i separata Avläsning TEST 9.16 efter fortsatt WebKit-omstart vid zoom av stora ritningar. Rotorsaken låg inte bara i canvasens renderingsbudget: en CSS-transformerad A1-stage kunde främjas till en DPR 2-GPU-yta på omkring 787 MB, medan en extrem skolsida kunde bli över 33 000 CSS-pixlar bred. Ritningszoom använder därför ingen tillfällig CSS-transform på iOS och iPadens logiska ritningssida begränsas dynamiskt till 8 192 pixlar. Målzoomen samlas under gesten, detaljytan frigörs och översikten uppdateras när gesten avslutas. PDF-bilder får 12 MB arbetsbudget; projekt över 24 MB använder stabilt läge utan automatisk helsidesdetaljläsning efter varje zoom. Täta asynkrona markörritningar får generationsskydd. Dator- och Android-flöden behåller sin förhandsvisning, och TEST 9.15 samt äldre snapshots, lokala arkiv och cachar ligger kvar oförändrade. Standard-SmartMatch, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_16.md. Fysisk iPad med Safari är obligatoriskt slutprov eftersom emulering inte kan återskapa enhetens WebKit-minnestak.

2026-10-17, Tillsyno v2.4.384: Läsbarhetsrättning i separata Avläsning TEST 9.17 för iPadens stabila ritningsläge. Den minnessnåla grundritningen får fortsatt vara mjuk vid hög zoom, men redan länkade SmartMatch-stämplar ritas som ett separat, skarpt etikettlager så att exempelvis GS1 och GS2 kan läsas vid rätt dörr. Etikettlagret följer zoom och panorering utan en ny PDF-bildrendering. TEST 9.16:s transformfria iOS-zoom, 8 192-pixelsgräns, PDF-bildbudget, stabila läge för stora projekt och generationsskydd bevaras. TEST 9.16 och äldre snapshots, lokala arkiv och cachar ligger kvar oförändrade. Standard-SmartMatch, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_17.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov eftersom emulering inte kan återskapa enhetens WebKit-minnestak.

2026-10-17, Tillsyno v2.4.385: Försiktig kvalitetshöjning i separata Avläsning TEST 9.18 efter önskemål om en något tydligare grundritning på iPad. Översiktsytan höjs från 1,35 till 1,50 megapixel, vilket ger omkring fem procent högre linjär skärpa. Skarpa koder för länkade stämplar, transformfri iOS-zoom, 8 192-pixelsgräns, 650 000-pixels detaljyta, 24 MB-gräns för automatisk detaljrendering och 12 MB PDF-bildbudget bevaras. TEST 9.17 och äldre snapshots, lokala arkiv och cachar ligger kvar oförändrade. Standard-SmartMatch, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_18.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-17, Tillsyno v2.4.386: Visuell rättning i separata Avläsning TEST 9.19 efter att den fasta mörka stämpeletiketten täckte ritningen vid utzoomning och kunde lägga sig framför procentmärket. Det extra kodlagret tas bort helt. En genomskinlig klickyta följer i stället stämpelns verkliga PDF-ruta och skalar tillsammans med ritningen, så originalets färg, form och tryckta kod syns utan dubbel text. Procentmärket ligger över klickytan och skalar ned med stämpeln. iPadens översikt höjs försiktigt från 1,50 till 1,65 megapixel för något tydligare ritningslinjer och riktiga PDF-rumsnamn. 3 000-pixels sidgräns, 650 000-pixels detaljyta, DPR 1,25, 8 192 logiska pixlar, 24 MB detaljgräns, 12 MB PDF-bildbudget och transformfri iOS-zoom bevaras. TEST 9.18 och äldre snapshots och lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_19.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-17, Tillsyno v2.4.387: Läsbarhetsrättning i separata Avläsning TEST 9.20 när originalstämpelns kod förblev för mjuk i stora PDF-filers minnessnåla iPad-vy. Varje länkad iPad-position får en kompakt stämpelreplika med gul yta, svart kod och kant samt tunn röd innermarkering. Replikan använder ritningens sparade beteckning, följer originalets ellips-, rektangel- eller rundade form och krymper med ritningen vid utzoomning. Vid inzoomning slutar den växa vid 72 × 36 CSS-pixlar. Texten anpassas till ytan och döljs först under fyra pixlar; procent visas separat när stämpeln har plats. Översikten ligger kvar på 1,65 megapixel och samtliga minnesskydd från TEST 9.19 bevaras. TEST 9.19 och äldre snapshots och lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_20.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-17, Tillsyno v2.4.388: Översiktsrättning i separata Avläsning TEST 9.21 efter önskemål om en tydligare arbetsprocent vid utzoomning. Varje länkad position med sparat arbete över 0 % behåller nu ett läsbart procentmärke även när själva stämpeln krymper: 28 × 18 CSS-pixlar med 8-pixelstext i översikten och högst 30 × 20 med 9-pixelstext i normal- och detaljvy. Märket ligger tre pixlar under stämpelreplikan, mörkt för 1–99 % och grönt vid 100 %, utan att täcka stämpelkoden. 0 % får inget märke. Stämpelns gul-svart-röda utseende, sparade kopplingar och samtliga iPad-minnesgränser bevaras. TEST 9.20 och äldre snapshots och lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_21.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-17, Tillsyno v2.4.389: Komplettering i separata Avläsning TEST 9.22 för dörrkort där enstaka GS-produkter saknas efter första avläsningen. Det öppna dörrkortet har nu **Läs om detta kort**, som återanvänder kortets sparade tabellområde och läser exakt den källsidan utan ny ritningssökning. Efter granskning läggs endast nya kontrollpunkter till; befintliga ritningskopplingar, bockningar, texter, egna punkter och tider behålls. Kontrollistan visar samtidigt ordinarie SmartMatch-reglage för att lägga till, ändra och ta bort punkter samt ändra tid per punkt. TEST 9.21 och äldre snapshots och lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_22.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-17, Tillsyno v2.4.390: Separata Avläsning TEST 9.23 räknar beräknad arbetstid för varje fysisk dörr från dess avlästa och egna kontrollpunkter. Dörrkortsvyn visar totalt, klart, kvar och punkter utan tidsestimat. Kontrollpunkter kan få antal och dörrspecifik tid; **Extra tid** sparar krångel eller annat tillkommande arbete på endast den valda positionen. Tidsöversikten växlar mellan aggregering per produkt och en klickbar lista per dörr, med modeller och mängder synliga även när tidsmall saknas. Samma dörrkort på flera positioner räknas en gång per fysisk dörr. Befintligt schema 6 används, så äldre projekt öppnas utan migrering och får antal 1 när värdet saknas. TEST 9.22 och äldre snapshots och lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_23.md. Fysisk iPad med Safari är fortsatt obligatoriskt slutprov.

2026-10-18, Tillsyno v2.4.391: Avgränsad tabellrättning i separata Avläsning TEST 9.24 efter att exempelvis **31 Dörrstängare DC700** eller magnetprodukter kunde synas i Hela avlästa tabellen men saknas som GS-kontrollpunkter. En kort GS-ruta i Monteras av kunde få sin mittpunkt några bildpunkter ovanför produktraden och behandlades då som en separat rad. Tabelläsaren kopplar nu samman textrutor som överlappar samma visuella rad, samtidigt som verkliga efterföljande rader utan montageansvar, andra sektioner och andra GS-rader hålls separata. Sparade TEST 9.23-projekt med ordpositioner repareras lokalt vid öppning utan OCR eller ritningsmatchning; alla befintliga arbetsrader, kopplingar, bockningar, egna punkter, antal och tider behålls. **Läs om detta kort** kompletterar kort där ordpositionerna saknas. TEST 9.23 och äldre snapshots samt lokala arkiv lämnas oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Se SMARTMATCH_READ_TEST_9_24.md. Fokuserade parser- och migreringstester verifierar DC700 och MK240; berörda kundkort ska även slutkontrolleras före ny projektsparning.

2026-10-18, Tillsyno v2.4.392: Separata Avläsning TEST 9.25 rättar bulk-Avmarkera och lägger positionsborttagning bakom en pilmeny med separat bekräftelse. Egna punkter får avsnitt och kan läggas på aktuell fysisk dörr eller alla positioner som använder samma källdörrkort, med separata bockningar. Projekttiden visar redigerbara materialsorter, antal, tid per styck och total med dörrspecifik tidsprioritet. Beställningar och anmärkningar sparas per fysisk position, visas med egna ritningsmärken och har aktiv lista och historik. En flyttbar färgförklaring kan placeras på ritningen. PDF-stämplar för dörrstängare och dörrautomatik får passiva DS/DA-etiketter från det redan lästa stämpelregistret, utan ny helsidesläsning, OCR eller arbetspositioner. Den lokala projektlistan läser även TEST 9.24 utan att kopiera de stora PDF-filerna, och valfri OCR-granskning använder endast lokalt cachade Tesseract-filer. TEST 9.24 och äldre snapshots lämnas byte-oförändrade. Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Skapande av en faktisk ny dörrkortssida i PDF avgränsas till en senare, separat release på grund av storfilsminne och atomisk export. Se SMARTMATCH_READ_TEST_9_25.md.

2026-10-18, Tillsyno v2.4.393: Separata Avläsning TEST 9.26 kan skapa ett saknat dörrkort från **Koppla dörrkort** för en ritningsbeteckning utan matchande kort. Beteckningen låses till den valda gruppen och formuläret tar kortnamn, beskrivning samt strukturerade rader med avsnitt, benämning, typ/utförande, antal och montör. En verklig sökbar vektor-PDF-sida läggs till i projektets PDF och registreras direkt som källdörrkort; alla fysiska positioner med samma beteckning kopplas till den sidan med egna avbockningar. Alla inmatade rader bevaras på kortet och i den sökbara sidan, men endast rader där **Monteras av = GS** skapar kontrollpunkter. Skapandet verifierar sidmarkören och kopplingen, sparar arbetsutkast och nya PDF-bytes i den lokala cachen och återställer föregående PDF, projektdata och vy om ett efterföljande steg misslyckas. En exporterad projekt-PDF öppnar kort, koppling och arbetsstatus direkt utan OCR eller ny ritningsmatchning. Formuläret har begränsad höjd, rullande innehåll, stora tryckytor och safe-area-anpassning för iPad. TEST 9.25:s lokala projekt visas utan att de stora källfilerna kopieras. TEST 9.25 och äldre snapshots lämnas byte-oförändrade; standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte. Det fokuserade browserprovet täcker fysisk sidbilaga, vektortext, GS/DT-ansvar, lokal cache, PDF-export och direkt återöppning; befintliga regressionsprov körs mot den separata 9.26-snapshoten. Se SMARTMATCH_READ_TEST_9_26.md. Fysisk iPad med Safari är fortsatt rekommenderat slutprov för stora kundfiler.

2026-10-18, Tillsyno v2.4.394, build 36.170: Läsbarhetsrättning i separata Avläsning TEST 9.27 för DS- och DA-stämplar som varit svåra att se på iPadens minnessnåla ritning. Synliga `/Stamp`-annoteringar för dörrstängare och dörrautomatik visas med kompakta gul-röd-svarta märken: minst 24 × 18 och högst 36 × 24 CSS-pixlar med 11–13-pixelstext. Lagret ligger på z-index 6, är helt passivt med `pointer-events: none` och hindrar därför inte val eller arbete på dörrpositionerna. Storleken räknas om och begränsas på nytt efter zoom, sidbyte och ändrad ritningsgeometri. Underlaget kommer enbart från det redan förberedda PDF-stämpelregistret; funktionen läser inte vanlig sidtext, startar inte OCR och skapar inga GS-positioner. Dolda, osynliga och NoView-markerade PDF-annoteringar hoppas över. DS/DA som är inbakade i en bild eller endast finns som vanlig PDF-text måste förberedas eller skannas separat innan de kan visas av detta lager. TEST 9.26 lämnas byte-oförändrad. Fokuserade browserprov verifierar indexkällan, svenska beteckningar, dolda flaggor, noll sidtextläsningar, passiv lagerordning och ombegränsning vid iPad-zoom. Se SMARTMATCH_READ_TEST_9_27.md. Fysisk iPad med Safari är fortsatt rekommenderat visuellt slutprov.

2026-10-18, Tillsyno v2.4.395: Ny avgränsad testfunktion **Digitalisera dörrkort** i Ritningsverktyget. Användaren markerar ett helt representativt dörrkort, skapar och godkänner en mallgrupp och läser uttryckligt valda sidor med samma layout, en sida i taget. Befintlig PDF-text kombineras med lokal svensk och engelsk OCR. Varje källord behåller position, källa och säkerhetsvärde; osäker, motstridig eller oplacerad text måste granskas eller uttryckligen hanteras innan kortet kan godkännas. Delvis avbrutna läsningar måste göras om. Originalkort och redigerbart digitalt kort visas sida vid sida. Beteckning, rubrikfält och tabellrader kan rättas, flyttas, kompletteras eller tas bort utan att källtext försvinner tyst. Projektet autosparas lokalt i IndexedDB utan den stora käll-PDF:ens byteinnehåll; om beständig lagring blockeras visas en permanent varning att JSON måste sparas. Godkända kort kan exporteras som en kompakt sökbar vektor-PDF med strukturerad JSON bifogad; separat JSON-export sparar hela projektet inklusive ej godkända kort och granskningsunderlag. Första testet stöder en mallgrupp per projekt och kopplar ännu inte automatiskt den digitala exporten till SmartMatch. Original-PDF:en ändras aldrig. Se DRAWING_TOOLS_395.md för arbetsgång, schema, skydd, avgränsningar och verifiering. Kontrollflöde, SmartMatch och auth ändras inte funktionellt. Ingen fysisk iPad eller TestFlight-build har verifierats. Kontrollflödet är fortsatt LÅST.

2026-10-18, Tillsyno v2.4.396, build 36.171: Separata Avläsning TEST 9.28 skiljer den lilla avläsningsytan från originalkortets visning. Tabellen ska markeras runt **Övrigt/Produkt**, **Monteras av/Mont av** och relevanta GS-rader; leverantörskolumnen **Lev av** tilldelar aldrig ensam GS-ansvar. Ett ensamt källdörrkort visas som hela original-PDF-sidan när en ritningsposition öppnas, medan äldre sidor med flera kort behåller sitt sparade utsnitt. PDF.js får den verkliga rasterskalan för stora Bluebeam-sidor med bildremsor, vilket förhindrar en vit första vy inom samma minnesbegränsade pixelbudget. En uttrycklig, kortspecifik granskningsbekräftelse kan godkänna rätt avlästa GS-rader och sparar rådata samt revisionsspår. Den kan inte kringgå saknad kod, läsfel, en ändrad avläsningsyta eller ej godkänd ritningsmatchning. Godkännandet och övrig projektdata följer med i projekt-PDF:en, så den färdiga filen öppnas utan ny OCR. TEST 9.27 och äldre snapshots lämnas byte-oförändrade; Kontrollflöde, standard-SmartMatch och Ritningsverktyget ändras inte funktionellt. Se SMARTMATCH_READ_TEST_9_28.md.

2026-10-18, Tillsyno v2.4.397, build 36.172: Separata Avläsning TEST 9.29 visar bara exakta fristående DS/DA-typer från det förberedda PDF-stämpelregistret. `/Subj` är auktoritativt när det finns; `/Contents` används endast om ämnet är tomt. WC dörrstängare, VCDS, DBL-DS, DS1 och Dörrstängare freeswing ger ingen extra symbol. Identiska poster dedupliceras. DS visas orange och DA mörkröd som passiva kvadrater på 14 × 14 CSS-pixlar med fast skärmstorlek och PDF-rektangelns mittpunkt vid all zoom. Ingen OCR, helsidestext, produktläsning eller matchning startas. TEST 9.28 och äldre snapshots lämnas byte-oförändrade; Kontrollflöde, standard-SmartMatch och Ritningsverktyget ändras inte funktionellt. Se SMARTMATCH_READ_TEST_9_29.md.

2026-10-19, Tillsyno v2.4.398, build 36.173: Ritningsverktygets Digitalisera dörrkort TEST accepterar nu standardtabell, Tånga-formatets ansvarsmatris (`Övrigt`, `Lev av`, `Mont av`, `Ansl av`, `Funk ansv.`, `Anm`, `Montering klar`) och enkla tvåkolumnskort med uttrycklig `Dörrkort`-rubrik. Ansvarsfälten bevaras som redigerbara och exporterbara kolumner, en avlägsen tabellinje tas inte med i beteckningen och tomma avsnittsankare kan inte placera rader i fel avsnitt. OCR använder de första 90 procenten; tolkning och autosparning använder slutdelen. Endast ett lyckat sparat resultat når 100 procent. Fel och avbrott behåller verklig procent och visar exakt orsak. Kontrollflöde och SmartMatch-funktionerna är oförändrade. Se DRAWING_TOOLS_398.md.


2026-10-29, v2.4.507 / Avläsning 9.100.3: Användaren begär borttagning av det extra DS/DA-lagret på iPad/iPhone. Aktuell Avläsning laddar inte längre smartmatch-read-equipment-symbols-v9-85.js. Original-PDF, dörrkort, GS-markeringar och sparade data ändras inte. Äldre testsidor behåller sin implementation.

2026-10-29, v2.4.508: Beställt stämpelverktyg i aktuell SmartMatch och Avläsning. Separata PDF-stämplar väljs med tryck/ram, döljs/återställs eller tas bort ur exporterad PDF. Egna v508-filer isolerar ändringen från äldre testsidor. Avläsningsvyn döljer råtabell och har Ta bort hela listan under Verktyg. Se SMARTMATCH_FUNCTION_RULES_LOCK.md för avgränsning och verifiering.

2026-10-29, v2.4.509: Beställd grön KL-standard och gemensamma projektuppgifter i Projektering. Utförare/logga till vänster och beställare till höger, staplade på telefon. Anläggning, order, kontakter och adresser sparas med projektet och exporteras i PDF-katalogen TillsynoProjectInfoV1. Aktuell SmartMatch och Avläsning importerar uppgifterna som grundvärden; sparade egna projektuppgifter har företräde. Projekterat av hålls separat från utförande teknikers signatur. Befintliga produktfält objektnummer, modell/typ och antal bevaras. Kontrollflöde och äldre testsidor ändras inte.

2026-10-29, v2.4.510 / Projektering 2.19.13: Användaren beställer tom objektstencil med objektnummer och maskintyp vid första placeringen; följande tryck använder samma uppgifter och räknas automatiskt. Ny objektgrupp avgränsar delat objektnummer från äldre individuellt numrerade produktstämplar. En placering räknas som en maskin; antal beräknas, lagras inte separat. Projekt-PDF behåller grupp, modell, positioner och projektuppgifter; komplett PDF får en utskrivbar objektlista. Återöppning i Projektering återställer allt. v509:s överföring av projektidentitet till SmartMatch bevaras, men ingen ny SmartMatch-maskinimport eller ändrad GS/SLR-koppling ingår. Äldre versionsfiler och andra arbetsområden ändras inte.

Verifiering v510: tests/object-stencil-v510.cjs och tests/project-details-v510.cjs, samt v509 metadataregression. Faktisk browserkontroll: första trycket öppnar tomt formulär, spara SW300/510-1 ger 1 st, nästa tryck ger 2 st utan ny dialog. Telefonformulär granskat vid 320 px. Fysisk iPhone/iPad, mörkt tema och 200 procent text är inte enhetstestade.
