# Tillsyno – gemensamma gränssnittsregler

Användarbeslut 2026-10-29: en gemensam standard, införd en sida/modul i taget. Första beställningen är Kontrollflödet. Detta dokument ger inte tillstånd att ändra andra moduler samtidigt.

## Storleksskala

Alla mått är CSS-pixlar vid webbläsarens standardtext 16 px. Använd rem och den gemensamma användarskalan så att text kan förstoras.

| Roll | Telefon/iPad | Rymlig datorvy |
| --- | --- | --- |
| Brödtext, kontrollpunkter, inmatningsfält | 16 | 18 |
| Etiketter, hjälptext, verktygsnamn | minst 14 | minst 14 |
| Sidrubrik / underrubrik | 24 / 20 | 24 / 20 |
| Verktygsikon | 20–24 | 20–24 |
| Aktiv verktygsknapps tryckyta | minst 44 × 44 | minst 44 × 44 |

Datorskalan kräver minst 1100 px, hover och fin pekare. Manuellt telefon-/surfplatteval behåller sin skala. Layouten måste också fungera i smala datorfönster och på breda pekskärmar. Samma namn och ikon används på alla enheter.

Viktiga åtgärder som Spara PDF och Kundmall visar ikon och text. Kompakt filhantering kan visa ikon med tillgängligt namn och tooltip. Vanlig text ska ha minst 4,5:1 kontrast; status använder även text eller symbol. Avstånd följer normalt 8/16/24 px.

## Anpassning

- Behåll läsbar text; ändra radbrytning, kolumner och placering efter tillgänglig bredd.
- Samla längre verktygslistor i en tydlig utfällbar meny på telefon. Håll ritningsytan användbar.
- Text ska kunna förstoras till 200 % utan att kontroller eller innehåll försvinner. Vid stor text och låg fönsterhöjd får arbetsytan rulla.
- Tangentbordsfokus ska synas. Alla ikonknappar ska ha ett tillgängligt namn.
- UI-skalan får inte ändra ritningskoordinater, stämpelstorlek, PDF-layout eller sparade protokollvärden.

## Arbetsgång för varje sida

1. Läs denna fil, modulens regler och tidigare användarbeslut.
2. Dokumentera avvikelser och avgränsa ändringen till beställd sida.
3. Ändra presentationen med separat, tydligt avgränsad CSS/JS.
4. Kontrollera dator, surfplatta, 390/320 px telefonbredd, smalt datorfönster, manuellt enhetsval, ljust/mörkt tema och 200 % text.
5. Kontrollera sidans verkliga funktioner: öppna, navigera, redigera, spara och återöppna där de finns.
6. Dokumentera resultat och begränsningar. Fysisk iOS-verifiering får inte påstås utifrån enbart webbläsartest.
7. Publicera och gå först därefter vidare till nästa beställda sida.

## Infört först i v2.4.501

`all-in-one.html` och produktionssidan `controlflow-revision/all-in-one.html` använder `controlflow-ui.css` och `controlflow-ui-scale.js`. CSS är begränsad till uttryckligen markerade Kontrollflödessidor. Den separata CSS-lagrets viktiga regler ersätter äldre kompakta UI-mått utan att skriva om delade stilmallar.

Textinställningen lagras i `tillsyno-controlflow-text-level-v1`, med nivåerna 100/112/124/136/160/180/200 %. Ett tidigare mindre textval normaliseras till standardens läsbara bas. Äldre större nivåer 1–3 behåller samma faktor. Inga inställningar för andra moduler skrivs över.

Gamla testversioner, CE, SmartMatch, startsidans layout och fristående säkerhetssidor omfattas inte av denna första utrullning.

## Ritningsyta v2.4.504

När en PDF är öppen och ritningsvyn visas döljs den gula instruktionen, områdesrubriken, protokollnamnsraden och projektrubriken (t.ex. Allt-i-ett). Objekträknaren behålls i en smal rad. Filnamn och arbetsknappar behålls. Rubriker i protokoll-/projektvyer och innan ritningen öppnats följer tidigare regler.

## Kompakta telefonprotokoll v2.4.506

På användarens beställning gäller 14 px kontrolltext, 13 px etiketter och 18/16 px rubriker inom telefonens protokoll. Inmatning behåller 16 px och svarsknappar minst 44 px tryckyta. Avstånd minskas. Revisionsrader visar text och svar bredvid varandra från 360 px vid normal textskala; mindre skärm eller större text får radbrytning. Samma telefonläge används vid högst 800 px eller manuellt val Telefon. Textförstoring bevaras. Dator/iPad och övriga panelers textskala ändras inte.

Ritverktygsfältet (sessionHistoryBar) visas endast i ritningsvyn. Det döljs även när Översikt ligger över en fortfarande aktiv ritningsvy eller när en separat inlinepanel är öppen. Det återkommer när man återgår till ritningen.


## Kompaktare objektuppgifter i Säkerhetsservice v2.4.527

Användaren beställde mindre uppgifter och inga dubbla fil-/projektnamn i arbetsytan efter PDF-öppning. Avgränsat undantag: 14 px rubrik, 12 px etiketter/låsta värden, 14 px redigerbara fält och 36 px fälthöjd. Etiketternas sammanlagda tryckyta är minst 44 px; fokuserade redigerbara fält är minst 16 px på pekskärm. Fyra kolumner på större skärmar, två på telefon, en vid stor text. Kontrollpunkternas text/svarsknappar och sparade namn ändras inte. Övriga moduler följer tidigare regler.




