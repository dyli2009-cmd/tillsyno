# SmartMatch – samlade och låsta funktionsregler

**Senaste implementationsrättning TEST v36.102 (2026-10-11):** Det här låsta v36.101-beslutet visas nu i UI: jämför sparad GS med verifierad GS, låt tekniker manuellt spara rättning, och stoppa tveksam SLR-källa. [Se v36.102](SMARTMATCH_TEST_V36_102.md).

**Senaste beslut v36.101 (2026-10-11):** En fysisk automatik får högst **en korrekt verifierad GS** som källa till exakt det tillhörande dörrkortet för framtida SLR. DA-symboler är bara positionshjälp; motstridiga gamla GS-värden får inte användas som SLR-underlag. Läs [v36.101](SMARTMATCH_TEST_V36_101.md).

**Beslut 2026-10-11:** Användaren bekräftade v36.92:s objektsökning. Senare samma dag begärde användaren återställning av dörrkortskontroll och endast en GS-pil per fysisk automatik. Historisk v36.100-regel var: närmaste GS med dörrautomatik enligt sitt eget dörrkort, mätt från den fysiska DA-symbolen när den finns; annars från märkningens mittpunkt. v36.92:s närmaste-GS-utan-kort och v36.97–v36.98:s ID-prioriterade fjärrval gäller inte längre.

Det här är ingången när vi återupptar utvecklingen eller användaren frågar: **”Hur tänkte vi kring den här funktionen?”** Läs den berörda regeln före ändring. Använd aktuell beslutad regel; äldre versionsanteckningar är historik.

## Gällande regler

| Funktion | Avläsningskälla och koppling | Gällande dokument | Status |
| --- | --- | --- | --- |
| Dörrautomatik | Placering → hela objektnumret → egen knapp per fysisk automatik → läs kopplat GS-dörrkort → en pil till närmaste rätta GS på samma sida | [Dörrautomatik och GS-koppling](SMARTMATCH_AUTOMATION_RULE_LOCK.md) | LÅST; v36.101: en verifierad GS/dörrkortskälla per automatik; DA-symbol som positionsstöd, ED100/ED200/ED250 |
| Dörrkort, standardprofil | Identifiera tabellen → läs ID i översta vänstra cellen → matcha samma hela ID på ritningen → koppla kortet till positionen | [Tabellavläsning och dörrkort](SMARTMATCH_TABLE_RULE_LOCK.md) | LÅST; generell tolkning av alla tabellupplägg är ännu inte färdig |
| Dörrkort, separat känt tillägg | Uttrycklig korttitel → verifierad Objekt-rad och Komponent/Produkt-tabell → samma hela ID på ritningen | [Tabellavläsning, avsnitt 8](SMARTMATCH_TABLE_RULE_LOCK.md) | Tillägg enligt användarbeslut; v36.95 |
| Avläsning TEST 9.28, GS-produkter | Liten markerad läsyta med Övrigt/Produkt + Monteras av/Mont av + berörda GS-rader → granskad GS-lista; originalkortet visas separat i sin helhet | [TEST 9.28](SMARTMATCH_READ_TEST_9_28.md) | Beslutad; Lev av räcker inte för GS och manuell accept får endast häva tabelltolkningsfelet |
| Avläsning, DS/DA-symboler | Visa endast originalsymbolerna i PDF; inget extra utrustningslager | Beslut 2026-10-29, Avläsning 9.100.3 | LÅST; ersätter 9.29-visningsregeln för aktuell Avläsning |
| Protokollexport | Spara → Protokoll → endast valda protokollsidor; godkända är förvalda; inga ritningssidor eller GS-länkmenyer | [TEST v36.96](SMARTMATCH_TEST_V36_96.md) | Beslutad enligt användarens instruktion |

## Två kopplingar som bygger på varandra

**Tabellunderlaget kommer först:** För ett nytt eller oprövat dörrkortsupplägg lägger användaren in ett exempel på tabellen. Vi läser och kontrollerar hur den är byggd, vilka celler som finns och var översta vänstra ID-rutan ligger. Därefter verifieras avläsningen och matchningen. Redan verifierade upplägg kan återanvändas; automatisk inlärning av nya mallar är inte byggd.

**Dörrkort → ritningsposition:** Kortets ID, till exempel GS10 eller 140 C, bestämmer vilken beteckning som ska hittas på ritningen. Hela beteckningen matchas; mellanslag kan normaliseras, men ID 1 får inte matcha en del av 11.

