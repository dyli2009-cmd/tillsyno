# TEST v36.84 – extra läslägen högra dörrkortskolumnen (2026-10-11)
GS (standard) oförändrat; Alla = högra tabellkolumnens samtliga värden inklusive Mötesrum/OK; Eget sökord = innehåller term bara i högra cellen, t.ex. DT. Kompakt UI i Ritning & dörrkort. Projektinställning sparas; GS och alternativ har skilda kontrollnycklar så avprickningar finns kvar. Byter bara kontrollpunktsuttag, inte ID/dörrkort, GS-pilar eller annan modul. Se SMARTMATCH_TEST_V36_84.md.

# TEST v36.83 – dörrautomatik progresskontur (2026-10-11)
Egenkontroll till vänster och SLR till höger som grå/grön yttre kontur, separat procent från nedersta mittpunkten och upp runt respektive halva. Ingen linje över siffror. Korta yttre mittstreck och små etiketter. SLR har manuell arbetsstatus per tio rubriker, inte faktiska färdiga dokumentmallar, sparar i befintligt slrDocuments. Se SMARTMATCH_TEST_V36_83.md. GS/protokoll/ControlFlow/iOS orörda.

# TEST v36.82 – ED100/ED250 familj för GS-pilar (2026-10-11)
24/37 är kompatibla endast vid GS-koppling, men originalmodeller och typkoder lämnas kvar. GS full-ID matchar bara om objekt och sista antal/serie är identiska; annan kod än 24/37 tillåts ej. Exakt ID rankas före kompatibelt ID, och manuell meny visar kompatibilitetsnotis. Kod/test i SMARTMATCH_TEST_V36_82.md. Kontrollflöde/iOS orörda.

# TEST v36.81 – kodbaserad maskintypmatchning, 24 = Dorma ED 100 (2026-10-11)
Dörrautomatikens GS-pil jämför maskintyp via PROJECT_AUTOMATION_MODELS, inte modellnummer i fritext. ED100/ED 100/ID100 = kod 24; kanoniska "024" = 24. Klarar dörrkort med etikett "Dörrautomatik" och värde på raden under. Visar både typkoder och namn om de faktiskt skiljer, mot tidigare generiska fel. GS och andra skydd kvar. Se SMARTMATCH_TEST_V36_81.md. Isolerat TEST; Kontrollflöde/iOS orört.

# TEST v36.80 – GS-manual och återritning, v36.79 korrigerad (2026-10-11)
En ny DA-modul byggd om från fungerande v36.75 sedan v36.79 hade ett funktionsplaceringsfel. Läs SMARTMATCH_TEST_V36_80.md. GS manuell skrivning+ritningssida, lediga fysiska positioner, förslag, Visa GS och återritning av pilar. Känd felmatch blockerar, okända dörrkort kräver bekräftelse, sidkrav för fysisk pil bevarat. Kontrollflöde/iOS orört.

# TEST v36.79 – GS skrivfält, förslag och Visa vald GS (2026-10-11)
Koppla/ändra GS: identifierad DA → föreslagen närmaste verifierade GS med kod/position/sida; manuell GS-nummer + ritningssida; lista riktiga GS-positioner inklusive dublettkoder; Spara kräver exakt vald fysisk GS samt korrekt sida och bekräftat dörrkort; Visa flyttar ritningsvyn utan att ändra kopplingen. Vid kortcache färdig ritas sparade pilar om. Ingen avståndsgräns inom en sida. Kända fel/GS-upptagna blockeras. Se SMARTMATCH_TEST_V36_79.md. Kontrollflöde/iOS orörda.

# TEST v36.78 – automatisk GS-stämpelform (2026-10-11)
Befintlig klickmarkering följer PDF Circle/Square eller säker rasterdetekterad oval/rund/fyrkantig/rektangulär kontur. För enskilda färgpatchar kan klicköverläggets VISUELLA rektangel följa patchens storlek, men GS-koder/dörrkort/positioner ändras inte. Manuell form fortsätter gälla; valet 'Följ PDF-stämpeln automatiskt' återställer. pmSizedMarker CSS-bugg överstyrd. Simulerade formtester (även tunna ovala linjer), syntax och versionskopplingar testade; riktig PDF återstår. Se SMARTMATCH_TEST_V36_78.md. Kontrollflöde/iOS orörda.

# TEST v36.77 – kompakt responsiv historik (2026-10-11)
PDF-historikdialog och listan Senast sparade mer kompakt: dator 460px, iPad 440px, iPhone skärmbredd och vertikala tryckvänliga val, landscape maxhöjd; bra radbrytning filnamn/tid. Ingen ändring i lagringslogik. Se SMARTMATCH_TEST_V36_77.md. Kontrollflöde/iOS orörda.

# TEST v36.76 – lokal historik per exakt original-PDF (2026-10-11)
Välj PDF -> innan skanning jämförs originalbyte med lokala arkiv -> välj sparad version, börja ny eller avbryt. Ny version får egen workspaceId och förstör inte tidigare arkiv/utkast. Senaste projekt och äldre hash-ID bevaras. Bara SmartMatch TEST. Se SMARTMATCH_TEST_V36_76.md.

# TEST v36.75 – kopplingsinformation och renare automatikmeny (2026-10-11)
Koppla / ändra GS visar GS-nr, fysisk position, ritsida + objekt/maskintyp/antal, även för valt men ännu inte sparat alternativ. Sidofältet visar kopplad GS, position, maskin, antal, sida. Automatikens dokumentdialog visar två huvudval: Egenkontroll dörrautomatik och SLR-dokumentmapp. Justera pil bara i positionens ⋯-meny. Hitta alla automatiker kvar hopfällt under Sök fler automatiker och i DA-gruppinställningar. Knappar kompaktare med tvåkolumnslayout. Se SMARTMATCH_TEST_V36_75.md. Isolerat TEST, v36.74 kvar, inga ändringar i Kontrollflöde/iOS.

# TEST v36.74 – Ej kontrollerat alla (2026-10-11)
En andra knapp nollställer alla resultat och punktanmärkningar på just den öppna automatiken (0 %) utan att röra andra DA, projektinformation eller GS/SLR. Den befintliga Godkänn alla är kvar. Se SMARTMATCH_TEST_V36_74.md. DA/GS-modulen v36.73 återanvänds oförändrad.

# TEST v36.73 – egenkontroll skiljs åt, markering och pil (2026-10-11)
Buggrättning: inget checklistdelat tillstånd mellan två DA, kolliderande interna ID korrigeras vid inläsning; tidigare matchning endast samma fysiska position. Godkänn alla gäller vald DA. Gult fokus försvinner vid klick utanför DA på ritningen. ↗ Justera pil åter i menyn och DA-dialogen. Se SMARTMATCH_TEST_V36_73.md. v36.72 bevarad och Kontrollflöde/iOS orörda.

# TEST v36.72 – ny DA→GS-koppling (2026-10-11)
Användaren vill nu att Hitta alla automatiker väljer närmaste GS med dörrautomatik på tilldelat dörrkort, inte närmaste GS över huvud taget. Exakt ID/modell prioriteras, en GS per DA och omvänt. Oläsbart/otydligt = manuell koppling, ingen påhittad pil. SLR ska senare läsa det exakt kopplade dörrkortet. Se SMARTMATCH_TEST_V36_72.md. Bara TEST, ingen native iOS.

# TEST v36.71 – senaste beslut och implementation (2026-10-11)