## Säkerhetsservices ritningsrad v2.4.528

Användaren beställde borttagna PDF-zoomknappar och klar-instruktion. Sidväxlingen ligger i arbetsverktygsraden och textskalans A+/A− i ritverktygsmenyn. Raden får radbrytas på smala skärmar; sidknapparnas 44 px tryckytor bevaras. Nyp-/mushjulszoom, sidfunktion och felmeddelanden ändras inte. Namnraderna följer v2.4.527.


## Säkerhetsservices resultatrubriker v2.4.529

Beställd mindre text över svarskolumnerna: 11 px på iPad/surfplatta och 10 px på telefon, skalbart till 200 %. Tätare radavstånd och vertikal utfyllnad. Svarsknapparnas 44 px tryckytor och befintliga kortnamn bevaras. Rymlig datorvy med fin pekare behåller tidigare rubrikstorlek.


## Säkerhetsservice Översikt v2.4.530

Endast rubriken ”Översikt” visas i panelhuvudet. Kompakt skala: 18 px panelrubrik, 14 px objektrubrik/filterfält, 12 px etiketter/brödtext och 11 px statusmärken. Avstånd minskas; redigerbara fält är minst 16 px vid fokus på pekskärm. Textförstoring till 200 % bevaras och filtren går i en kolumn vid stor text.

## Säkerhetsservices ritverktyg v2.4.543

På användarens beställning får ritningen separata 90°-knappar åt vänster och höger, med gemensam vinkelvisning. Verktygsfält och ritverktygsmeny använder enhetliga 22 px linjeikoner. Menyn visar verktygsnamn i två kolumner, en vid stor text, och kan rullas inom skärmen. Tryckytorna är minst 44 px. Presentationen ligger i `security-toolbar-v543.css/js` och aktiveras endast i Säkerhetsservice; andra områdens ursprungliga SVG:er återställs.

Verifierat i isolerad Chromium-vy med syntetisk tvåsidig PDF: rotation åt båda håll, snabba tryck, avbruten omritning, inbyggd PDF-rotation, oförändrade objektdata, export och återöppning samt scanner- och ritverktygsval. Layout kontrollerad vid 1280, 900, 768, 390 och 320 px, manuella enhetsval, ljust/mörkt tema och 200 % text. Ingen fysisk iOS-enhet eller TestFlight-build verifierad. Testfixturen finns i `tests/security-toolbar-browser.js` och laddas inte av produktionssidorna.

## Löpande manuell numrering i Säkerhetsservice v2.4.544

Användaren beställde +1/−1 vid manuell placering. Välj Ett objekt, Uppåt eller Nedåt. Första rutan får befintliga storleks- och flyttverktyg; efter Klar räcker ett klick per nytt protokoll. Nästa nummer kan ändras och riktningen växlas. Prefix och inledande nollor behålls, och nedräkning stannar vid noll. Avsluta, byte till annan vy eller ny fil lämnar placeringsläget. Skapade objekt sparas som vanliga separata protokoll med egna positioner. Serien är tillfällig och återupptas inte automatiskt när filen öppnas.

UI ligger i `security-manual-sequence-v544.css`; kontrollernas tryckytor är minst 44 px, med teman och befintlig textskala. Verifierat med lokal syntetisk PDF i Chromium: prefix, båda riktningar, rättat nästa nummer, ångra/gör om, upprepade nummer på skilda positioner, samma storlek över zoom/rotation/sidbyte, export/återöppning och fri text för Ett objekt. Tidigare manuella storlekstester går igenom. Kontrollerat dator, surfplatta, 390/320 px telefon, smalt datorfönster, manuella enhetsval samt 200 % text i ljust/mörkt tema. Ingen fysisk iOS- eller TestFlight-verifiering. Tester: `tests/security-manual-numbering.cjs` och `tests/security-manual-sequence-browser.js`.

## Flytta under löpande placering v2.4.545

Rutorna i den aktiva manuella nummerserien kan dras direkt även efter första rutans Klar. Befintliga objekt utanför serien behåller sitt vanliga beteende. Dragning ändrar endast positionen, behåller nästa nummer inklusive egna nummerhopp och stängs när serien avslutas. Samma hantering av avbruten dragning och tvåfingerszoom används som i storleksläget.

Verifierat i isolerad Chromium-vy med syntetiska mus-/beröringshändelser vid 0/90/180/270°, zoom, separata ångra/gör om, avbrott, tvåfingerszoom och PDF-export/återöppning. Faktisk musdragning i dator- och 390 px telefonvy kontrollerad, samt tidigare numrerings- och layouttester. Ingen fysisk iOS-verifiering. Regression: `tests/security-sequence-drag-browser.js`.

## Kompakt Lägg till manuellt på dator v2.4.546

På användarens beställning får endast `#detectorManualForm` i Kontrollflödets Säkerhetsservice en mindre datorstorlek. Vid minst 1100 px, hover och fin pekare används 13 px etiketter, 15 px inmatning/listval och 14 px knapptext. Fält och knapp har 38 px minsta höjd, normal texttjocklek i fälten och nollställda etikettmarginaler för jämn nederkant. Detta är ett avgränsat undantag från grundskalans 14/18/44 px.