**Dörrautomatik → GS-position:** Automatiken läses på ritningen. Den GS-position som väljs automatiskt måste ha ett dörrkort som bekräftar dörrautomatik och stämmer med märkningen eller känd kompatibel maskintyp. Av flera verifierade GS väljs närmaste på samma sida. En fysisk automatik får en enda pil; äldre dubbla sparade kontroller raderas inte.

Saknat eller oläsbart kort hindrar inte att en automatik hittas och får egen knapp, men då visas manuell GS-koppling i stället för en gissad pil. Tidigare manuellt bekräftade länkar bevaras.

## Så förklarar vi en punkt vid nästa genomgång

Utgå från den aktuella regeln och ett konkret exempel. Beskriv:

1. Vad användaren gör och vilket resultat som ska synas.
2. Vilken uppgift som läses, var den läses och hur den delas upp.
3. Hur matchning och fysisk placering bestäms.
4. Varför vi valde beteendet och vilka tidigare fel det löser.
5. Vad som händer vid oläsbarhet, tvetydighet eller saknad koppling.
6. Vad som faktiskt verifierats och vad som återstår för nya format.

Skilj mellan beslutad funktion, vad nuvarande kod klarar och framtida idéer. Beskriv inte en planerad förbättring som redan färdig.

## Gemensamt lås och beslutshistorik

Reglernas principer ändras endast efter ett nytt uttryckligt användarbeslut. Ändringar i andra funktioner låser inte upp dem. Felrättningar inom beställd omfattning som gör koden förenlig med reglerna är tillåtna.

Ett nytt beslut dokumenteras med datum, funktion, gammal regel, ny regel, skäl, berörd version och verifiering. Uppdatera den aktuella regeln och markera vilken äldre princip som ersatts.

| Datum | Beslut | Underlag |
| --- | --- | --- |
| 2026-10-11 | Lås dörrkortets ID-källa till översta vänstra tabellcellen och matcha hela ID på ritningen | [Tabellregeln](SMARTMATCH_TABLE_RULE_LOCK.md) |
| 2026-10-11 | Dörrautomatik använder placerad märkning, hela objektnumret, egen knapp per träff och närmaste GS; tidigare kortfilter och en-till-en-krav ersätts | [TEST v36.92](SMARTMATCH_TEST_V36_92.md) |
| 2026-10-11 | Användaren bekräftar ”nu funkar detta” och låser automatikregeln samt begär denna gemensamma samling | [Automatikregeln](SMARTMATCH_AUTOMATION_RULE_LOCK.md) |
| 2026-10-11 | Lägg till en separat känd läsprofil för det nya tabellupplägget; behåll standardprofilen och DA92 | [TEST v36.94](SMARTMATCH_TEST_V36_94.md) |
| 2026-10-11 | Ersätt v36.92:s närmaste GS utan kortkontroll: läs GS-dörrkortet, välj närmaste verifierade GS, max en pil per fysisk automatik; bevara objekt- och kontrollflödet | [TEST v36.97](SMARTMATCH_TEST_V36_97.md) |
| 2026-10-18 | Skilj den lilla GS-avläsningsytan från helkortsvyn och låt användaren uttryckligen godkänna användbara GS-rader utan att kringgå kod-, läs- eller ritningsspärrar | [Avläsning TEST 9.28](SMARTMATCH_READ_TEST_9_28.md) |
| 2026-10-18 | Visa endast exakta fristående DS/DA-stämplar; skilj dem med orange/röd fast 14-pixelssymbol och dubblera inte WC/VCDS eller identiska registerposter | [Avläsning TEST 9.29](SMARTMATCH_READ_TEST_9_29.md) |

## Utveckling och fortsatt arbete

[DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) anger arbetsområden, isolering och versionsregler. [Fortsättningsdokumentet](SMARTMATCH_FORTSATTNING_2026-10-10.md) innehåller status och tidigare arbetspass. [TEST v36.92](SMARTMATCH_TEST_V36_92.md) redovisar implementation och verifiering av det godkända automatikflödet.

Beslutsdokumentet kompletterades och appkoden uppdaterades i TEST v36.97. Det här låset beskriver gällande beteenderegler, men är ingen teknisk spärr i GitHub.

## Verifierat tillägg för dörrkort – TEST v36.93

