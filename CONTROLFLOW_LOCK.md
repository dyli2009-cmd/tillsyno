# Kontrollflöde – LÅST

Status: **LÅST**

Låst från och med: **Tillsyno v2.4.215**

Kontrollflöde får inte ändras förrän användaren uttryckligen säger att det ska låsas upp.

Godkänd upplåsning är en tydlig instruktion som exempelvis:
**"Lås upp Kontrollflödet."**

Efter den beställda ändringen ska Kontrollflödet åter betraktas som låst, om användaren inte uttryckligen säger annat.

När låset är aktivt:
- ändra inte Kontrollflödets UI, funktioner, navigation, översikt, protokoll, kundmall eller PDF-logik
- ändra inte delad kod på ett sätt som påverkar Kontrollflöde
- håll Projektflöde och andra moduler separata

## Senaste beställda ändring

2026-10-08, Tillsyno v2.4.252: användaren låste upp Kontrollflöde för att lägga till **Checklista revision lås** under **Dörrautomatik / Lås**, med användarens 11 kontrollpunkter. Revision och egenkontroll dörrautomatik samt deras design behölls oförändrade. Efter denna ändring gäller status **LÅST** igen.

2026-10-08, Tillsyno v2.4.253: användaren beställde ett offlinetest av arbetsappen. Appfiler och PDF-bibliotek görs tillgängliga offline, och ritningen kan återöppnas från lokal lagring. Protokollens punkter och PDF-design ändras inte. Kontrollflöde är låst igen efter denna beställda ändring.

2026-10-08, Tillsyno v2.4.254: användaren beställde menyn vid ögat för att visa/dölja alla markeringar eller markeringar per valt protokoll. Beställningen tillåter denna avgränsade ändring i Kontrollflöde. Protokoll, arbetsdata och PDF-export är oförändrade. Kontrollflöde är låst igen efter denna ändring.

2026-10-08, Tillsyno v2.4.255: användaren beställde att avstå från sparad ritning och själv namnge separat PDF-kopia. Denna avgränsade beställning tillåter ändringen; protokollinnehåll och PDF-layout är kvar. Kontrollflöde är låst igen efter ändringen.

2026-10-08, Tillsyno v2.4.256: användaren beställde att ta bort erbjudandet om sparad ritning och knappen Inte nu. Det vanliga PDF-valet används. Beställningen tillåter denna avgränsade ändring; Kontrollflöde är låst igen efter ändringen.

2026-10-12, Tillsyno v2.4.288: användaren godkände uttryckligen upplåsning enbart för designändringen i protokollväljaren. En mörkblå mappvy visar Dörrautomatik / Lås, Säkerhetsservice och Brand var för sig; ett eller flera befintliga protokoll väljs före ritningen. Inga kontrollpunkter, PDF-funktioner eller ritningsvyer ändrades. **Kontrollflödet är LÅST igen efter denna ändring.**

2026-10-12, Tillsyno v2.4.289: felrättning inom den senast godkända mappdesignen – Hem och Ritningsverktyg i protokollväljaren fick mörkblå bakgrund och ljus text/ikon för läsbarhet. Ingen ändring av protokoll, navigation, ritning eller PDF. **Kontrollflödet förblir LÅST.**

2026-10-12, Tillsyno v2.4.290: på användarens uttryckliga beställning tonades den starka och feta texten ned i alla Kontrollflödets mappar och protokoll, tillbaka-knappen ‹ Mappar gjordes mer kompakt och automatisk PDF-filväljare efter Fortsätt till ritning togs bort. Användaren väljer själv Öppna PDF på ritningsytan. Befintliga checklistor, val av flera protokoll och PDF-inläsning bevarades. **Kontrollflödet är åter LÅST.**

2026-10-13, Tillsyno v2.4.291: användaren godkände en avgränsad rättning av vit skärmblinkning vid navigering mellan Hem, Kontrollflöde och Ritningsverktyg. Endast mörkblå sidbakgrund och diskret sidövergång har ändrats; checklistor, arbetsdata, PDF-inläsning och protokoll är oförändrade. **Kontrollflödet är fortsatt LÅST.**