Alla textmått använder rem och befintlig `--cf-text-scale`; automatisk höjd och radbrytning bevaras. Manuellt telefon-/surfplatteval undantas. Mindre fönster, pekläge, nummerseriens fortsättningsrad, andra paneler och fristående `security.html` omfattas inte. Formulärets dolda läge, fokusmarkeringar, validering, numreringslogik, placering och PDF-data ändras inte.

Verifierat genom oberoende kodgranskning av CSS-lager, selektorer, enhetsvillkor, skaluttryck och dold hantering, befintligt numreringstest samt versions-/resurskontroll. Inloggad produktionsvy och visuell webbläsarkontroll kunde inte genomföras i denna miljö; fysisk iOS/Safari/TestFlight har inte testats.

## Enhetsanpassat Kontrollflöde v2.4.547

Användaren beställde uttryckligen granskning och anpassning av den riktiga appens Kontrollflöde för telefon, iPad och dator. Ändringen är avgränsad till befintliga vyers CSS och versions-/resurskopplingar.

Områdes- och checklistväljaren får en mellanlayout för surfplatta från 700 px, medan uttryckligt telefonval behåller den kompakta valrutan. Upprepad områdesrubrik tas bort i checkliststeget. Fotens länkar och fortsättningsknapp använder enhetlig skalbar 14 px text, 20 px ikoner och minst 44 px tryckyta; den primära knappen får egen rad i kompakt läge. Datorvyn behåller sin breda kortlayout. Långa rubriker radbryts. Valrutan går att rulla vid stor text och låg fönsterhöjd, medan revisionsmodulens inlinepanel behåller sin ordinarie rullning.

Revisionsmodulens översiktssiffror, förklaringar, tillbaka-knapp och serviceöversiktens verktyg följer befintlig textskala. Statistikkorten får färre kolumner vid mindre utrymme och stor text. Projektformuläret får etiketter ovanför fälten och en kolumn vid högst 800 px, stort textläge eller manuellt telefonval. Resultatrubriker och svarskolumner får mer utrymme vid stor text; på smala skärmar används de befintliga kortnamnen med oförändrade fullständiga tillgängliga namn. Övriga normala protokollstorlekar bevaras.

Reglerna ligger i `controlflow-responsive-v547.css` och `controlflow-revision/revision-responsive-v547.css`. Temafärger, ikoner, fokusmarkeringar, A+/A−, formulärvärden, objektnumrering, ritningskoordinater och PDF-funktioner ändras inte. Det avgränsade datorundantaget för Lägg till manuellt i v2.4.546 behålls. Båda ingångarnas versionsetikett är v2.4.547 och nya stilmallar ingår i offlinecachen.

Förkontroll gjord i inloggad produktionsvy vid 1363 × 936 CSS-pixlar med appens manuella telefon-/surfplatteval och 100/200 % text. Den visade dubblerad områdesrubrik, smal surfplatteväljare, ojämna fotknappar, trånga projektetiketter samt oskalad statistik och serviceöversiktskontroller. En neutral syntetisk PDF utan kunduppgifter användes. Oberoende statisk granskning av CSS-lager, avgränsningar, dolt läge och resurser samt befintligt numreringstest och `node --check sw.js` är godkända. Visuell uppföljning av den publicerade ändringen är genomförd enligt nedan. Manuellt enhetsval är inte en emulering av skärmbredd; fysisk iPhone/iPad, Safari och TestFlight har inte testats.


### Efterkontroll i publicerad v2.4.547

Båda produktionsingångarna visar v2.4.547 och laddar de nya stilmallarna. Inloggad Chromium-vy vid 1363 × 936 CSS-pixlar bekräftar: datorväljaren är 1020 px med jämna 44 px fotknappar; manuellt telefonläge är 480 px med en checklistkolumn, utan dubblerad områdesrubrik och med fortsättningsknappen på egen rad; manuellt surfplatteläge är 928 px med två checklistkolumner.

Vid uppmätt textskala 2 (200 %) staplas projektets etiketter och fält utan sidledsöverflöde. Översikten visar 40 px siffror och 28 px etiketter/förklaringar i tre kolumner i den breda vyn. Protokollets fulla resultatrubriker får 160 px kolumner; manuellt telefonläge visar de befintliga kortnamnen i tre lika breda kolumner under kontrollpunktsrubriken. Serviceöversiktens verktyg visar 28 px text och minst 44 px höjd. Telefonväljaren i mörkt tema kan rullas till samtliga fotknappar vid 200 %, utan sidledsöverflöde. Vanligt ljust tema och 100 % text kontrollerades också.

Den tidigare v2.4.546-ändringen i Lägg till manuellt bekräftades visuellt och med uppmätta datorvärden: 13 px etiketter, 15 px fält, 14 px knapptext och 38 px höjd. Normal text, automatiskt enhetsval och Nordisk dimblå återställdes efter kontrollen. Den neutrala testritningen innehöll inga kunduppgifter. PDF-export har inte omtestats i denna CSS-ändring; PDF-/datalogik är oförändrad.

Begränsning: appens manuella enhetsval ändrar visningsläge, inte webbläsarens verkliga skärmbredd. Smala skärmar, korta landskapsfönster och deras brytpunkter har granskats i koden men har inte körts i fysisk iPhone/iPad, Safari, TestFlight eller en verkligt smal/emulerad viewport i denna session.