SmartMatch TEST har nu tre synliga sparval (Spara lokalt / Spara PDF / Skicka mejl), överflödigt Spara fil dolt, snabbare återanvändning av befintlig stor PDF-blob vid lokala sparningar, enstegsexport med fortsatt obligatorisk PDF-kontroll och cache som ogiltigförklaras vid ändringar. Den separata designmallen `smartmatch-protocol-templates.js` / `SMARTMATCH_MALL_EGENKONTROLL.md` ger EN rubrik ”EGENKONTROLL” i kundprotokoll och sparad layout. × Stäng ritning ligger bredvid Spara och fortsätter lokalt arkivera.

Online kontroll av ny version visar uppdateringsknapp enbart vid nytt bygge. Med aktiv PDF erbjuds säker uppdatering **efter att ritningen stängts**, i stället för att avbryta och skanna om ritningen. Äkta byte av körande moduler utan omladdning ingår inte. Första stora PDF-genereringen och första lokala lagringen kan ännu ta tid; inga tester på fysisk enhet. Se [detaljer](SMARTMATCH_TEST_V36_71.md). Ordinarie app och iOS/TestFlight är orörda.

# TEST v36.70 – kompakt revisionschecklista, X-sparning och separat PDF (2026-10-11)

Beställt för dator/iPad/iPhone: synlig allmän anmärkning längst ned, kompakt scroll; X sparar också utan att kräva Klart; synlig knapp för PDF av endast aktuell ifylld revision; lika breda resultatkolumner; EGENKONTROLL i stället för SERVICE, inget dokumentnr; Checklista revision dörrautomatik under EGENKONTROLL; endast Anläggning och ID-märkning i fetstil bland uppgiftsfält, anläggningsnr/datum/AO/kund/företag vanliga. Anläggningsnamn visas nu som eget fält i formuläret (tidigare dolt men redan befintligt metadatafält).

Dialogen använder flexhöjd med min-height:0 och separat scrollbar; rubrik/actions får brytas utan att nederdelen klipps av fast höjdantagande. Kompakt textarea och safe-area-padding. X/Escape inväntar flush av aktuell arbetskopia, fångar fortfarande fokuserade identitets/anmärkningsfält och behåller dialogen vid lagringsfel. Klart använder också central stängning. Befintlig enskild PDF-export görs synlig som Spara protokoll · PDF, utan ritningar/hela projektet. PDF-resultatkolumner 23/23 mm (tidigare21/25), formulärknappar lika breda. Gemensam generator gäller kundmall, separat/bulk-PDF i isolerad TEST.

Piljustering pausad enligt användaren: Justera pil-val borttaget ur menyn, underliggande historik/tips bevarade. Regelhistorik kvar: v36.25 bevara giltiga och granska osäkra länkar, v36.45 ingen närmaste-GS vid manuell placering, v36.68 DA→exakt GS med passande tilldelat dörrkort/modell/ID, inga dubbla/upptagna kopplingar och inget närhetsval vid tvetydighet. Ingen ny pilgeometri/matchningsändring.

Verifierat med exakt jsPDF: rätt rubriker, inga Dokumentnr/SERVICE, fetstil bara anläggning/ID i metadata, vanligt datum/anläggningsnr/AO/kund/företag, båda resultatkolumner23mm och ifyllda anmärkningar i PDF; 1.5/1.6/1.12 fortsatt hela rader. X-test: fångar fokuserade fält/checks, väntar på flush, dubbelstängning stoppas, fel behåller data/dialog. Matchnings/pilregression passerar; syntax, unika HTML-ID, identisk fast entry, synlig enskild export och shrinkbar scroll kontrollerade. Ingen fysisk iPhone/iPad/dator UI-test tillgänglig; lokal sparning testad med kontrollerade mocks. Kontrollflöde/native iOS/TestFlight orörda. Tre plattformar avser samma responsiva TEST-webb, enligt användarens tidigare native-iOS-paus. Löpande publicering godkänd. Nästa TEST v36.71.

# TEST v36.69 – former, appdialoger och separat lokal sparning (2026-10-11)

Positionsmenyn har Form på markeringen: rund/oval, rektangel, rundade hörn. Circle/Square-annoteringar får motsvarande form automatiskt; övriga stämplar behöver manuellt val (ingen gissning av tillplattad grafik). Endast klickmarkeringen ändras, ingen PDF-text/kopplingslogik. Form sparas i positionEdits och manuella positioner för PDF/lokal återöppning.

Alla native confirm/prompt i TEST-arbetsytan ersatta med appdialog; DA/protokollets alert-info ersatt också. Sparrutan visas utan automatisk PDF-generering. Spara lokalt lagrar original-PDF + fullständig arbetskopia i befintligt IndexedDB-arkiv, med valt namn och bibehållen aktiv session; Stäng ritningen använder fortsatt samma arkiv. Lokal sparning markerar inte PDF-filen som exporterad. Spara PDF bygger/verifierar därefter, Spara fil/dela blir tillgängligt efter verifiering (ny användargest för iOS delning). Namnfält och knappar förbättrade.

Verifierat JS-syntax, appdialogers spara/validera/avbryt och touch-flytt, DA→GS/matchningsregression, lokal arkivering med bevarad aktiv session och senare stängning, full snapshot/flush före filarkiv, originalbytes + namn/sida, ingen PDF-generering vid öppning, unika HTML-ID och identisk fast TEST-entry. IndexedDB-transaktion testad med kontrollerat DB-mock, fysisk Safari/Chrome och användarens PDF inte tillgängliga; inga påståenden om fysisk återöppningstest. Lokalt arbete är bundet till samma enhet/webbläsare och kan försvinna vid rensning av webbplatsdata. Ingen Kontrollflöde/iOS/TestFlight-ändring. Löpande publicering godkänd. Nästa TEST v36.70.

# TEST v36.68 – DA→GS, dörrkort före avstånd och inga dubbla kopplingar (2026-10-11)

Användaren förtydligar pilriktning: dörrautomatikens placering ska peka mot rätt GS-position med matchande dörrkort, inte närmaste GS. GS4 får inte kopplas dubbelt/fel. Historik läst: v36.25 bevarar giltiga länkar och kräver granskning av osäkra; v36.45 tar bort närmaste-GS i manuell placering. Kvarvarande bulk-skanner använde fortfarande avståndspoäng och familjskanner `nearestGS`.

v36.68 tar bort närmaste-GS-funktionen/familjgissningen. Bulk-auto-koppling kräver ett entydigt dörrkort med dörrautomatik och matchande maskintyp eller exakt automatik-ID i relevanta kortfält. Exakt ID prioriteras; flera passande kort väljs aldrig med avstånd. Dörrkortet som faktiskt är kopplat i projektets mapping läses först/ensamt; cache uppdateras vid ändrat kortval. Upptagna GS-positioner får ingen andra auto/manuell koppling. Konfliktpilar döljs och kopplingar flaggas, medan sparade uppgifter bevaras för rättning. Äldre obekräftade länkar granskas även för entydighet; korrekt entydig eller uttryckligen manuellt bekräftad länk bevaras. `gsLinkConfirmed` sparas i PDF-data. Osäkert läsbart kort kräver manuell kontroll; saknat kort, explicit ingen automatik, fel maskintyp/ID eller upptagen GS stoppas. Ingen data raderas för att dölja konflikter.

Pilen återställd enligt senaste förtydligandet till DA→GS. `arrowTip` används åter för GS-kanten; `daArrowTip` från v36.65 bevaras i metadata men används inte för fel mål. All placerings-/zoom-/kundmallsfunktion från v36.67 kvar.