2026-10-13, Tillsyno v2.4.292: på användarens uttryckliga beställning ersattes **Öppna fel** med **Anmärkning** i Kontrollflödets sammanfattning och **ÖPPNA FEL** med **ANMÄRKNING** i kundmallens Anmärkningsöversikt. Samma avgränsade textändring finns i webb och iOS. Antal, statuslogik, kontrollpunkter och PDF-layout bevarades; fristående Säkerhetsservice behåller sina tidigare rubriker. **Kontrollflödet är åter LÅST efter denna ändring.**

2026-10-13, Tillsyno v2.4.293: användaren beställde snabbare navigering mellan Hem och Kontrollflöde efter rapport om seg blå övergång. Den avgränsade rättningen tar bort övergångens 90 ms klickfördröjning, 150 ms toning och två extra animationsramar från dessa sidor; vanliga länkar navigerar direkt. Mörkblå sidbakgrund och skyddet före avslutad behörighetskontroll behålls. PDF-runtime, protokoll, arbetsdata, licens- och inloggningslogik är oförändrade. Samma ändring finns i webb och iOS. **Kontrollflödet är åter LÅST efter denna beställda rättning.**

2026-10-15, Tillsyno v2.4.294: på användarens uttryckliga beställning har mappväljaren i Kontrollflödet fått en separat länk **CE-märkning v1.2** längst ner under **Dörrautomatik / Lås**. Länken öppnar den fristående CE-arbetsytan direkt, utan att ingå som ett kryss/protokoll. Ikoner och hjälptexter i de tre mapparna och befintliga kontrollalternativ har putsats. Samma checklistor, checkbox-nycklar, ritningsflöde, PDF, kontrollpunkter och autosparning är oförändrade. CE v1.2 delar intern projektdatalagring med TEST 60 (medvetet för datakompatibilitet), har en Hem-knapp och separat snävt cache-scope. **Kontrollflödet är åter LÅST efter denna ändring.**

2026-10-15, Tillsyno v2.4.296: användaren beställde uttryckligen ett **gemensamt visuellt designlager** för hela Tillsyno, inklusive Kontrollflödets mappmeny, med fyra färgteman, val av enhet och harmoniserade ikoner. Detta är en avgränsad UI-ändring i separat CSS/JS. **Inga kontrollpunkter, dataformat, PDF- eller ritningsberäkningar, checklisteflöden eller authregler ändrades.** Klickytor anpassas responsivt; ritningszoom lämnas orörd. Kontrollflödet är åter **LÅST** för framtida beteendeändringar.


2026-10-15, Tillsyno v2.4.309: användaren godkände TEST v16 och beställde uttryckligen att ersätta det befintliga flödet under Dörrautomatik / Lås med den godkända versionen. En separat produktionsmodul innehåller v16:s funktioner och kopplas via ordinarie protokollval. Övriga protokoll utan dessa val använder befintlig runtime. Blandade protokollval hålls i samma arbetsfil. TEST v16, äldre importprofil och dess pil-/matchningsregler är bevarade. Ordinarie projektnycklar, lokal ritningslagring och arbets-PDF-format återanvänds; inloggnings-/licensregler ändras inte. Webb och iOS-kod speglas till v2.4.309. **Kontrollflödet är åter LÅST efter denna beställda införing.**


2026-10-15, Tillsyno v2.4.310: användaren beställde en centrerad och flyttbar kundmall inom Dörrautomatik / Lås, nära full skärmhöjd, med X i stället för Tillbaka. Endast kundmallens visningsfönster och dess pek-/touchförflyttning ändras. PDF-innehåll, import, projektdata och övriga valvyer bevaras. Webb och iOS-kod speglas. **Kontrollflödet är åter LÅST efter denna avgränsade ändring.**