## Enhetligare navigation och projektformulär v2.4.548

Användaren beställde en Product Design-granskning av den riktiga appens Kontrollflöde: enhetliga knappar på telefon, iPad och dator, kortare PDF-text, centrerade rubriker, tydligare områdesval, färre upprepade instruktioner och samma projektstruktur i Säkerhetsservice som i Dörrautomatik. Detta avgränsade undantag gäller de två ordinarie Kontrollflödesingångarna. Andra moduler omfattas inte.

Inloggad förgranskning med sparade skärmbilder visade sex steg: områdesval, checklistval, tom ritningsvy, Projekt i revision, Projekt i Säkerhetsservice och öppnad ritning. Checklistans rubrik låg cirka 58 px till höger om dialogens mitt. Hem/Kundmall/PDF bytte sida när en ritning öppnades. Tomvyn upprepade ritningsinstruktionen, men hade bara en verklig Öppna PDF-knapp. Projektfältens textstorlek var redan densamma; Säkerhetsservice använde tyngre text (650 mot 500 för etiketter och 400 för fält), varierande etikettkolumner, låsta kortrader och dubblerad tom logotypstatus.

`controlflow-navigation-v548.css/js` ger Hem en vänsterplats och Kundmall/PDF en högerplats. Den synliga exporttexten är PDF, med fullständigt tillgängligt namn och tooltip Spara PDF. Kundmall visas som Mall i kompakt läge, med Kundmall som tillgängligt namn. Befintliga ikoner och kontrollnoder behålls. Rubrikdelen centreras på hela bredden; på rymlig dator används symmetriska sidokolumner, i kompakt/stort textläge separata rader. Den sedan tidigare avskalade rubriken över en öppnad ritning behålls. Filåtgärder ligger före Kundmall/PDF i både DOM- och visningsordning.

Områdesväljaren använder Välj ett område för att se checklistorna. Tillbakaknappen heter Alla områden och ligger på egen rad så att checklistans rubrik kan centreras. Den externa Ritningsverktyg-länken tas bort från väljaren; Hem och Fortsätt behålls. Tom ritningsvy visar Välj ritning och en Öppna PDF-knapp. Dubblerad objektrubrik/instruktion döljs där. Laddnings- och felmeddelanden behålls. Väljaren behåller v547:s rullning och undantag för revisionsmodulens inlinepanel.

`controlflow-project-v548.css/js` återanvänder befintliga projektkort och fält. Säkerhetsservice får samma oberoende kolumner Service och Projekt som revision. Etiketter använder vikt 500, inmatning 400, och samma jämna etikettkolumn vid normal bred vy. Vid högst 800 px, telefonval eller stor text staplas kolumnerna och etiketterna placeras ovanför fälten. Dekorativa kortnummer och den dubblerade tomma logotyprutan döljs. Fältnamn, lagrade värden, företagssynk, signaturfunktioner och databetydelser bevaras, inklusive skillnaden mellan Avtalsnummer i Säkerhetsservice och AO-nummer i revision.

`controlflow-zoom-menu-v548.css/js` flyttar de tre befintliga PDF-zoomkontrollerna till Zooma ritningen under Ritverktyg. Noder, ID:n och befintliga lyssnare behålls; den gamla tomma wrappern ligger kvar som ankare åt tidigare arbetsytekod. Procent och minus/plus tar inte längre permanent plats i ritningsraden. Menyn behåller tangentbordsåtkomliga knappar med minst 44 px tryckyta. Nyp-/mushjulszoom, A+/A− för gränssnittstext, sidbyte och ritningsgeometri ändras inte.

Förkontroll: oberoende kodgranskning av DOM-flyttar, menyåterställning, CSS-prioritet, dolda lägen, textskalning, smala brytpunkter och bevarade fält/ID:n. Nya JavaScript-filer och service worker klarar syntaxkontroll. Båda HTML-ingångarna saknar dubbla ID:n och laddar samtliga sex nya resurser i rätt ordning; resurserna ingår i offlinecachen. v546:s avgränsade manuella datorformulär och v547:s övriga förbättringar behålls.

Visuell efterkontroll av publicerad v548 redovisas nedan. Förgranskningen gjordes vid 1363 × 936 CSS-pixlar. Manuellt telefon-/surfplatteval emulerar inte verklig skärmbredd; fysisk iPhone/iPad, Safari, TestFlight och fysisk nypzoom har inte verifierats i denna session.

### Visuell förfining under efterkontrollen

Första inloggade efterkontrollen bekräftade centrerad områdes-/checklistrubrik (både rubrikens och dialogens mitt 681,5 px), fungerande Alla områden med återställt fokus, en ritningsinstruktion, Hem till vänster/PDF till höger även efter PDF-öppning och samtliga 21 befintliga projektfält med oförändrade namn/typer/värden i Säkerhetsservice. Zoomknapparna fungerar i båda menyerna: 100 → 125 → 100 %, inklusive aktivering av minus med Enter. Den förkortade PDF-knappen öppnar befintlig sparningsdialog i båda modulerna och Kundmall öppnar revisionsmodulens förhandsvisning.

