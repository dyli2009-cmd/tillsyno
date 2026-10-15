# Dörrservice – utvecklingsregler

Det här dokumentet ska läsas innan någon ändring görs i Dörrservice.

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

Aktuell version: **v2.4.354**

Regler:
- Samma appversion gäller Kontrollflöde, Dörrautomatik, Säkerhetsservice, Brand, Projektflöde och Ritningsverktyg.
- Visa inte separata versionsnummer för enskilda moduler.
- Varje användarsynlig uppdatering ska höja Tillsyno-versionen med ett steg.
- Exempel: v2.4.244 → v2.4.245 → v2.4.247.
- Versionsnumret ska visas på Home så att det är enkelt att kontrollera vilken uppdatering som körs.
- Tekniskt buildnummer för TestFlight får finnas separat, men den synliga versionsbeteckningen ska följa Tillsyno-versionen.
- När en ny version görs ska webb och iOS speglas till samma Tillsyno-version.

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