2026-10-15, Tillsyno v2.4.311: användaren beställde att Färger och enhet endast ska synas på startsidan. Utseendelagret behåller läsning/tillämpning av sparade inställningar på arbetsytorna men visar och tillåter öppning av inställningsknappen endast i startsidans homeMode. Ingen ändring i domänfunktion, projektdata, PDF eller auth. Webb och iOS speglas. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.312: användaren beställde uttryckligen CE-export av valda dokument för valda dörrar till ZIP utan undermappar. Endast den fristående webbmodulen CE-märkning ändras funktionellt. Kontrollflödets protokoll, ritningslogik, importer och godkännanden bevaras; gemensam versions-/cachemärkning höjs. Native-källan saknar CE och får endast samma versionsmärkning. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.313: användaren beställde hopfällda sparade projekt, borttagen Fortsätt senaste projekt och direkt Nytt projekt utan extra bekräftelse i CE-märkning. Befintligt arbete arkiveras innan nytt projekt skapas. Endast CE-webbytan ändras funktionellt. Övriga moduler och native-källa får enbart gemensam versions-/cachemärkning. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.314: användaren beställde dörrens befintliga löpnummer först i filnamnen vid CE-export av valda filer till ZIP. Prefix fylls med nollor för korrekt namnsortering och omnumrerar inte urval. PDF-innehåll, sparade data och övriga exporttyper bevaras. Native speglar endast versionsmärkningen eftersom CE-modulen saknas där. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.315: användaren beställde vänsterställda rubriker vid Projektuppgifter och Dörrar och dörrautomatik i CE-arbetsytan. Ändringen avser enbart CE-HTML/CSS, ingen projektdata, PDF eller funktion. Native saknar CE och speglar endast gemensam versionsmärkning. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.316: användaren rapporterade att CE-dörradens text åter hamnade i mitten efter laddning. En fördröjd generisk mappikon skapade tre flexbarn med space-between. Dörraden renderar nu en egen SVG-mappikon direkt; textdelen fyller kvarvarande utrymme och status ligger till höger. Ingen ändring av data, PDF, godkännanden eller kontrollflöde. Native saknar CE och speglar endast versionen. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.317: användaren beställde fler färgteman med mörkare omgivning och ljus text genom hela appen. Tre valbara mörka paletter läggs i det gemensamma UI-lagret; fyra ljusa och nuvarande standardval bevaras. Tidig läsning av temaval uppdateras på aktiva sidor och motsvarande lager speglas till native-arbetsytorna. Ändringen avser endast DOM/CSS/utseende, inte kontrollpunkter, matchning, licens, auth, projektformat eller PDF-beräkningar. Statusknapparnas färger och PDF-pixlar har verifierats. **Kontrollflödet är fortsatt LÅST efter denna avgränsade designbeställning.**

2026-10-15, Tillsyno v2.4.318: användaren beställde större och lugnare datorvy med bevarad telefon, iPad och startsida. Avgränsad CSS för datorarbetsytor, inga ändringar av arbetslogik, PDF eller data. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.318: användaren beställde större och lugnare datorvy med bevarad telefon, iPad och startsida. Avgränsad CSS för datorarbetsytor, inga ändringar av arbetslogik, PDF eller data. **Kontrollflödet är fortsatt LÅST.**

2026-10-15, Tillsyno v2.4.319: användaren beställde uttryckligen gemensamt färgtema genom Kontrollflöde, revision, separata dörrautomatik-/säkerhetssidor, CE och Ritningsverktyg på alla enheter. Endast temaregler ändras; datorns befintliga storleksregler bevaras. Funktion, data, kontrollpunkter och dokumentpixlar ändras inte. **Kontrollflödet är åter LÅST efter denna beställda temarättning.**

2026-10-15, Tillsyno v2.4.320: beställd temarättning efter blå blinkning vid Tillbaka och Kontrollflödets sidbyte. Sparad palett läses först i head; dokumentbakgrund och övergångsgardin följer samma temafärg redan före externa resurser. Navigation, auth och PDF-logik bevaras. **Kontrollflödet är åter LÅST.**

2026-10-15, Tillsyno v2.4.321: användaren rapporterade kvarvarande mörkblå färg efter Spara PDF. Endast sparrutans rubrik, bakgrund, alternativ, ikoner och texter kopplas till vald palett på samtliga enheter. Export och dokumentinnehåll bevaras. **Kontrollflödet är åter LÅST.**

2026-10-15, Tillsyno v2.4.322: Användaren rapporterade mörkblå rubrik och plus/minus-knappar i Kundmall. Rubrik, sidindikator, undertitel, navigerings-/textstorleksknappar och stängknapp följer nu vald palett. Själva dokumentets färger och pixlar lämnas orörda. **Kontrollflödet är åter LÅST efter denna beställda temarättning.**

2026-10-15, Tillsyno v2.4.324: användaren godkände större rubriker, beskrivningar och ikoner endast i datorns områdesval. Kortens geometri, telefon/iPad, färgteman, checklistor och funktioner bevaras. **Kontrollflödet är åter LÅST efter den avgränsade ändringen.**