Samma grundtabell med sammanfogad översta cell och två utrustningskolumner har kontrollerats med `Dörrkort Teknik`. Ett tillägg i första-cell-avläsningen ger TEKNIK utan att byta ID-källa eller ändra befintliga GS-/sifferregler. Se [versionsdokumentet](SMARTMATCH_TEST_V36_93.md) och [tabellregeln](SMARTMATCH_TABLE_RULE_LOCK.md). Dörrautomatikens godkända v36.92-modul är oförändrad.

## Separat känd tabellprofil – TEST v36.94

**Nytt uttryckligt beslut 2026-10-11:** Lägg till kända tabellupplägg utan att ändra det som redan fungerar. Standardprofilen med ID i första vänstra cellen behåller sina regler. För ett annat verifierat upplägg kan en separat profil få en dokumenterad ID-källa som hör till just det upplägget.

Profilen `card-title-object-components-v1` kräver följden Dörrkort-titel → Objekt-rad → Komponent/Produkt-tabell och läser den uttryckliga korttiteln. Den befintliga avläsningen har alltid företräde. Samma profil återanvänds för andra kort med samma uppbyggnad; inget projekt eller visst ID är hårdkodat. Korten identifieras även ensamma. Ritningskoppling kräver att de faktiska korten och ritningen finns i appens projekt.

Se [tabellregelns avsnitt 8](SMARTMATCH_TABLE_RULE_LOCK.md) och [TEST v36.94](SMARTMATCH_TEST_V36_94.md) för avgränsning, skäl och verifiering. Den godkända dörrautomatikmodulen v36.92 är oförändrad.

## Återanvändning för korta tabeller – TEST v36.95

Den kända titel/Objekt/Komponent-profilen räcker som kortbevis även med en utrustningsrad. Äldre klassningskrav på ytterligare Låshus-/Cylinder-ord gäller inte för den redan verifierade profilen. Profilen och den låsta standardavläsningen ändras inte. Se [TEST v36.95](SMARTMATCH_TEST_V36_95.md).


## Snidaren GS2/GS4 – TEST v36.100

PDF-sida 3 Plan 0 innehåller `200154-28-24-1` vid GS4 och `200154-28-24-2` vid GS2, båda med dörrkort ED100 (PDF-sidor 14 och 12). Appen använder en-till-en-fördelade separata DA-symboler som geometrisk ankare innan den väljer närmaste verifierade GS. Detta korrigerar fel GS4-pil för `...-2` och behåller `...-1 → GS4`. Läs [v36.100](SMARTMATCH_TEST_V36_100.md).

## Närmaste GS med dörrautomatik och kompatibel ED200 – TEST v36.99

Nytt uttryckligt användarbeslut 2026-10-11: en automatik ska peka på **den närmaste GS vars eget dörrkort har dörrautomatik**. Stöd för ED200/ID200 (kod 17) ihop med tidigare ED100/ID100 (24) och ED250/ID250 (37) gäller endast denna pil. Exakt ID får inte föra pilen långt bort förbi en närmare kompatibel GS. För långa automatiska pilar avstår koppling och erbjuder manuellt val; äldre automatiska GS2-pilar räknas om när projektet öppnas, medan uttryckliga manuella kopplingar, kontroller och SLR sparas. Se [TEST v36.99](SMARTMATCH_TEST_V36_99.md).

## ED100/ED250 och ID100/ID250 – TEST v36.98

Undantaget gäller endast GS-valets maskintyp, i båda riktningar: 24 (ED100/ID100) och 37 (ED250/ID250). `ID250` och `ID 250` läses uttryckligen som typ 37. Fullständiga ID ska behålla samma objekt och sista nummer; originaltyp, kontroller och SLR ändras inte. Se [TEST v36.98](SMARTMATCH_TEST_V36_98.md). Föregående v36.97 är historik och återgångssnapshot.

## Protokollsexport utan ritning – TEST v36.96

Användaren vill ta bort Ta med ritning och GS-länkar från Spara → Protokoll. Exporten ska bara innehålla valda protokoll. Godkända protokoll är förvalda enligt det befintliga urvalet; urvalsfilter och kontrollstatus ändras inte. Både ett och flera valda protokoll ger bara sina protokollsidor. Detta är skilt från att spara själva projektet med ritningen. Se [TEST v36.96](SMARTMATCH_TEST_V36_96.md).


## Separat avläsningstest: GS-listor och manuella kompletteringar – TEST 9.2