Bildkontrollen upptäckte två små presentationsdetaljer som förfinas i samma version: etikettkolumnen är nu 9 rem gånger textskalan (144 px vid 100 %) så att Anläggningsnummer inte lämnar en ensam bokstav på nästa rad. Revisionsmenyns befintliga knapp Ändra serviceöversikt får full menyradsbredd och automatisk höjd. Den tidigare 44 px breda ikonregeln klippte knappens text. Båda reglerna är avgränsade till Kontrollflödet; smal/stor projektlayout och dolda verktyg behåller sina undantag. De två stilmallarnas resursfråga och offlinecache uppdateras till r2. Slutlig visuell kontroll dokumenteras efter publicering.

### Efterkontroll i publicerad v2.4.548

Båda ingångarna visar v2.4.548 och laddar de sex nya resurserna. GitHub Pages-publiceringarna är godkända och den inloggade produktionsvyn har kontrollerats. Skärmbilder före/efter har granskats för områdesval, checklistval, tom ritningsvy, båda projektformulären, ritningsytan och verktygsmenyerna.

Områdes-/checklistväljaren har centrerad rubrik, Alla områden på egen rad och två fotåtgärder. Den externa Ritningsverktyg-länken är borta. Tillbaka återställer fokus till det öppnade området; Fortsätt är inaktiv tills en checklista valts. Hem ligger till vänster och PDF till höger före/efter PDF-öppning och i projektvyn. De synliga kortnamnen PDF/Mall behåller fullständiga tillgängliga namn. Initial ritningsvy har en Välj ritning-rubrik och en fungerande Öppna PDF-åtgärd.

I normal datorvy använder båda projektformulären 14 px etiketter med vikt 500 och 18 px fält med vikt 400. Etikettkolumnen är 144 px vid 100 % och Anläggningsnummer ryms på en rad. I manuellt surfplatteläge är motsvarande fält 16 px; båda modulernas kolumner och fältstart är lika. De två projektkolumnerna fungerar oberoende av varandras kortlängd. Samtliga 21 befintliga fält/filkontroller i Säkerhetsservice behöll ID, typ, etikett och ursprungligt värde vid jämförelsen. Ett neutralt anläggningsnamn kunde redigeras, behölls över vybyte och återställdes därefter. Avtalsnummer/AO-nummer och andra avsiktliga innehållsskillnader mellan modulerna bevaras. Den dubbla tomma logotyprutan är dold.

Vid uppmätt textskala 2, manuellt telefonläge och Midnattsblå staplas projektkolumner samt etiketter/fält utan sidledsöverflöde. Projektfältens text är 32 px. Checklistdialogen är 480 px inklusive ram/rullist, kan rullas inom 760 px höjd och saknar sidledsöverflöde. Tangentbordsnavigering når Hem och Fortsätt; Fortsätt hamnar synligt inom viewporten. Grundläget i ljust tema samt manuellt surfplatteläge har också bildgranskats.

En neutral PDF utan kunduppgifter kunde öppnas i båda modulerna. PDF-zoom finns endast i ritverktygsmenyn när menyn är öppen, med 44 × 44 px knappar. Befintliga minus/plus ändrar 100 → 125 → 100 % i båda modulerna; minus fungerade även med Enter. Sidkontroller, A+/A− och övriga verktyg finns kvar. Den korta PDF-knappen öppnar befintlig sparningsdialog i båda modulerna, och Kundmall öppnar revisionsdelens förhandsvisning. Själva exporten till fil och återöppning av en ny export har inte omtestats i denna presentationsändring.

Mörkerkontrollen hittade revisionsmenyns äldre vita bakgrund. Den använder nu samma befintliga temafärger som resten av appen: i Midnattsblå uppmättes bakgrund rgb(21, 43, 62) och zoomtext/procent rgb(229, 238, 245), utan sidledsöverflöde. Menyns dolda läge, placering och funktioner bevaras. Serviceöversiktsknappen ryms nu på en hel menyrad, även med 200 % text. Detta är resurs-/cacheförfining r3.

Den sista textförfiningen r4 normaliserar endast upprepad inledande Ritningen är klar. i #securityMessage. Meddelanden markerade som fel och all efterföljande text bevaras. Oberoende kodgranskning, syntaxkontroll och åtta direkta fall för den faktiska normaliseringsfunktionen är godkända, inklusive laddning/fel, en/två/tre upprepningar, upprepning senare i texten och konvergens. Inloggad uppföljning efter godkänd publicering bekräftar nu exakt Ritningen är klar. Börja markera valda protokoll. efter PDF-öppning. Laddar ritning… visades normalt under öppningen. Båda ingångarna laddar navigationens r4-resurs. Den slutliga funktionsändringen är commit 70499f140a9578b46dea01d7991a270fcba3ca5b, publicerad med godkänt Pages-jobb 41357387586.

Kontrollerna gjordes i Chromium vid 1363 × 936 CSS-pixlar. Manuella enhetsval ändrar appens presentationsläge och emulerar inte faktisk skärmbredd. Smala 320/390 px-brytpunkter och korta landskapsfönster har granskats i koden; de har inte körts i en verkligt smal/emulerad viewport här. Fysisk iPhone/iPad, Safari, TestFlight och fysisk nypzoom har inte provats. Ingen fullständig tillgänglighetscertifiering eller offlineprovning påstås. Automatiskt enhetsval, Nordisk dimblå och 100 % text har återställts efter kontrollerna.


## Kompakta protokoll och enhetliga stämpelmått v2.4.549