2026-10-15, Tillsyno v2.4.325: användaren beställde uttryckligen större text, ikoner och kryssrutor i datorns checklistval för samtliga tre områden samtidigt. Endast CSS i mappens checkliststadium; telefon/iPad, paletter, protokollinnehåll, PDF och data bevaras. **Kontrollflödet är åter LÅST efter denna ändring.**

2026-10-15, Tillsyno v2.4.326: användaren beställde att datorns ritningsstart visar områdets namn och valda checklistor, med större rubrik och Välj en ritning/Öppna PDF. Endast DOM-presentation och dator-CSS; telefon/iPad, protokollval, PDF och projektdata bevaras. **Kontrollflödet är åter LÅST.**


2026-10-15, Tillsyno v2.4.327: Beställd rättning av datorns PDF-start för Säkerhetsservice och Brandsäkerhet. Samma DOM-presentation som i revisionen aktiveras även i ordinarie all-in-one.js. Rätt områdesnamn och valda checklistor visas, befintliga större CSS-mått återanvänds. Routing, PDF, projektdata och telefon/iPad bevaras. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.328: Användaren beställde samma korrekta områdesrubrik och valda checklistnamn på dator, iPhone och iPad. Texten följer protokollvalet på alla enheter; de större måtten aktiveras fortfarande bara på dator. Mobilens och iPadens befintliga typografi och knappar bevaras. Ingen ändring av routing, PDF eller projektdata. Kontrollflödet är åter LÅST.


2026-10-15, Tillsyno v2.4.329: Användaren bekräftade samma synliga områdesrubrik och checklistnamn i alla tre områden på dator, iPhone och iPad efter Fortsätt till ritningen. Revisionssidans kompakta CSS dolde checklistnamnen på små enheter. Kontexttext visas nu med normal radbrytning på alla enheter; större mått kvarstår endast på dator. Verifierat i 18 Chromium-flöden genom protokollvalet i två teman och tre enhetsvyer, med synlighetskontroll av underrubriken. Protokollval och befintliga textstorlekar bevaras. Ingen fysisk enhet eller ny TestFlight-build testad. Kontrollflödet är åter LÅST.


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

# 2026-10-29 · v2.4.497 · Beställd vridning i Säkerhetsservice

Användaren beställde även en ren pil i stället för detektorpiktogrammet på ritningen. Samma pil används i arbetsvyn och PDF; transparent 44 px tryckyta bevarar klick, dragning och protokoll.

Användaren beställde en knapp för att vända ritningen i Kontrollflöde/Säkerhetsservice. Den avgränsade ändringen är 90° visningsrotation per sida i Säkerhetsservice under Kontrollflöde. Objektpunkter, etiketter, textpilar och ritverktyg följer rotationen; inmatning räknas tillbaka till originalets koordinater. Visningsläget sparas lokalt per ritning/sida. Käll-PDF och exporterad orientering bevaras. På telefon ligger knappen med snabbverktygen, på dator vid zoom/sidbyte. Revisionsmodulen och Projektflöde ändras inte. Ingen separat native-källa finns i detta repo.

Verifierat i Chromium på dator, surfplatta och telefonbredder 390/320 px: PDF-pixlar mot markör, fyra rotationslägen, dragning, placering, textredigering, ritverktyg, PDF-export, sidbyte och återöppning. Fysisk iPhone/TestFlight har inte provats. Kontrollflödet är åter LÅST efter beställningen.

# 2026-10-29 · v2.4.498 · Samma pil för Säkerhetsservice

På användarens beställning används samma rena pil för Inbrottslarm, Lås & Dörrmiljö och Passer som för Detektorer. Den runda punkten över pilspetsen tas bort i arbetsritningen och PDF. Etiketter, statusfärger, dragning, protokoll och lagrade koordinater bevaras; markeringens osynliga tryckyta är 44 × 44 px. Övriga protokoll behåller sina markeringar. Kontrollflödet är åter LÅST efter denna avgränsade beställning.

# 2026-10-29 · v2.4.499 · Behåll vridningen i sparad PDF

På användarens beställning följer vald rotation per ritningssida med i både Spara PDF och Skapa ny PDF. Vridningen läggs till sidans ursprungliga PDF-orientering; protokollsidor hålls oförändrade. Arbetsfilen bäddar in rotationerna tillsammans med originalritning och befintliga koordinater så att öppning på en annan enhet och upprepad sparning inte återställer eller dubblerar vridningen. Texter, pilar och kundmallens stämpelhandtag anpassas till sidans visningsläge. Kundmallsredigerarens nya koordinatstöd är aktivt när byggaren lämnar en rotation, annars används befintliga koordinater.

