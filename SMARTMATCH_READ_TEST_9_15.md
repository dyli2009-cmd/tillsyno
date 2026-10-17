# SmartMatch – Avläsning TEST 9.15

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-15.html`. Intern version: `36.158-READ-TEST`. Tillsyno-version: `v2.4.382`.

## Arbeta på iPad

1. Öppna den färdiga projekt-PDF:en från förstasidan. En färdig fil återställer sparade kopplingar, kontrollpunkter och arbete utan ny bildläsning.
2. Öppna **Ritning & dörrkort**. Zooma och panorera som vanligt med två fingrar. Under själva gesten visas den redan laddade översikten; den skarpa detaljen uppdateras när gesten stannar.
3. Om en stämpel saknas, välj **＋ Koppla stämplar**.
4. Markera hela den fysiska stämpeln på den aktuella ritningssidan, inklusive text, färgad bakgrund och kant.
5. Kontrollera ritningsbeteckningen och välj dörrkortet som stämpeln ska öppna.
6. Välj **Koppla bara markerad stämpel**. Detta läser inte igenom övriga ritningssidor och startar ingen OCR för hela ritningen.
7. Kontrollera den enda raden i granskningen. En redan kopplad position kan inte läggas till som dubblett. En tidigare borttagen position kan väljas för återkoppling enligt TEST 9.14.
8. Bekräfta med **Bekräfta kopplingen** och kontrollera att stämpeln öppnar rätt dörrkort.
9. Välj **Spara lokalt nu** som snabb säkerhetskopia. Använd därefter **Spara → Spara PDF** när kopplingen ska följa med till en annan enhet.

Den direkta knappen är avsedd för en känd missad stämpel. Kortets ursprungliga beteckning, produkter, kontrollpunkter, avbockningar och tider behålls. Kopplingen valideras mot ritningssida, kortsida och markerad rektangel innan den sparas.

## Sökning på iPad

**Snabb sökning – PDF-stämplar först** ska användas när text eller sparade stämpeldata finns i PDF:en. Den kräver minst minne.

**Sök även i bilder** är tyngre. På iPad begränsas den till ritningssidan där exempelstämpeln markerades och använder mindre bildrutor och pixelbudgetar. Den söker alltså inte igenom alla stora ritningssidor i samma körning. Byt sida och gör en ny riktad sökning om en annan sida behöver bildläsas. En dator kan fortfarande användas för en avsiktlig sökning genom samtliga sidor.

## Om Safari startade om sidan

Om en öppning avbryts innan den hinner bli klar stoppar TEST 9.15 nästa automatiska återöppning av samma tunga projekt. Förstasidan visar återställningsval i stället. Lokalt sparade projekt ligger kvar; kraschskyddet tömmer inte IndexedDB eller äldre TEST-arkiv.

- Välj **Försök öppna projektet** först när du vill göra ett nytt uttryckligt försök.
- Välj **Välj en annan PDF** för att lämna den tunga filen.
- Öppna `smartmatch-read-test.html?safe=1` om Safari annars återgår direkt till samma problem. Säkerhetsläget hoppar över automatisk projektåterställning men visar fortfarande de lokala projekten.

Efter en normal stängning eller omladdning ska kraschskyddet inte blockera projektet.

## Vad iPad-anpassningen begränsar

- iPad känns igen även när Safari rapporterar datorliknande användaragent eller skärmen är bredare än 1024 pixlar.
- Översikten renderas med en lägre pixelbudget. En separat detaljrendering gör den synliga delen skarp efter zoomning.
- Pinch-zoom samlas till bildrutor i stället för att tvinga en full layout vid varje fingerrörelse.
- Stora sökcanvas, OCR-arbetare och PDF-sidobjekt frigörs efter varje steg.
- En bildsökning har hårda gränser för rasterstorlek, bildruta och antal pixlar så att en inbäddad skärmbild inte får växa fritt i minnet.
- Sparade PDF-stämplars textregister återanvänds utan att hela filen tolkas en gång till. SLR-delen delar samma skrivskyddade källbytes på iPad och håller inte en tredje full PDF-kopia i minnet.
- Bara den aktuella dörrkortssidan hålls avkodad. När ett annat kort öppnas frigörs föregående sidas bild- och operatorcache.

Begränsningarna påverkar hur mycket som renderas samtidigt, inte de sparade ritningskoordinaterna eller projektets kopplingar.

## Verifiering och kvarvarande prov

TEST 9.15 ska kontrolleras med automatiska prov för iPad-identifiering i liggande läge, begränsad bildsökning, direkt koppling av en markerad stämpel och återställning efter en avbruten öppning. Befintliga prov för dubblettskydd, återkoppling, lokal lagring, PDF-export, zoom och öppning av ett färdigt projekt ska också fortsätta gå igenom.

WebKit-emulering kan kontrollera flöde och gränser men kan inte bevisa den faktiska minnesgränsen på användarens iPad. Slutlig validering på en fysisk iPad med Safari återstår därför: öppna den stora kundfilen, zooma upprepade gånger, koppla en missad stämpel, spara lokalt och återöppna projektet.

TEST 9.14 och tidigare snapshots samt deras lokala arkiv finns kvar. Standard-SmartMatch, beta 10, GS-/DA-/SLR-regler, Ritningsverktyget, Kontrollflöde och auth ändras inte.