Efter granskningen beställde användaren uttryckligen kodning i den riktiga appen. Det avgränsade undantaget ger Säkerhetsservice och revision Dörrautomatik/Lås mindre metadatarubriker, en gemensam högerställd kontrollräknare och Godkänn alla, Protokollverktyg samt mindre synliga svarsknappar med minst 44 px tryckyta. Kortare rubriker, teman, textförstoring och radbrytning bevaras. Originalknappar och deras funktioner återanvänds; Brand återställs till sin tidigare presentation.

Säkerhetsservice får ett uttryckligt markeringsläge med tillfälligt urval och låsning av stämpelplacering. Åtgärderna ligger i en kompakt rad som endast visas under markeringsläget. Befintliga svar/anmärkningar ersätts inte av Godkänn otestade. Stämplar på ritningen och i Kundmall/PDF använder samma dokumentmått; UI-textskalan ändrar inte dessa mått. Äldre explicit valda storlekar och äldre PDF-standarder bevaras. Beställning, beteenden, tester och begränsningar finns i CONTROLFLOW_549.md.


### Efterkontroll v2.4.549

Båda publicerade flödena har kontrollerats med neutral testritning i inloggad Chromium-vy. Kompakt protokoll, meny, avbockning, anmärkningsutkast, storleksarv, val/låsning, gruppåtgärder och Ångra samt riktig PDF-export/återöppning är verifierade. Den visuella kontrollen rättade en konflikt med äldre content:none!important så att 32 px svarsknappsyta syns inuti 44 px träffyta. Manuellt telefonläge och surfplatteläge, normal/200 % text och ljust/mörkt tema har kontrollerats utan horisontellt formuläröverflöde. Fullständiga observationer, publiceringsreferenser och skillnaden mellan manuellt enhetsläge och verklig skärmbredd finns i CONTROLFLOW_549.md. Fysisk iOS/Safari/TestFlight har inte verifierats.


## Kompakt Översikt, Projekt/service och mörka verktyg v2.4.550

Efter granskningen beställde användaren uttryckligen kodning och publicering. Inom Säkerhetsservice och revision Dörrautomatik/Lås gäller projektets lokala skala 18 px paneltitel, 16 px avdelning, 15 px korttitel och 14 px etikett/stödtext vid normal textskala. Fält behåller läsbar 16/18 px text och minst 44 px tryckyta. Gemensamt inset håller panelpadding och sticky-rubrik i samma läge; scrollbehållare och z-index ändras inte. A−/A+ följer hela det valda temat, inklusive bakgrunden bakom inaktiva knappar.

Översikt använder mindre upprepning i statistiken, separata ID-/typrader och fullbrett sökfält vid telefonbredd, manuellt Telefon eller stor text. Sex statistikkategorier och befintliga funktioner bevaras. Alla nya textmått följer --cf-text-scale. Den gemensamma fyllda pilspetsen används i ritning, Kundmall och PDF utan att ändra valda stämpelstorlekar eller dokumentkoordinater. Detaljer, avgränsningar och verifiering finns i CONTROLFLOW_550.md.


## Stämpelstorlek, låsning och retur v2.4.551

På användarens beställning får Dörrautomatik/checklista revision och Säkerhetsservice ett gemensamt ritningsverktyg **Justera / lås stämplar**. Storlek, pillinje och placeringslås delar urval; låsning har direkta knappar. Stämpeltext och ruta kan vara 25–300 procent med fem procentenheter per knappsteg och direkt procentinmatning. Denna skala avser dokumentets stämplar, inte gränssnittets läsbarhet eller A−/A+. Kundmall och PDF återanvänder samma mått. Nya objekt får tunn pil om inget annat projektval finns; äldre sparade val bevaras. Tillfälliga urval sparas inte. Tryckytor, teman och gränssnittets textförstoring behålls.

Kundprotokollen använder den ljusa textknappen **Tillbaka till ritningen**. Returen går till rätt ursprunglig ritningssida och ett utsnitt runt objekt/etikett med omgivning. Detaljer och verifieringsgränser finns i `CONTROLFLOW_551.md`.


## Appdialoger och urval över hela ritningen v2.4.552

Användarens fortsatta beställning ersätter kontrollpunkternas webbläsarfrågor med flyttbara, temaanpassade appdialoger med OK/Avbryt, återställd fokusordning och fel i samma fönster. Ändra/Ta bort får kompakt 32 px minhöjd och 13 px text på dator med mus/trackpad vid minst 1100 px; textförstoring följs. Telefon/iPad och dialogernas knappar behåller 44 px. Detta är ett lokalt uttryckligt undantag för de beställda datorkontrollerna.

Alla i ritningen omfattar hela den öppna PDF-filens aktiva protokoll över samtliga sidor. Endast denna sida finns som separat val. Storlek, pillinje och placeringslås delar urvalet. Nya stämplar på fysiska A3-sidor eller större börjar på 50 procent och Normal pil när inget eget projektval finns. Sparade storlekar och äldre saknade-värden-profiler bevaras. Manuella numreringsrutor behåller sina egna storleksverktyg; panelen förklarar delmängden vid blandade val. Beställning, avgränsningar och verifiering finns i CONTROLFLOW_552.md.


## Gemensam standardtext på webb och iOS v2.4.557