Verifierat med faktisk PDF-nedladdning, öppning utan lokal historik, omsparning, flera sidrotationer, PDF med inbyggd 90° rotation, oförändrade arbetsdata, kundmallsjustering och protokollsidor i Chromium på dator/surfplatta/telefon. Kontrollflödet är åter LÅST efter beställningen.

# 2026-10-29 · v2.4.500 · PDF-standarder, filnamn och arbetsverktyg

På användarens beställning är standarden i Säkerhetsservices kundmall och PDF-export 100 % stämpelstorlek och normal pillinje (1×). Manuellt valda värden bevaras. Återställ alla storlekar använder modulens standard, vilket ger 100 % i Säkerhetsservice utan att ändra revisionsmodulens standard. Kundmallsritningen zoomas direkt med vanligt mushjul runt pekaren; Ctrl/⌘ och tvåfingerzoom fungerar också. Protokoll-/rapportvyn behåller vanlig rullning. Kontrollflödet är åter LÅST efter denna avgränsade beställning.

Samma beställning kompletterades med att Spara PDF föreslår den öppnade ritningens filnamn, utan Allt-i-ett-prefix. Filnamnet lagras med projektet och fångas från exportsnapshoten. Stäng ritning ligger intill Öppna annan ritning, sparar lokalt först, frigör dokumenten och tömmer aktuell vy/ångrahistorik utan att radera sparat arbete. Filbyte och stängning spärras under pågående export eller filinläsning.

Arbetsverktygen grupperas med enhetliga SVG-ikoner och 44 px tryckytor. Sidbyte/zoom har egen grupp; på telefon ligger textstorleksknapparna i ritverktygsmenyn. Filåtgärderna ligger tillsammans i rubriken och versionsnumret flyttas från överlappande kontroller till objektraden. Den nya layouten är avgränsad till Säkerhetsservices arbetsyta genom Stäng ritning-kontrollen och en egen stilmall. Testat: faktisk PDF-nedladdning med samma filnamn, 100 %/normal standard och valda alternativ, mushjulszoom, stäng/öppna med bevarat innehåll, rotation och protokoll i dator-, surfplatte- och telefonvyer (390/320 px).

Återöppning av exakt den senast stängda PDF-filen hämtar de lokala ändringar som sparades vid stängningen, även när filens inbäddade arbetsdata är äldre. En annan PDF-version öppnas enligt sitt innehåll. Filinnehållets fingeravtryck skiljer fallen åt. Slutkontrollen omfattar filnamn med blanksteg/åäö, ändringar efter senaste PDF-export, stängning/återöppning, mörkt tema samt manuellt telefon-/surfplatteval.



# 2026-10-29 · v2.4.501 · Gemensam UI-standard i Kontrollflödet

Användaren beställde först gemensamma regler för text, ikoner och knappar, sedan uttryckligen att börja med Kontrollflödet. Den avgränsade upplåsningen gäller presentationen på de två ordinarie arbetsytorna: all-in-one.html och controlflow-revision/all-in-one.html. UI_RULES.md dokumenterar 16 px vanlig text på telefon/surfplatta, 18 px i rymlig datorvy, 24/20 px rubriker, minst 14 px etiketter, 20–24 px ikoner och 44 px tryckytor.

En separat stilmall och textskala används endast på markerade Kontrollflödessidor. Viktiga knappar visar ikon och text. På telefon samlas objektknapparna under Lägg till objekt. Text kan förstoras till 200 % med rullbar layout; UI-förstoringen ändrar inte ritningsmarkörer, PDF-mått eller lagrade protokollvärden. Datormåtten ersätter äldre kompakta regler endast inom denna beställning.

Verifiering och begränsningar dokumenteras i CONTROLFLOW_UI_501.md. PDF-/lagringslogiken och gemensamma stilmallar ändras inte. CE, SmartMatch och äldre testsidor omfattas inte. Ingen separat native-källa finns i detta repo; ingen TestFlight-publicering utförs. Kontrollflödet är åter LÅST efter den avgränsade beställningen.

# 2026-10-29 · v2.4.502 · Minsta rityta på liten telefon