Användarbeslut 17 oktober 2026, avgränsat till **SmartMatch Avläsning TEST 9.2**: produktvärden från Övrigt / Produkt visas under dörrkortets avsnitt som GS-checklista. GS i **Monteras av / Mont av** är fortsatt ansvarskällan. GS enbart i Levereras av räcker inte; DT-montage och oklart ansvar blir inga gissade GS-moment.

Användaren får även uttryckligen komplettera ett öppet projekt genom att markera en hel ritningsbeteckning, förvalt avgränsa sökningen till samma textfärg, granska de nya positionerna och själv välja vilken dörrkortssida de ska öppna. Detta är en separat, manuellt bekräftad koppling, även när kortets tryckta rubrik skiljer sig från ritningsbeteckningen. Befintliga kopplingar och kontroller ersätts inte; dubbletter och försök att ge samma beteckning en annan befintlig kortsida spärras. Saknade kortsidor kan läggas till från PDF och produkter läsas senare.

Detta beslut ändrar inte den låsta standardprofilens ID-källa eller automatisk DA-till-GS-koppling. Ordinarie SmartMatch och tidigare testversioner bevaras. Arbetsgång, skydd och verifiering dokumenteras i [TEST 9.2](SMARTMATCH_READ_TEST_9_2.md).

## Snabb GS-yta och separat originalkort – TEST 9.28

Användarbeslut 18 oktober 2026, avgränsat till **SmartMatch Avläsning TEST 9.28**: markeringen styr endast vad som läses. För produktsteget räcker den minsta sammanhängande yta som innehåller **Övrigt/Produkt**, **Monteras av/Mont av** och de aktuella GS-raderna. **Lev av** är leverantörsinformation och ger inte ensam GS-ansvar; DT och dörrtillverkare ska inte bli GS-kontrollpunkter.

När en kopplad ritningsstämpel öppnas visas originaldörrkortet oberoende av den lilla läsytan. En PDF-sida med ett enda källdörrkort visas i sin helhet. Sidor med flera fysiska kort behåller sitt separata kortutsnitt tills ett eget helkortsutsnitt har angivits.

Om råtexten och de föreslagna GS-raderna finns men tabellstrukturen inte blev helt säker får användaren godkänna raderna efter uttrycklig jämförelse med originalkortet. Råtext, ordpositioner, varningar och granskningspost bevaras. Godkännandet får inte häva saknad beteckning, dubblett, avbruten eller oläst sida, ändrat men ej omläst område eller kravet att granska ritningsträffarna. Den sparade projekt-PDF:en återanvänder resultatet utan ny OCR.

## Exakta fristående DS/DA-symboler – TEST 9.29

Användarbeslut 18 oktober 2026, avgränsat till **SmartMatch Avläsning TEST 9.29**: fristående DS och DA ska vara synliga utan att samma bokstäver plockas ur en redan kopplad VCDS-, WC- eller annan sammansatt stämpel. En synlig `/Stamp` accepteras endast när `/Subj` exakt är `DS`, `DA`, `Dörrstängare` eller `Dörrautomatik`. Endast ett tomt `/Subj` tillåter samma exakta klassning från `/Contents`. Bland annat `WC dörrstängare`, `VCDS`, `DBL-DS`, `DS1` och `Dörrstängare freeswing` avvisas. Identiska poster för samma sida och typ visas en gång.

DS är en orange kvadrat och DA en mörkröd kvadrat. Båda behåller 14 × 14 CSS-pixlar och 8-pixelstext vid all zoom, medan deras mittpunkt följer PDF-rektangeln. Lagret är passivt och får inte starta OCR, helsidestext, produktläsning eller matchningssökning.

## Originalsymboler utan extra DS/DA-lager – 2026-10-29

Uttryckligt användarbeslut: ta bort orange DS och mörkröda DA som appen lagt ovanpå originalritningen för läsbarhet på iPad/iPhone. Avläsning 9.100.3 laddar inte längre den separata utrustningsmodulen. Original-PDF och dess annoteringar, GS-kopplingar, dörrkort och projektdata behålls. Detta ersätter ovanstående historiska 9.29-regel i aktuell Avläsning; äldre testsidor ändras inte. Verifierat att endast modulens scriptimport avlägsnas och att ingen annan aktiv kod refererar till dess API. Ingen fysisk iOS-verifiering utförd.

## Välj stämpel – 2026-10-29, v2.4.508