Användaren beställde uttryckligen att Kontrollflödet i iOS ska använda samma kompakta grundlayout som webbappen. Den avgränsade rättningen gäller `controlflow-ui-scale.js` och återställningskontrollernas tre lokala CSS-regler på de två ordinarie Kontrollflödesingångarna.

När `tillsyno-controlflow-text-level-v1` saknas används 100 procent. `doorservice-ui-text-level` får inte automatiskt förstora hela det nya gränssnittet. Denna regel ersätter endast den äldre migreringsregeln om att ärva större legacy-nivåer i avsnittet Infört först i v2.4.501. Ett uttryckligt sparat val i den moderna nyckeln bevaras, inklusive 136–200 procent. Den äldre nyckeln ändras inte.

Textkontrollerna visar aktuell procent mellan A− och A+; procentknappen återställer till 100 procent. Områdes-/checklistväljaren visar exempelvis **Text 136% · Återställ** endast när textnivån är högre än standard. Vid återkomst via webbläsarhistorik/BFCache och relevanta storage-händelser läses den moderna inställningen på nytt, med bevarat tillfälligt val om lokal lagring inte kunde skrivas.

Grundstorlekar, svarsknapparnas mått, teman, ritningskoordinater, stämpelstorlekar, projektvärden och PDF-layout ändras inte. Återställningen gäller gränssnittstext; ritningszoom och dokumentets stämplar har egna inställningar. Verifieringsplan och aktuell status finns i [CONTROLFLOW_TEXT_PARITY_557.md](CONTROLFLOW_TEXT_PARITY_557.md). Fysisk iPhone/iPad, Safari och TestFlight har inte verifierats för denna ändring.

## Kompakt administration v2.4.577

Användarbeslut 7 november 2026: administrationssidan (`auth/admin.html`) görs mer kompakt och anpassas för telefon, iPad och dator. Bara presentationen ändras, i det separata lagret `auth/admin-compact-v577.css`; funktioner, texter i dialoger och färgteman är oförändrade.

- 24/22 px sidrubrik, 16 px panelrubriker, 14 px namn och 12–13 px etiketter. Statistikrutorna är en låg rad (52 px dator, 48 px telefon).
- **Kodlås för moduler** är fällbart och stängt från början; rubriken visar *Av* eller till exempel *2 av 4 på*. Varje modul är en rad med *Kräv kod* och ett eget kodfält (44 px, 16 px text). Etiketten *Ny fyrsiffrig kod* finns kvar för skärmläsare.
- Användarrader: dator = en rad med namn, status och knappar; iPad = namn och status till vänster, knappar till höger; telefon = namn och ⋯-meny överst, status och huvudknapp under. E-postadresser bryts inte mitt i ordet.
- Administratörsloggen visas på en rad per händelse på dator och i två rader på telefon. Versionsnumret ligger i sidfoten, aldrig över innehållet.
- Alla knappar, menyer och kryssrutornas etiketter behåller minst 44 px tryckyta.
- Kontrollerat i Chromium: 320 och 390 px telefon, 820 px iPad och 1440 px dator, ljust och mörkt tema, utan sidledsrullning; sidan är 42–46 % kortare än i v2.4.576. Fysisk iPhone/iPad är inte verifierad.

## Färgteman i hela appen v2.4.578

Användarbeslut 7 november 2026: granska att valt färgtema blir detsamma i hela appen, även i dialoger, menyer och knappar. Granskningen gick igenom alla 18 publicerade sidor i alla sju teman (Isblå, Nordisk dimblå, Havsbris, Sand & blå, Midnattsblå, Grafit, Mörkgrön), med varje dialog öppnad och alla utfällbara delar uppfällda. Arbetsytorna öppnades dessutom med en neutral testritning.

Rättat, bara färger:

- **Projektering** följde inget tema och var alltid grön. Sidan läser nu valt tema på samma sätt som övriga sidor, och lagret `smartmatch-projektering-theme-v578.css` kopplar alla gränssnittsfärger till temats färger. Ritningen, stämplar, stenciler, textanteckningar, PDF-export och projektdata ändras inte. Varnings- och felrutor behåller sin innebörd, med mörka varianter i mörka teman.
- **SmartMatch** (Avläsning, testversion och Version 1.5): fältetiketter som nästan inte syntes i mörka teman (Egenkontroll, Spara projekt, Filnamn, Tid, Uppdatera appen, Kontroll av filer) samt ljusa rutor och vita fält i mörka teman. *Välj logga* hade mörk text på blå knapp i alla teman, och Tid-dialogens totalsumma var vit text på vit botten. Rubrikfälten i Uppdatera appen och Tid följer nu temat i stället för en fast mörkblå färg.
- **CE-märkning**: hjälprutan i Importera CE-mallar.
- **Ritningsverktyg**: granskningen av digitaliserade dörrkort (rubrik och rutan Text som inte förts över) samt hjälptexten i Förbereder sökbar text.
- **Rensa enhetens data** och versionsnumret på inloggningssidan.

De här rättningarna ligger i `tillsyno-theme-fix-v578.css`, som laddas av SmartMatch, CE-märkning, Ritningsverktyg och Rensa enhetens data, aldrig av Kontrollflödet.