Slutkontrollen av den beställda läsbarhetsstandarden omfattade även emulerad pekskärm med samtliga sju protokolltyper i Säkerhetsservice/Brand valda. På 320×740 kunde långa rubriker lämna bara 96 px rityta. Rotens ritningsarbetsyta garanterar nu minst 180 px i normal textskala; vid platsbrist får sidan rulla och verktyg/navigering ligger efter ritningen. Ändringen är avgränsad till body.securityWorkspace i ritningsläget och ändrar inte revisionsmodulens layout, PDF eller lagring. Den publicerade v2.4.501-standarden och objektmenyn behålls.

Verifierat i Chromium med dator 1440×900 samt emulerad pekskärm 834×1194, 390×844 och 320×740. Samtliga fyra fall godkända: läsbarhet, protokollsvar, textförstoring till 200 %, bevarade objektdata/stämpelmått, PDF-export, rotation, filnamn och stängning/återöppning. Testets minimihöjd är höjd till 180 px för rotens arbetsyta. Inga fysiska iOS-tester utförda. Kontrollflödet är åter LÅST.

# 2026-10-29 · v2.4.503 · Återställ fungerande Lägg till objekt

Användaren rapporterade att Lägg till objekt inte fungerade efter den beställda mobilanpassningen. Den nya details-behållaren hade inte ärvt objektverktygsradens flexordning. Menyn hamnade därför före ritningen och öppnade valen uppåt bakom sidhuvud/andra kontroller. Behållaren ligger nu efter ritningen (order:2), och listans maximala höjd följer den synliga ritningsytans höjd. Långa listor går att rulla. Befintliga knappar, objekttyper, placering, protokoll och sparlogik bevaras.

Verifierat: 23 Chromium-fall och 1939 kontrollpåståenden på Kontrollflödets båda ingångar, 320/390/834/1440 px, teman och manuella enhetsval. Utökade tester kontrollerar faktisk träffyta via elementFromPoint för varje objekttyp vid 100/200 % text, val av typ, stängning av menyn och skapande via ritningens klickhanterare. Befintliga PDF-export-/återöppningskontroller godkända. Separat pekarklick i 320 px-vyn bekräftade att Branddörr kunde väljas och placeras (7 → 8 objekt). Fysisk iPhone/iPad, Safari och TestFlight har inte testats. Ingen native-källa finns i detta repo. Kontrollflödet är åter LÅST efter den avgränsade felrättningen.

# 2026-10-29 · v2.4.504 · Mer plats för ritningen

Användaren beställde att ta bort den gula hjälprutan efter placering (”D5 är tillagd. På telefon: dra …”) och de upprepade protokoll-/mapp-/Allt-i-ett-rubrikerna för att ge ritningen mer plats. På båda ordinarie Kontrollflödesytorna döljs secHint, brand, headerSubtitle och objectTitle när en PDF är öppen i ritningsläget. Objekträknarens rad görs smalare. Filnamn, knappar, status/felmeddelanden och övriga vyer bevaras. Endast det avgränsade CSS-lagret ändras funktionellt; projektdata, protokoll och PDF-logik berörs inte.

Manuellt verifierat i telefonvy 390×844 för Dörrautomatik/Lås: ritytan ökade från cirka 281 till 380 px före placering, och ett nytt objekt kunde väljas och placeras (3 → 4 objekt) utan gul ruta. Ingen fysisk iOS/TestFlight-verifiering. Kontrollflödet är åter LÅST efter beställningen.

Befintlig webbläsarmatris godkänd: 23 fall, 1916 kontrollpåståenden, båda ingångarna i 320/390/834/1440 px, teman och manuella enhetsval. Objektmeny, placering, 200 % text, PDF-export och återöppning ingår.

# 2026-10-29 · v2.4.505 · Dölj versionsmärket på telefon

Användaren beställde att ta bort versionsnumret som hamnade framför ögonknappen på telefon. Kontrollflödets versionsmärke döljs därför vid högst 800 px bredd och vid manuellt enhetsval Telefon. Startsidan behåller appversionen. Ändringen är en avgränsad CSS-regel för de två ordinarie Kontrollflödesytorna. Ögonknapp, projektdata och PDF ändras inte. Kontrollflödet är åter LÅST efter denna beställning.

Verifierat i Chromium: versionsmärket dolt i Säkerhetsservice vid 320 px och i Dörrautomatik/Lås vid 390 px; synligt i datorvy 1440 px. Ögonknappen öppnade Visa på ritningen utan hinder. Fysisk iPhone/iPad och TestFlight har inte provats.