Verifierat med kontrollerade testfall: längre bort korrekt kort slår närmare GS utan automatik, fel modell avvisas, samma modell på flera kort ger manuell granskning, exakt ID ger rätt träff, oläsbart kort ger ingen auto-länk, upptagen position blockeras, befintliga dubbla pilar döljs, gammal tvetydig auto-länk granskas, manuell bekräftelse bevaras, DA→GS-geometri. Separat test av tilldelat kort före indexträff, cacheinvalidering och ID-läsning; JS-syntax passerar. Användarens verkliga PDF inte tillgänglig för innehållstest, inga garanterade automatiska matchningar när korten saknar entydigt ID/modellunderlag. Publicering löpande godkänd. Kontrollflöde/iOS/TestFlight orörda. Nästa TEST v36.69.

# TEST v36.67 – hela textrader i kundmall 1.5, 1.6 och 1.12 (2026-10-11)

Användaren vill att fullständig benämning för 1.5, 1.6 och 1.12 ligger på en rad i kundmallens ruta, inklusive hastighet/låshus utan oönskad nedflyttning. PDF-tabellen beräknade radbrytning innan typsnitt och storlek valdes, alltså med föregående cells font. Rätt font sätts nu först. Dessa tre punkter hålls på en rad med full text och mätt anpassning till tillgänglig bredd om det skulle behövas. Övriga rader behåller vanlig radbrytning. Textinnehåll och rutornas storlek är oförändrade.

Verifierat med exakt appens jsPDF: alla tre fullständiga etiketter ryms på en rad både vid 6.8 och 7.4 punkters ordinarie textstorlek (max 94.32 mm mot 97 mm tillgängligt); inga borttagna ord, samma vertikala centrering. Teststart med avsiktligt annan font bekräftar oberoende av föregående cell. JS-syntax passerar. Kundmallens förhandsvisning och export använder samma PDF-generering. Zoom/DA-arbetsflöde orört. Fasta TEST-adressen och alla versionerade resurser uppdaterade. Löpande publicering godkänd. Kontrollflöde och iOS/TestFlight orörda. Nästa TEST v36.68.

# TEST v36.66 – snabbare skärpning på iPad (2026-10-11)

Användaren ber om snabbare iPad-skärpning. Enda funktionella ändringen från v36.65: detaljrenderingens schemaläggningspaus på mobil/tablet är nu 120 ms, tidigare 1200 ms på iPad. Telefonen behåller 120 ms och desktop 300 ms. Skärpa, pixelgränser, serialisering, cache och DA-funktioner är oförändrade.

Kontrollerat JS-syntax och jämförelse mot v36.65: endast väntetiden ändrad utöver versionsmärkning. 120 ms avser startpaus, inte total PDF-renderingstid. Ingen fysisk iPad-mätning. Alla TEST-resurser versionsmärkta och fasta adressen uppdaterad. Löpande publicering godkänd; Kontrollflöde/iOS/TestFlight orörda. Nästa TEST v36.67.

# TEST v36.65 – DA-dialoger, projektuppgifter och kopplingar (2026-10-11)

Beställt: flytta Koppla dörrautomatik även på iPhone/iPad, kompakta/centrerade datumfält, kund före utförande företag, signatur hos utförande företag med logga; positionpanelen ska täcka ritningens markeringar; egna professionella ändra/ta-bort-dialoger; redan sparad koppling ska visas och pilen ska peka mot dörrautomatiken. Befintligt placeringskors fungerar och är oförändrat. Löpande TEST-publicering är godkänd.

v36.65 har egen DA-modulkopia (`smartmatch-da-v36-65-module.js`) och nya versionerade resurser. Draghandtag på Koppla DA och DA-val/koppling accepterar touch/mus, begränsas till skärmen. Positionpanelen är ogenomskinlig ovanför ritningens isolerade lager. Kundsektion först i formulär och kundprotokoll; signaturfält flyttat till utförande sektion tillsammans med logga. Fälten kompaktare, datumvärden centrerade. Märkningsändring, borttagning, kopplingsbekräftelse och fri modell använder appens HTML-dialog med validering/Avbryt i stället för browser prompt/confirm.

Koppling löses genom aktuellt ID, sparad beteckning+rektangel eller entydig beteckning på samma sida. Äldre scan/ocr-ID:n kan läsas för GS-beteckning och koordinater. Otydliga dubletter gissas aldrig; oåterställd koppling visas som kontrollbehov i stället för tomt 'ingen koppling'. Vid sparning bevaras ID/kod/rect samt explicit frånkoppling. Visningspilen går nu GS→DA; pilspets redigeras på DA-kanten och sparas i separat `daArrowTip`, så tidigare GS-tip inte feltolkas.

Verifierat: JS-syntax; länkresolver (omindexering, äldre ID, dubbla beteckningar, koordinatmatchning, frånkoppling); pilkoordinater GS→DA och separat spets; HTML-dialog validering/spara/avbryt; touchdrag inom skärm; HTML-ID:n unika, signatur i utförande sektion, kund före utförande, fast TEST-kopia identisk. Befintliga zoomlivscykel- och verkliga roterade PDF-renderingstester passerar. Zoomlogik från fungerande v36.64 behålls. Ingen fysisk Safari/iPad-visuell kontroll tillgänglig; kompakt layout och datumrendering behöver användartest. Kontrollflöde och iOS/TestFlight orörda. Nästa TEST v36.66.

# TEST v36.64 – snabb telefonzoom och hela skarpa utsnittet (2026-10-11)

Användaren vill ha snabb, smidig och skarp zoom utan 2–3 sekunders väntan. v36.63:s separata stämpelutsnitt tas bort. Hela synliga PDF-utsnittet skärps igen på telefon, med samma enskilda 1-miljon-pixelbildyta som tidigare. Telefonens avsiktliga väntetid kortas från 1200 till 120 ms. Befintlig färdig detaljbild behålls vid zoom/pan på samma sida och följer ritningens koordinater. Telefonens lättare 900000-pixelbakgrund kvarstår.

Aktuell PDF-sidas resurser återanvänds i stället för cleanup/ombyggnad efter varje zoom. Föregående sidans cache frigörs i den serialiserade renderingskön vid sidbyte; dokumentet förstörs vid stängning. Ingen gest avbryter eller resizar aktiv mobil render. Mask-allokeringsfixen från v36.62 kvarstår i TEST-isolerat bibliotek. iPad behåller 1200-ms-planeringen, desktop 300 ms. Nästa TEST v36.65.

Verifierat: JS-syntax; mockad renderlivscykel visar färdig crop kvar under navigation, cacheåteranvändning och frigörande av stale resultat; actual roterad PDF-vy pixelidentisk med original och aktuell sidas cleanup körs inte vid upprepad zoom. Ingen fysisk iPhone-prestandamätning. 120 ms är schemaläggningspaus, inte garanterad total tid; PDF-renderingtiden tillkommer. Chrome på iPhone är inte en garanterad lösning på minneskrascher.

Publicering är löpande godkänd. Kontrollflöde och iOS/TestFlight orörda.

# TEST v36.63 – telefon prioriterar stämplar (2026-10-11)

Användaren förtydligar: samma PDF på iPhone/iPad; ritningens bakgrund och linjer får vara mindre skarpa på telefon, men faktiska stämplar och projekterade kopplingar ska vara tydliga. Löpande publicering fortsatt godkänd.