Medvetet oförändrat: den neutrala grå ytan runt PDF-sidan i Kontrollflödet, kundmallens förhandsvisning och SmartMatch-protokollet är samma i alla teman, så att ritningens vita papper syns likadant. Godkänn-knappens gröna färg och de gula stämplarna har en egen betydelse. Startsidans gamla Dörrservice-dialoger går inte att nå från appen. Temats grå hjälptext har i de ljusa temana kontrasten 3,7–3,9:1 i hela appen; att ändra den kräver ändring i den gemensamma temafilen och därmed upplåsning av Kontrollflödet.

Kontrollflödet granskades också, i alla teman, och följer temat. Inga Kontrollflödesfiler ändrades. Kontrollerat i Chromium på dator (1280 px) och för Projektering även 390 px telefon; inga nya körfel. Fysisk iPhone/iPad är inte verifierad.

## Inbjudan och uppdateringsruta v2.4.579

Användarbeslut 7 november 2026:

- **Bjud in användare** (administrationen): knapp i användarlistans rubrik, dialog med e-post, namn, moduler, licenstid och val mellan *E-post från Tillsyno* och *Personlig länk*. Resultatet visas i samma dialog, med länk, *Kopiera länk* och *Öppna i e-post* när länken ska skickas manuellt. Stilar i `auth/admin-invite-v579.css`; 44 px tryckytor och 16 px fält. Kontrollerat i Chromium på 1440, 820, 390 och 320 px i ljusa och mörka teman, utan sidledsrullning. Regler: TILLSYNO_LICENSE_RULES_LOCK.md avsnitt 15.
- **Uppdateringsrutan** på startsidan är ett kort i valt tema med *Senare* och *Uppdatera*. Vid uppdatering visas en förloppsstapel med procent och antal hämtade filer. Den nya service workern rapporterar varje sparad offlinefil, och sidan startar om först när stapeln nått 100 % och den nya versionen är aktiv. Fel visas i kortet med *Försök igen*; inget osparat arbete går förlorat. Rörelser stängs av vid *minska rörelse*. Eftersom rapporteringen finns i den nya versionen syns det verkliga förloppet från uppdateringen efter 2.4.579; den första uppdateringen till 2.4.579 visar den gamla rutan.
- Kontrollerat i Chromium med en simulerad ny version: stapeln steg i jämn takt till 100 % före omstart (dator i dimblå och midnattsblå, 390 px telefon i mörkgrön). `tests/app-update-handoff.cjs` kräver nu att stapeln når 100 % innan sidan byts. Fysisk iPhone/iPad är inte verifierad.

## Sparläge för tunga ritningar v2.4.580

Användarbeslut 7 november 2026 (Kontrollflödet upplåst för denna beställning, se CONTROLFLOW_LOCK.md):

- Kontrollflöde Dörrautomatik känner själv av en tung ritning: minst 30 MB, en bild över 16,7 miljoner pixlar, en sida A1 eller större med minst 2 MB innehåll per sida, eller en sida som tar mer än 1,5 s att rita.
- I sparläge visar sidraden *Sida X / N · Sparläge*. Rutan förklarar läget när man håller över den, och meddelandet börjar med *Stor ritning – visas i sparläge.*
- Sidan ritas en gång med högst 3 miljoner pixlar, och zoom förstorar bilden. Kundmall ritas med högst 4 miljoner pixlar.
- Kan en sida inte ritas visas ett fel i stället för "Ritningen är klar".
- Kontrollerat i Chromium på 390, 820, 1180 och 1440 px. Sidraden får plats på en rad, utan sidledsrullning.
- Stämplar, export och protokoll ändras inte.
- Fysisk iPhone och iPad är inte verifierad.

## Zoom på telefon med tunga ritningar v2.4.581

- En zoom avbryter inte en pågående ritning av samma sida. Ritningen blir klar och visas, och i vanligt läge ritas sidan därefter en gång i den nya storleken.
- Safaris egen sidzoom är avstängd på ritningsytan. Appens tvåfingerzoom och knapparna fungerar som förut.
- På telefon börjar sparläget tidigare än på iPad och dator: vid 15 MB, en bild över 8,4 MP, A2 eller större med minst 1 MB per sida, eller en sida som tar mer än 0,8 s att rita.
- **Laddningsruta:** när en ritning öppnas visas en ruta i valt tema. Den visar *Laddar ritning*, filnamnet, en stapel med procent och vilket steg som pågår:
  - *Kontrollerar arbetsfil och tidigare protokoll*, med sidnummer när äldre PDF:er analyseras;
  - *Öppnar ritningen*;
  - *Ritar sidan*, eller *Ritar sidan i sparläge – en stor ritning kan ta en stund*;
  - *Klart*.
- Stegen är verkliga. Under själva ritandet ger pdf.js inget exakt förlopp, så stapeln rör sig mot slutet av steget utifrån filens storlek. Den når 100 % först när sidan visas.
- Rutan täcker sidan medan ritningen laddas, så ritningen kan inte zoomas under tiden. Vid fel stängs den direkt och felet visas.
- Rutan är 380 px bred, och smalare på telefon med 16 px marginal. Den har inga rörelser vid *minska rörelse*.
- Filer: `controlflow-revision/drawing-load-progress-v581.js` och `.css`.
- Kontrollerat i Chromium på 390 px (dimblå och natt), 820 px (sand) och 1440 px (grafit), utan sidledsrullning.
- Kontrollerat i Chromium med telefoninställning 390×844. Fysisk iPhone är inte verifierad.