Uttrycklig beställning: Verktyg → Välj stämpel i aktuell SmartMatch och Avläsning. Tryck eller dra en ruta, välj en identifierad PDF-/Stamp, dölj i appens ritningsvy eller ta bort vid projekt-PDF-export. Inga vita masker, OCR-gissningar eller produkt-/dörrkortsrader raderas. Dolda original finns kvar i PDF och kan återställas; borttagning kan ångras fram till återöppning av den exporterade filen. Sidnummer, namn, rektangel, ämne och innehåll identifierar stämpeln även efter PDF-omskrivning; identiska tvetydiga objekt avvisas. Valen sparas i projektpayload och TillsynoStampEdits-katalogen. Exporten verifierar metadata och att borttagna stämplar saknas. Historiska testsidor och Kontrollflöde är oförändrade.

Kontrollpunkter i Avläsning: Hela avlästa tabellen / eget läsområde visas inte längre, rådata sparas fortsatt. Avlästa produkter finns kvar. Töm lista heter Ta bort hela listan och ligger i Verktyg; befintlig bekräftelse för bara den öppna dörrens kontrollpunkter bevaras.

Verifiering: 26 automatiska PDF-/integrationskontroller (båda huvudmodulerna), 9 webbläsarkontroller per bredd 390 och 834, samt verklig dragmarkering i webbläsaren. Syntetiska PDF-stämplar med underliggande ritningslinje, angränsande GS och andra PDF-länkar används. Fysisk iOS och kundernas Bluebeam-filer har inte testats.

Även Projekterings redigerbara TillsynoCode-/FreeText-stämplar stöds: endast den uttryckligen grupperade projection-v2-frame-ramen tas med vid dölj/borttagning. Vanlig fri PDF-text omfattas inte.


## 2026-10-29 — v2.4.509, auktoriserade projektuppgifter

Användaren beställde gemensam projektidentitet från Projektering till SmartMatch/Avläsning och befintliga egenkontroll-/SLR-fält. Ny versionsisolerad metadataadapter skriver/läser TillsynoProjectInfoV1. Sparade SmartMatch-värden, även avsiktliga tomma värden, har företräde över importerade grundvärden. Logga följer med; projekterande person blir inte automatiskt signerande tekniker. Inga ändrade produktmatchningsregler, ingen automatisk överföring av nya produktlistor och ingen ny försättssida. KL:s gamla standardfärg migreras till grönt; egna färgval behålls.

Verifiering: tests/project-info-v509.cjs (52 kontroller) och tests/project-details-v509.cjs passerar. Proven omfattar faktisk PDF-export/import i båda aktuella huvudmodulerna, SLR:s befintliga fältmappning, projektfil, stor logga, sparade överstyrningar, färgmigrering och atomisk sparning. Browserkontroll av projektformulär, sparning/återöppning och 390 px telefonlayout genomförd; fysisk iPhone/iPad är inte provad.

2026-10-29, v2.4.513 / Projektering 2.19.16: Kompakt högeröversikt med komponent, produkt, verkligt antal, deduplicerade ansvarskoder och stycktid på samma rad. Ansvarens fulla betydelse finns kvar i title/aria-label. Material visas som tabell även på telefon, med horisontell rullning, fasta rubriker och utfällbart dörrkortsunderlag. Antal beräknas fortsatt per placerad GS-position; fem placeringar av samma kort räknas fem gånger, oplacerade kort och DT-montering ingår inte. AK dubbleras exakt en gång. Nya produkter utan egen tid får märkt kategoriuppskattning; avsiktlig tom projekttid i Material förblir tom.

Tidsöverföring: ny validerad projectionTimes-lista i TillsynoProjectInfoV1, importerad till SmartMatch/Avläsning timeConfig och bevarad av befintlig projektsparning. Tider från Projektering, även egna och uppskattade, gäller före mottagarens allmänna standardtider. Uttryckliga punkt-/produkttider som användaren anger i SmartMatch har företräde. Matchning använder hela produktnamn och komponentetiketter; motstridiga eller okända namn får ingen felaktig delsträngsträff. Inga ändringar i OCR, GS-koppling, avläsningsgodkännanden, SLR-signaturer eller Kontrollflöde. Endast nya exporter får tidssnapshot.

Verifiering: tests/projection-times-v513.cjs provar fem GS2-positioner, DT och oplacerade kort, AK x2, nya produkter med blank tid, PDF-snapshot och båda faktiska SmartMatch-importörerna samt tidsresolver inklusive egna överstyrningar. tests/project-details-v513.cjs och tests/automation-stencil-v513.cjs passerar. Browserprov av ett tryck på dörr, kompakt översikt, materialrutnät och 390 px horisontellt rullbar telefonvy. Fysisk iOS-enhet är inte verifierad.