Ny DRAWING_IS_PHONE skiljer telefon från iPad. På telefon minskas bakgrundens budget från 1.8 miljoner till 900000 pixlar och full synlig-vy-detaljrendering stängs av. Original-PDF skärps i små utsnitt kring identifierade GS/projektpositioner och relevanta native PDF-annoteringar (inklusive Stamp). Inga påhittade etiketter. Upp till 16 synliga utsnitt med gemensam 350000-pixelbudget; upp till 90000 pixlar per utsnitt. Utsnitt väljs efter närhet till vyns mitt, cache återanvänds. Skärpning efter 1.2 sekunders vila och vid zoom >=100%. En aktiv rendering avbryts/resizas aldrig av gest; gammal bild släpps efter avslut. Cache töms vid projektstängning. iPad/desktop behåller full detaljvisning från v36.62. Isolerat mask-allokeringsskydd från v36.62 behålls. Nästa TEST v36.64.

Verifierat: JS-syntax, faktisk roterad original-PDF-stämpel (former och text bevaras, crop-jämförelse med mindre rasteriseringsavvikelse vid subpixelklippning), mockad aktiv gest/stale rendering/cache/disposal. Fysisk iPhone ej testad; inget löfte att Safari-kraschen är slutligt löst. Skärpningen täcker identifierade regioner/native stamp-annoteringar; oidentifierade symboler som är platta PDF-grafikobjekt kan fortfarande ha bakgrundens upplösning. Kontrollflöde och iOS/TestFlight orörda.

# TEST v36.62 – återskapad överstor bildmask vid zoom (2026-10-11)

v36.61 löste inte användarens iPhone-krasch. Granskningen fann att PDF.js 3.11.174 `_createMaskCanvas` dimensionerar `fillCanvas` efter hela den zoomade masken och inte efter destinationscanvas. Ett kontrollerat test med exakt appens PDF.js och worker försöker skapa 14000 × 21000 pixlar (294 miljoner, cirka 1.18 GB RGBA) trots att utsnittet bara är 780 × 1200. Allokeringen fångas och blockeras av testets canvasFactory före minnesreservation.

TEST v36.62 använder en isolerad kopia `smartmatch-pdf-v36-62.js`, med maskens tillfälliga färgyta klippt till destinationsbilden och motsvarande cache-offset. `vendor/pdf.min.js` och ordinarie app är oförändrade. Worker är fortfarande samma befintliga vendor-worker. Ingen skärpesänkning eller extra etiketter. Alla versionerade TEST-resurser och fasta adressen uppdaterade. Nästa TEST är v36.63.

Verifierat: allokering i samma test reduceras till 780 × 1200; pixlar mot originalbiblioteket är identiska i sex scenarier med zoom, panorering, rotation, negativa offset och mask utanför vyn. Syntaxkontroller passerar. Detta är ett bekräftat allokeringsfel, men det är ännu inte bekräftat att användarens PDF innehåller den utlösande masken. Fysisk iPhone-test kvarstår; modell och jämförelse med liten PDF efterfrågades. iPad v36.60 stående använder redan samma mobila kodgren; högre minnesmarginal är en möjlig förklaring, inte uppmätt.

Löpande TEST-publicering är redan godkänd av användaren. Kontrollflöde och iOS/TestFlight förblir låsta.

# TEST v36.61 – mobil PDF-resurshantering (2026-10-11)

Användaren bekräftar att TEST v36.60 fungerar på iPad i stående läge, men att telefonen fortfarande kraschar vid upprepad zoom. Båda använder redan samma mobila renderingsgren; inget separat iPad-läge att kopiera.

v36.61 behåller v36.60:s skarpa original-PDF och frigör PDF.js analysresurser innan ritningen visas. Mobila färgskanningar och avslutade detaljrenderingar frigör också sidans cache efter att renderingen avslutats. Ingen sänkning av visningsupplösningen. Nästa TEST är v36.62.

Verifierat: JS-syntax; aktiv render avslutas innan cleanup, ingen mobil extra canvas, återanvändning av färdig vy; faktisk PDF-rendering av roterad sida är pixelidentisk med originalet även efter cleanup och omrendering. Safari på fysisk iPhone har inte kunnat testas; orsaken till kraschen är fortfarande en hypotes. Publicering av SmartMatch TEST är redan löpande godkänd av användaren. Kontrollflöde och iOS/TestFlight är fortsatt orörda.

# SMARTMATCH – FORTSÄTT HÄR NÄSTA GÅNG

**Senast uppdaterad:** 2026-10-10  
**Status:** Avstämning och överlämning; **ingen ny funktionskod** i denna commit.  
**Repo:** `dyli2009-cmd/tillsyno`  
**Senaste TEST-kodversion:** **SmartMatch TEST v36.60** (normal helhetsvy, hel synlig PDF-yta skärps efter 1,2 s stillhet med en mobilcanvas). Nästa funktionsversion är **TEST v36.61**.  
**Fast TEST-adress:** https://dyli2009-cmd.github.io/tillsyno/project-workspace-smartmatch-test.html  
**Viktigt:** Detta är bara Projektflöde/SmartMatch TEST; INGA ändringar i Kontrollflöde, ordinarie Dörrservice eller iOS/TestFlight utan uttryckligt nytt beslut.

## Löpande publiceringsgodkännande från användaren 2026-10-11

Användaren: ”Ja, men du kan publicera alltid. Behöver inte fråga. Så vi här vi håller på att ändra hela tiden, så du kan publicera bara.” Detta ger löpande godkännande att publicera de SmartMatch TEST-ändringar vi arbetar med i denna utveckling, utan nytt godkännande per testversion. Gäller inte iOS/TestFlight, ordinarie app eller låst Kontrollflöde.

## Uppdatering 2026-10-11: SmartMatch TEST v36.60

Användaren vill ha normalt skarpt originalutseende på hela vyn, inte stämpelpatchar. Separata utsnitt borttagna; hela synliga PDF-ytan skärps efter 1,2 s stillhet på mobil. En direkt begränsad canvas används utan extra kopia; startad rendering avslutas utan cancel/restart-churn, inaktuella resultat visas inte och gemensam kö behålls. CSS zoom under mobilpinch och skydd mot inaktuella touchend-callbacks. Verklig Node-PDF-rastertest av funktionen gav pixelidentiskt originalområde på roterad sida, 936k pixlar. Safari/CSS zoom med riktig telefon ännu ej testat. Ingen automatisk page reload i ritningskoden; Safari-processkrasch kan inte spärras med JS. Se [SMARTMATCH_TEST_V36_60.md](SMARTMATCH_TEST_V36_60.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.59

Användaren behöver själva originalstämplarnas former/symboler, inte extra text. SVG-text/ID-plattor borttagna. Mobilen renderar små utsnitt direkt från PDF runt identifierade stämpel-/objektområden efter 900 ms stillhet, en i taget, med pixelbegränsad cache. Kopplingspilar/ramar kvar. Riktig PDF-rastertest: roterad syntetisk färgstämples utsnitt pixelidentiskt med källrenderingen. Safari med användarens PDF ej verifierat. Se [SMARTMATCH_TEST_V36_59.md](SMARTMATCH_TEST_V36_59.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.58

Förtydligat behov: stämplars beteckningar ska också vara skarpa. Mobilen visar identifierade GS-/projektstämplar och automatik-ID:n som SVG-etiketter vid zoom från 100 procent. Exakta kända etiketter och sparade rektanglar används, med vit läsplatta inom rektangeln. Kopplingspilar/ramar kvar som HTML/SVG. Ingen ny rasterrendering. Okända skannade symboler rekonstrueras inte. Mocktester/syntax godkända; fysisk läsbarhet och Safari-stabilitet återstår. Se [SMARTMATCH_TEST_V36_58.md](SMARTMATCH_TEST_V36_58.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.57

Mobilens fasta bild kompletteras med skarp SVG-visning av riktig PDF-text, utan ny PDF-rasterrendering vid zoom. Text cachelagras och visas inom synlig yta med begränsat antal etiketter. Skannad bildtext blir inte skarpare. Datorns Positioner öppnas som en fristående flyttbar ruta; även Koppla dörrautomatik kan dras i rubriken. Mocktester/syntax godkända; verklig Safari-läsbarhet/stabilitet och musdrag återstår. Se [SMARTMATCH_TEST_V36_57.md](SMARTMATCH_TEST_V36_57.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.56

Filnamn-fält i sparrutan för Projekt-PDF och Protokoll, med befintligt namn som standard. Valfritt eget namn följer med filen vid sparning/delning; .pdf normaliseras automatiskt, svenska tecken och mellanslag kvar. Namnändring kräver ingen ny PDF-rendering. Syntax/namnkontroller godkända. Fysisk telefon/Dropbox-test återstår. Se [SMARTMATCH_TEST_V36_56.md](SMARTMATCH_TEST_V36_56.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.55

Användaren bekräftar Safari-krasch även i v36.54 efter raderad historik. Mobil zoom återanvänder nu samma begränsade PDF-raster per sida; automatisk detaljrendering avstängd på mobil, permanent canvas-GPU-hint borttagen. Datorns skärpning kvar. Hög mobilzoom kan vara suddigare: verifiera först stabilitet, sedan skärpa. Mocktest: åtta mobilzoomar ger en enda PDF-rendering och ingen detaljrendering. Fysisk telefonverifiering återstår. Se [SMARTMATCH_TEST_V36_55.md](SMARTMATCH_TEST_V36_55.md).

## Uppdatering 2026-10-11: SmartMatch TEST v36.54

Snabb mobilzoom/panorering: helbild och detaljbild renderas i samma kö, avbrutna canvasytor frigörs i finally, lägre mobilpixelbudget och 450 ms stillhet före skärpning. Safari-minnestryck är misstänkt men fysisk iPhone-test återstår. Extern PDF öppnas direkt; lokal återställning erbjuds via kort rad Återställ / Behåll PDF. Samma aktiva session återupptas utan popup. Automatisk sparning är fortsatt lokal arbetskopia; extern Projekt-PDF sparas uttryckligen. Mocktester för avbrott/serialisering/återställning och syntax godkända. Se [SMARTMATCH_TEST_V36_54.md](SMARTMATCH_TEST_V36_54.md). Endast TEST; iOS/TestFlight och Kontrollflöde orörda.

## Uppdatering 2026-10-11: SmartMatch TEST v36.53

På startsidan finns nu **Radera** per lokalt sparat projekt och **Radera alla** för hela lokala projekthistoriken. Säkerhetsfråga innan radering; tar bara bort SmartMatchs lokala arkiv och tillhörande utkast i IndexedDB, aldrig PDF-filen i Filer/Dropbox. Efter radering uppdateras listan direkt. Vanliga **Stäng ritning** fortsätter att lagra en lokal säkerhetskopia automatiskt. Detta gör det möjligt att testa vad som verkligen finns i en sparad **Projekt-PDF** separat från telefonens minne. Ny `smartmatch-session-v36-53.js` används enbart i TEST. **Dropbox är inte realtidssamredigering av en PDF**: två användare som sparar samma fil kan skriva över varandras ändringar; versionskontroll/konflikthantering behövs för säkert gemensamt arbete. [SMARTMATCH_TEST_V36_53.md](SMARTMATCH_TEST_V36_53.md) beskriver tre rekommenderade tester och simulerade IndexedDB-kontroller. Fysisk Safari/Dropbox-test återstår. Ordinarie app och TestFlight orörda.

## Uppdatering 2026-10-11: SmartMatch TEST v36.52

**Akut iPhone-fel efter Stäng ritning:** Försök att öppna PDF B gav `null is not an object (evaluating "$('pmCancel').hidden=true")`. Rotorsaken: `renderGroups()` flyttar `#pwPositionEditor` in i `#pwGroups`; `smartResetWorkspace()` rensade sedan `#pwGroups` och tog därmed av misstag bort `pmCancel` och hela redigeraren ur DOM. Fix: flytta tillbaka exakt samma editor-nod till `#pwSide` **innan** rensning, stäng/redigera tillfälliga fält, skydda `pmCancel()` med DOM-null-kontroll. Testat DOM-reset **två gånger i följd** med alla sju knappar/fält bevarade. [SMARTMATCH_TEST_V36_52.md](SMARTMATCH_TEST_V36_52.md). Den fasta TEST-länken uppdaterad, tidigare v36.51 kvar, ordinarie app och iOS/TestFlight orörda. Verklig iPhone-test återstår.

## Uppdatering 2026-10-11: SmartMatch TEST v36.51

Telefonens synliga ikoner, rubriker, filrad, ritningsverktyg och nedersta sid-/zoomknappar är mindre för att frigöra ritningsyta. **✓ Avsluta** har bytts till **Stäng ritning**. Nu behövs normalt bara **ett tryck** för att tyst arkivera en lokal arbetskopia, stänga ritningen och återvända till **startsidan där man öppnar en ny PDF**. Ingen teknisk ”Avsluta projekt”-dialog vid lyckat förlopp. Vid misslyckad lokal arkivering stannar PDF öppen och en kort felruta erbjuder **Fortsätt, Spara PDF, Stäng ändå**. Efter lyckat avslut återställs projektväxlingsspärren innan listan med lokala projekt uppdateras. *Lokal arkivering är inte samma sak som att Filer/Dropbox-PDF uppdateras.* Se [SMARTMATCH_TEST_V36_51.md](SMARTMATCH_TEST_V36_51.md). Simulerade success-/feltester och statisk kodvalidering godkända; fysisk mobiltest återstår. Kontrollflöde, ordinarie app och iOS/TestFlight är orörda.

## Uppdatering 2026-10-11: SmartMatch TEST v36.50

Beslutade montagetider: magnet 30 min, armbågskontakt 30 min, dörrautomatik 8 timmar, dörrstängare 30 min, låshus 20 min, trycke 10 min, slutbleck 10 min, cylinder 20 min och WC-behör 10 min. Ny standardkategori 179 utrymningsbehör hittas i relevanta kontrollpunkter men får **ingen uppskattad tid** förrän den anges. Tidsöversikten visar nu bara **förekommande kategorier** i projektets identifierade kontrollpunkter. Egna per-punktstider har företräde; ändrade standardtider lagras för nästa nytt projekt på samma enhet, och projektets tidsinställning följer med när projekt-PDF sparas. Befintliga PDF-filer med avsiktligt sparade tidinställningar prioriterar dessa. Kort dokumentation och syntetiska testresultat i [SMARTMATCH_TEST_V36_50.md](SMARTMATCH_TEST_V36_50.md). Fysisk iPhone/iPad-test återstår. Ordinarie app/Kontrollflöde/TestFlight är orörda.

## Uppdatering 2026-10-10: SmartMatch TEST v36.49

Föregående mobilprotokoll v36.48 kunde synas **hela tiden** eftersom `display:flex!important` gavs åt en stängd HTML-dialog. Det är rättat: `pwProtocol` döljs tvingande utan `[open]`. Den delade jämförelsen har nu en separat `pwCardCompareMode` som endast sätts av `openProtocol` när faktiskt dörrkort är kopplat till GS/positionen och tas bort vid stängning. Samtidigt har mobilens rubriker, zoomknappar, ikon-/textstorlek, kontroller och åtgärdsrader komprimerats. 22 px kryssrutor och hela klickbara punktrader kvar. Det är enbart **SmartMatch TEST**; ordinarie app, iOS och PDF-export oförändrade. Se [SMARTMATCH_TEST_V36_49.md](SMARTMATCH_TEST_V36_49.md). Fysisk iPhone/iPad-test återstår.

## Uppdatering 2026-10-10: SmartMatch TEST v36.48

Mobilens projektprotokoll är nu delat **vänster 50 % originalprotokoll + höger 50 % kontrollpunkter** i samma vy; ingen växling mellan dem behövs. Varje panel rullas självständigt. Originalprotokollet kan zoomas/flyttas och passar initialt vänsterhalvans bredd. Kontrollpunkterna kan bockas av genom att trycka på hela textraden, med tydligare 22 px kryssruta. Ändra/Ta bort kvar på andra raden på smal telefon. Även iPad mellan 700–1100 px får jämn fördelning. Endast **SmartMatch TEST**: inga Kontrollflöde, ordinarie app, TestFlight eller PDF-exportändringar. Test på fysisk iPhone/iPad återstår. Dokumentation: [SMARTMATCH_TEST_V36_48.md](SMARTMATCH_TEST_V36_48.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.47

Sparningen är nu förenklad för iPhone, iPad och dator. **Spara** öppnar en kompakt ruta med **Projekt-PDF** eller **Protokoll** och bara åtgärderna **Spara fil** och **Skicka mejl**. Manuel analys/optimering och extra sparval är borttagna från den synliga vyn. Projekt-PDF förbereds och verifieras automatiskt när dialogen öppnas; protokollbilagan förbereds när urvalet visas eller ändras så att iOS kan dela PDF direkt från användarens klick. Tidigare projektdata-/statuskontroll och lokala säkerhetsutkast finns kvar. Webbens fasta TEST-sida pekar på v36.47, **inte** ordinarie TestFlight. **Observera:** praktisk iPhone/iPad/Dropbox/Mail-test och 17-automatikers återöppningstest återstår. Läs [SMARTMATCH_TEST_V36_47.md](SMARTMATCH_TEST_V36_47.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.46

Manuell DA-placering på iPhone/iPad: Safari touchpan stoppas lokalt i aktivt läge, krysset placeras 58 px ovanför pekfingret vid touch. Efter drag/släpp kommer en förhandsruta med fyrhörns-handtag (44px hit-area), mittgrepp för flytt, finjusteringsknappar 2px vänster/upp/ned/höger och ± storlek, **Rita om**, **✓ Spara**, **Avbryt**. Inget skapas i projektet före bekräftelse; exakt finjusterad rektangel konverteras då till PDF-koordinater. Datorn använder också valfri finjustering före sparning. Återaktivera vanlig touchscroll efter avslut. Se [SMARTMATCH_TEST_V36_46.md](SMARTMATCH_TEST_V36_46.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.45

Verktyg → Koppla dörrautomatik förenklat till fältet **Märkning** och knappen **＋ Placera manuellt**. "Analysera märkningar", långa familjtexter och analysresultaten tas bort från gränssnittet; den separata objekt/GS-scannern lämnas orörd. Placering använder **drag-rektangeln** från den befintliga ändringsfunktionen, plusmarkör som följer pekaren och en liten avbrytsbar instruktion nere på skärmen. Vid kort tryck görs ingen gissad, förskjuten ruta. Vid drag/släpp sparas exakt rektangel i PDF-koordinater och därefter öppnas dörrens val. Den tidigare automatkopplingen till närmaste GS tas bort i detta manuella flöde, så användaren väljer rätt GS separat. PDF-exportfix från 36.44 (tomt statusindex när procentstämplar saknas) är bevarad. Se [SMARTMATCH_TEST_V36_45.md](SMARTMATCH_TEST_V36_45.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.43

Den inbyggda webbläsar-popupen `window.confirm` på **↻ Uppdatera** har ersatts av appens egen formgivna dialog med knapparna **Uppdatera och fortsätt**, **Spara PDF först**, **Avbryt · fortsätt arbeta**. Dialogen förklarar lokal arbetskopia kontra färdig PDF. När användaren godkänt omladdning tar v36.43 en aktuell projektsnapshot, inväntar IndexedDB-sparning och käll-PDF-cache och återställer projektet automatiskt *utan ytterligare webbläsarfråga* efter laddning. Vid sparfel stoppas uppdateringen och arbetet lämnas kvar. Se [SMARTMATCH_TEST_V36_43.md](SMARTMATCH_TEST_V36_43.md). Ordinarie app orörd.

## Uppdatering 2026-10-10: SmartMatch TEST v36.42

Text, Text + pil och Pil fick en direktredigerare för ritningen utan `window.prompt`. Efter placering eller tryck på en befintlig text/linje öppnas en kompakt på-ritningen-panel med text, färger, storlek, fetstil, ramens form/färg, bakgrundsfärg och pilens tjocklek. Ändringar förhandsvisas löpande och sparas via befintlig projektstate och undo/redo. Låt rensning/byte av verktyg avbryta osparat utkast. Pilspetsen följer vald färg. Webb/iPad/iPhone behöver praktiskt klick/drag- och tangentbordstest, och verklig PDF-export bör kontrolleras separat: v36.42 fokuserar arbetsvyns markeringar och projektmetadata. Se [SMARTMATCH_TEST_V36_42.md](SMARTMATCH_TEST_V36_42.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.41

Revision dörrautomatik har nu bara synliga primära åtgärderna **Klart** och **Kundmall** (samt × för att stänga); separat Spara lokalt/Skicka mejl döljs också i kundmallens preview. **Klart** inväntar att lokalt utkast skrivs färdigt innan revisionen stängs, med felmeddelande om lagringen misslyckas; ingen PDF-filsparning sker automatiskt. Anläggning / objekt-fältet med placeholder Snidaren tas bort från formuläret utan att radera tidigare sparat projektnamn/PDF-metadata. Punkt 1.5 och 1.12 får kortare visningstexter på en rad, fullständiga texter bevaras i PDF-protokollet. Se [SMARTMATCH_TEST_V36_41.md](SMARTMATCH_TEST_V36_41.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.40

Skanningsrutan visar fortfarande verkliga steg och procent/progressbar men har inte längre uppskattad återstående tid (sekunder/minuter), inte heller förklaringstexten 'Procenten följer skanningen. Tiden är ungefärlig.'. Skämten är större och mer lättlästa på iPhone och iPad. ETA-logik och dess uppdateringsanrop borttagna; skämten roterar ungefär var sjätte sekund under pågående skanning. Endast TEST. Se [SMARTMATCH_TEST_V36_40.md](SMARTMATCH_TEST_V36_40.md).

## Uppdatering 2026-10-10: SmartMatch TEST v36.39

Användaren vill kunna avsluta aktuell PDF utan att stänga appen och öppna nästa. Projektsparning via IndexedDB per hash + lokal utkaststatus; knapp '✓ Avsluta' → 'Spara lokalt och avsluta' och val 'Spara projekt-PDF' som öppnar befintlig export. Startsida listar tidigare lokalt arkiverade projekt och öppnar dem med vyåterställning. Lokalt arkiv är **inte** automatiskt PDF i Filer/Dropbox. Dokumentation [SMARTMATCH_TEST_V36_39.md](SMARTMATCH_TEST_V36_39.md). Fortsatt test med riktig iPhone/iPad och flera stora filer.

## Uppdatering 2026-10-10: SmartMatch TEST v36.38

PDF-status låg för långt från rätt GS-ritningsposition, särskilt på roterade ark. Exporten använder nu motsvarande PDF.js-displaykoordinater inklusive CropBox och /Rotate för att fästa procent inom ett fåtal punkter från exakt GS-rect. Markeringskrockar jämförs med övriga GS och redan placerade etiketter, väljer närmaste lediga sida, ledarlinje om längre än 6 pt. Se [SMARTMATCH_TEST_V36_38.md](SMARTMATCH_TEST_V36_38.md). v36.37 kvar.

## Uppdatering 2026-10-10: SmartMatch TEST v36.37

PDF-stämpeln syntes spegelvänd/upp och ned i en exporterad ritning ("%001"). Rotationskompensation rättad från minus- till plusvinkel och stämpelns gränsrektangel hanteras för 90/270°-sidor. Endast SmartMatch TEST: se [SMARTMATCH_TEST_V36_37.md](SMARTMATCH_TEST_V36_37.md). v36.36 behålls.

## Uppdatering 2026-10-10: SmartMatch TEST v36.36

Användaren såg fortfarande dubbla 100 % på ritningen efter v36.35. Orsaken kan vara tidigare genererade SM35:progress-FreeText. Vid öppning saneras en visningskopia av PDF:en från gamla FreeText och nya genererade progress-strömmar, originalbytes för export bevaras. Se [SMARTMATCH_TEST_V36_36.md](SMARTMATCH_TEST_V36_36.md). Testa omgående med den PDF användaren observerade dubbleringen i.

## Uppdatering 2026-10-10: SmartMatch TEST v36.35

Extra 100 %-text i arbetsvyn kontra lagrad PDF: flyttad från redigerbara PDF FreeText-annoteringar till horisontellt PDF-sidinnehåll nära GS. PDF-lager synligt i läsare men döljs i SmartMatch-arbetsvyn. Versionssäkra innehållsströmmar byts ut vid omexport; tidigare SM35-annoteringar städas av befintlig kod. Dokumentation: [SMARTMATCH_TEST_V36_35.md](SMARTMATCH_TEST_V36_35.md). Första exporten av äldre PDF kan visa äldre FreeText tills den nya filen öppnats. Viktigt att testa export i Filer/Acrobat och rundresa.

## Uppdatering 2026-10-10: SmartMatch TEST v36.34

Användaren påtalade hoppande zoom och spontana Safari-omrenderingar; också ikonmeny, bort med nedersta Plan 0 och kompakt Tid. Se [SMARTMATCH_TEST_V36_34.md](SMARTMATCH_TEST_V36_34.md). Behåll v36.33 för jämförelse.

## Uppdatering 2026-10-10: SmartMatch TEST v36.33

iPhone/iPad: Verktyg-meny klipptes bort, Analys för lång och revisionsuppgifter överlappade. Fix och tester i [SMARTMATCH_TEST_V36_33.md](SMARTMATCH_TEST_V36_33.md). Behåll v36.32 för jämförelse.

## Uppdatering 2026-10-10: SmartMatch TEST v36.32

Användaren godkände mobilkompakt huvudmeny, gemensam Spara-meny med projekt/protokoll, kort filstorleksanalys, protokollfilter och autosparat lokalt utkast. Implementationen dokumenteras i [SMARTMATCH_TEST_V36_32.md](SMARTMATCH_TEST_V36_32.md). Fortsätt med manuella test enligt detta dokument; v36.31 kvar som referens.

## Ny återkoppling från användaren

**Bekräftat av användaren efter senaste testet:** "Det har jag faktiskt testat ... den funkar nu" (2026-10-10). Den senaste rättningen för sparning/delning fungerar enligt test i användarens miljö; särskilt iPad/Dropbox-problemet var det senaste som diskuterades. **Behandla v36.31 som fungerande för det användaren nyss testat** och ändra inte detta utan att ett nytt fel påvisas. Exakt vilka separata återöppningstester med 17 automatiker, GS-pilar och checklistsvar som ingick framgår inte av återkopplingen och är därför ännu inte separat dokumenterat som verifierat.

**Beslut om nästa steg:** Avsluta arbetsdagen. Nästa gång börjar vi med att gemensamt gå igenom vad som byggts och den sparade listan med idéer. Användaren bestämmer sedan vad som ska ändras eller läggas till. **Inga fler funktionsändringar begärdes.**

## 1. Beslutat – det vi INTE ska behöva diskutera om

1. **Själva PDF-filen är projektets sanningskälla.** Alla projektändringar ska följa med när filen sparas, delas och öppnas igen i valfri webbläsare/enhet. Gammal lokal historik i Chrome/Safari får ALDRIG tyst skriva över PDF:ens tillstånd.
2. **Dörrautomatiker ingår i projektet.** Objekt/ID, modell, serienummer, sida, PDF-koordinater, storlek/placering, manuella GS-kopplingar/pilar, revisionens checklistor, status, anmärkningar, signatur/övrigt som stöds, SLR-/dokumentstatus och projektuppgifter ska återställas.
3. **Dörrkort/GS ska fortsätta fungera oförändrat** inklusive "första ID-raden på dörrkortet först" och exakt matchning mot ritning. Befintliga kontrollpunkter, arbetsresultat, markeringar, egna punkter, anteckningar och projektlogga ska bevaras.
4. **Samma fil fungerar för flera tekniker, sekventiellt.** Tekniker A sparar PDF; tekniker B öppnar den, gör ändringar och sparar en *nyare filversion*; A öppnar denna uppdaterade fil och ser B:s status. Detta kräver att A faktiskt öppnar B:s exporterade fil – automatisk realtidssynk är **inte** byggd.
5. **Sparningen måste kunna verifieras.** Innan export: kontrollera att skapad PDF verkligen innehåller förväntat antal automatiker, GS-kopplingar, checklistsvar, koordinater och full projektpayload. Visa tydlig avvikelse i stället för att påstå att allt är sparat.
6. **Bevara samma ursprungliga PDF-filnamn som förvalt exportnamn**, men skriv inte över enda fungerande original under test. Dropbox/iPad ska helst ge **en enda .pdf**, ingen extra textfil för delningstitel/revisionsprotokoll.
7. **Laddningsvy:** 0–100 % efter verkliga arbetssteg, korta varierade kollegaskämt ungefär var sjätte sekund, längre skämt när tung PDF står still länge och en försiktig ETA. Utseendet och skämtfunktionen ska inte påverka scanners.
8. **Inga kundritningar, hemliga ID-listor, säkerhetskänsliga bilagor eller API-nycklar i offentliga GitHub-repot.**

## 2. Senaste byggda TEST-versioner

| Version | Faktisk ändring | Status |
| --- | --- | --- |
| v36.26 | Första laddningsprocenten och skämt under skanning | Byggd |
| v36.27 | 30 roterande kollegaskämt | Byggd |
| v36.28 | 60 korta + 24 längre, ca 6 sek, ungefärlig ETA | Byggd |
| v36.29 | Återställde äldre DA-skanner från v36.23 och tog bort tidig rensning av automatiker vid PDF-läsning | Byggd; verklig DA-återläsning inte slutverifierad |
| v36.30 | PDF blir auktoritativ, browser-local projektdata får inte överstyra; komplett metadata + läs-tillbaka-validering innan export | Byggd; **manuellt återöppningstest med riktig PDF återstår** |
| **v36.31** | iPad/iOS-delning till Dropbox skickar enbart PDF-filer, utan `title`/`text` som kan bli extra textfil | **Publicerad; verifiera manuellt i Dropbox på iPad** |

v36.31 publicerad via GitHub Pages. Läs även `SMARTMATCH_TEST_V36_30.md` och `SMARTMATCH_TEST_V36_31.md` före kodarbete. Produktionen och TestFlight har INTE publicerats som en del av detta.

## 3. Konkreta problem och osäkerheter

- **DA försvinner vid överföring mellan webbläsare/filer.** Tidigare kunde användaren se **17 automatiker i Chrome** men **0 i Safari**, och en lokalt sparad PDF gav 0 även vid nyöppning i Chrome. Mest sannolikt: 17 låg i Chromes gamla lokala projekthistorik eller exporterades inte med; det är ännu inte bevisat om aktuell v36.30/31 löser hela scenariot med *riktig PDF*. **Påstå inte att buggen är slutligt löst innan återöppningstest har passerat.**
- **Migration från gammal lokal Chrome-status är kritisk:** v36.30/31 läser avsiktligt inte den gamla historiken. Om 17 enbart finns i en äldre webbläsares localStorage kan de gå förlorade vid övergång till den nya PDF-first-vyn. Behåll originalet och den fungerande Chrome-sessionen! Om 17 bara syns i äldre v36.29, öppna då den **sparade sessionen i v36.29**, exportera *en kopia* till PDF och verifiera att det står 17 i v36.30/31:s exportkontroll/återöppning. Om migration inte fungerar, implementera ett **separat och användarbekräftat "Importera äldre lokal projektstatus"**-flöde som aldrig automatiskt skriver över filen.
- **Dropbox/iPad extra textfil:** v36.31 tog bort `title` och `text` från iOS-delning och skickar bara `files`; **inte manuellt bekräftat** att Dropbox nu enbart får PDF. Testa specifikt revisionsprotokoll → Spara lokalt → Dropbox, samt hel projekt-PDF → Spara lokalt → Dropbox.
- **Projekt-PDF och enskild revisions-PDF är två olika exporter.** En egenkontrolls knapp heter numera **Klart**, som stänger redigeringen; för komplett projektinformation ska man välja **PDF → granska/verifiera → Spara lokalt/Spara som**. Utveckla gärna tydligare förklaring där för att undvika handhavandefel.
- **Samtidiga ändringar är inte automatiskt sammanfogade.** PDF-first stödjer sekventiell överlämning, inte parallell säkrad synk. Cloud-integration, låsning och konfliktflöde är endast plan i `SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md`.

## 4. Starta nästa arbetspass – kort testchecklista

1. Fråga först användaren om resultaten från iPad/Chrome/Safari och bekräfta **vilket filnamn och vilken exakt PDF-kopia** som öppnades. Be inte om känsliga ritningar i public GitHub.
2. Kontrollera repo `main`, `DEVELOPMENT_RULES.md`, versionsmärkt TEST-HTML och GitHub Pages-deploy. Efter v36.32: nästa v36.33.
3. Använd en **kopia** av känd PDF med 17 automatiker. Öppna i Chrome, se 17 i DA-listan. Välj **PDF → granska**, kontrollera att "Verifierad projekt-PDF" visar 17 (inte 0), spara en ny PDF. Öppna exakt ny sparad fil i Chrome och Safari/iPad. Kontrollera 17 positioner, dörrkort, GS-pilar, revisionsstatus och anmärkningar.
4. Öppna filen i en annan webbläsare med gammal lokal historik, testa att PDF-innehållet bestämmer. Låt kollega ändra en kontrollpunkt/placering och exportera reviderad PDF; öppna den på den första enheten.
5. Testa iPad → Dropbox: spara enskilt revisionsprotokoll och hel projekt-PDF. Kontrollera att båda sparas som korrekt **.pdf** och **inte skapar separat .txt-fil**.
6. Om verkligt återöppningstest misslyckas: undersök PDF metadata `TillsynoSmartMatchV36Data` och `TillsynoSmartMatchV30Data`, `makeProjectPayload`, `buildPortableProjectPdf`, `verifyPortableProjectPdf`, `readEmbeddedProjectState`, `buildInstances`, `automationItems` i versionsfilen. Skapa nästa version endast för verifierad orsak; lämna tidigare TEST-filer intakta.
7. Vid framgång: notera verifierad version/resultat i detta dokument och bestäm därefter nästa utvecklingsuppgift med användaren.

## 5. Prioriterade idéer för efter testet

**P0 – Datatrygghet:** Säker import av äldre lokal Chrome-data när PDF saknar automatiska positioner (endast efter tydlig bekräftelse), varna om sparad PDF har 0 automatiker fast projektet innehåller 17, markera om ändringar finns som ännu inte exporterats. Visa tydlig status "Sparat i PDF" kontra "Osparat arbete", och enklare filverifiering.

**P1 – PDF och återupptagning:** Snabbare öppning av färdiga PDF-projekt utan onödig full omskanning av redan sparade positioner; kontrollera att gamla koordinater fortfarande gäller; bättre hantering av stora PDF (30 MB+) och skarp zoom på iPad/iPhone, med stegvis skanning enbart där PDF:n verkligen ändrats.

**P2 – Arbetsflöde för tekniker:** Smidig koppling "ritning ↔ dörrkort ↔ DA-revision/SLR" med en enkel knapp för manuell omkoppling när ritningen ändras; selektera många dörrar/egenkontroller och markera klara; tydlig projekt-/revisionshistorik (vem ändrade vad och när) och förhandsgranskning av vad kunden får.

**P3 – Samarbete/säkerhet:** Designa delat projekt med offlinekö, projekt-/dörrversions-ID, individuell dörrlåsning online, ändringslogg, synkstatus och konfliktbeslut hos arbetsledare. Läs `SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md`. **Inte implementerat, inget beslut om molnleverantör och inga externa kundfiler ska skickas utan uttryckligt godkännande.**

## 6. Så ska nästa ChatGPT-pass starta

Öppningsfras för fortsatt arbete:

> Vi fortsätter SmartMatch från `SMARTMATCH_FORTSATTNING_2026-10-10.md` i GitHub-repot `dyli2009-cmd/tillsyno`. Kolla senaste versionen och noteringarna. Börja med 17-automatikers återöppningstest och Dropbox-textfilen innan nya funktioner byggs.

**Versionsdisciplin:** Se alltid `DEVELOPMENT_RULES.md`. Ändra aldrig ordinarie TestFlight/Kontrollflöde utan nytt godkännande. Nästa TEST efter bekräftad v36.31 = v36.32. Behåll fasta `project-workspace-smartmatch-test.html` vid varje funktionspublicering.

**Påminnelse:** Användaren har bett om en framtida påminnelse och idéer när arbetet återupptas; **ingen tid är angiven och ingen automation har skapats**. Fråga om önskat datum/klockslag för en verklig notifiering.