2026-10-29, v2.4.514 / Projektering 2.19.17: Beställd bredare modellväljare och automatisk förhandsvisning objektnummer-maskinkod-löpnummer. Objektnummer accepterar text, svenska bokstäver, skiljetecken och fler än tolv siffror (160 tecken som projektfältet). Ingen ändring av dörrkortens strikta beteckningsregler. Befintlig automatikgrupp återanvänds med nästa sparade löpnummer. Modellfält i full bredd med radbrutet modellnamn under, 16 px inmatning på telefon. Versionerade data/store/library/material/PDF/UI-filer. SmartMatch OCR:s sifferbaserade tolkning ändras inte i denna avgränsade formulärändring.
Verifiering: automation-label-v514, automation-stencil-v514, project-details-v514 och projection-times-v514; PDF-rundresa i båda lägena för text, svenska tecken, skiljetecken och långa nummer. Faktisk webbläsarkontroll av dialog vid 320 px med HUS-A-45-1. Fysisk iOS-enhet ej verifierad.

2026-10-29, v2.4.515 / Projektering 2.19.18: Beställd kompakt högeröversikt med produktnamn, antal, ansvarskod och högerställd stycktid i fasta kolumner. Inga /st- eller uppskattningstecken i radtexten; tidskälla behålls i title/aria. Fel reproducerat för importerad giltig category=other: kategorifiltrerad bibliotekslista kastade och stoppade renderAll. Översikten läser nu biblioteket en gång och matchar kategori plus produktnamn, utan att försöka öppna other som produktregisterkategori. Okänd tid visas som streck; ingen tid lånas från fel kategori. Enkelklick visar högeröversikt; befintlig dubbelaktivering öppnar samma popup. Ansvar och materialberäkning ändras inte.
Verifiering: tests/card-summary-v515.cjs reproducerar tidigare fel och kontrollerar importerade produkter, kolumner/tider och select/activate-flödet; projection-times-v514 passerar. Faktisk browser: GS4 enkelklick visar fyra produkter till höger, dubbelklick öppnar cardEditorDialog. Desktop kontrollerad visuellt; fysisk iOS, 200 procent och mörkt tema ej verifierade i denna ändring.

2026-10-29, v2.4.516 / Projektering 2.19.19: Användaren ersätter tidigare kvadratisk standard för nya dörrautomatikstenciler med befintlig oval stämpelform, orange #f3b65d och svart text #000000. Bredd anpassas till märkning (96–240 pt), höjd 48 pt. Biblioteksknappens förhandsikon följer formen/färgen. Sparade stencilers egna former och placeringar ändras inte; detta är grundutseendet vid skapande. Modellkod/löpnummer oförändrade. Verifiering: automation-stencil-v516, automation-label-v516 och projection-times-v516, inklusive PDF-rundresa och bevarad numrering.

2026-10-29, v2.4.517 / Projektering 2.19.20: Användarens bild preciserar dörrautomatikstämpeln som låg, lång orange rektangel med rundade hörn och svart text. Nya stenciler använder rectangle, minst 112 pt bredd och 24 pt höjd. PDF-utseende använder samma 3 pt hörnradie som ritningsytan. Räknarraden förstoras från 9–10 px till 14–15 px etiketter och 17–18 px antal. Högeröversiktens extra produktanteckningar döljs; lagrad originaltext och fullständigt redigeringskort behålls. Produkt, antal, ansvar och tid behålls. Verifiering: automation-stencil-v517, automation-label-v517 och card-summary-v517; båda PDF-lägen och numrering.

2026-10-29, v2.4.518 / Projektering 2.19.21: Beställd uppdelning av Dörrstopp / porthållare till två standardrader, Dörrstopp och Porthållare, under Övriga tillbehör. Separata produktval, antal och ansvar i digitalt kort, sammanfattning, material och PDF. Gemensam befintlig produktkategori/tidregister behålls. Exakt äldre kombinerad rad migreras utan mutation av källan; uttryckligt produktnamn Porthållare flyttas med samtliga uppgifter till nya raden, övriga produkter bevaras på dörrstoppsraden. Ingen dubblering av antal. Verifiering: door-stop-holder-v518 testar separata rader, mängder, ansvar, material, båda PDF-lägen och idempotent migrering; projection-times-v518 regression.
