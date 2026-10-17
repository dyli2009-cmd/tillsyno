# SmartMatch – Avläsning TEST 9.1

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-1.html`. Intern version: `36.144-READ-TEST`. Tillsyno-version: `v2.4.368`.

Användarbeslut 17 oktober 2026: visa vad avläsningen håller på med, vilken sida eller vilket bildområde som läses, hur långt det aktuella arbetet kommit och hur länge användaren har väntat. Detta gäller den separata SmartMatch-avläsningstesten. TEST 9 finns kvar i `smartmatch-read-test-v9.html`.

## Så använder du statusen

1. Öppna **SmartMatch → Avläsning TEST** och kontrollera att rubriken visar **Avläsning TEST 9.1**.
2. Öppna PDF:en och visa ett dörrkort. Låt **Matcha bara koder – produkter senare** vara valt om du vill börja med kopplingarna.
3. Välj **Markera kod** och dra runt beteckningen. Tryck **Hitta övriga dörrkort**.
4. Följ statusrutan medan korten hittas. Där visas vilket arbetssteg som körs och vilken PDF-sida som behandlas.
5. Kontrollera föreslagna kort och starta kodmatchningen. Statusen följer med genom kortläsning och sökning på ritningen.
6. Granska ritningsträffarna, bekräfta och öppna det kopplade projektet. Välj **Spara → Spara PDF** för att bevara kopplingarna.
7. När du väljer **Fortsätt med produkter** visar samma status vilken arbetslista som läses. Produktsteget behåller de befintliga kopplingarna.

Det tidigare fullständiga flödet och alla tre söksätten finns kvar. Se [TEST 9:s arbetsgång](SMARTMATCH_READ_TEST_V9.md) för markeringar, beteckningar, söksätt och sparade projekt.

## Det betyder uppgifterna

| Uppgift | Betydelse |
| --- | --- |
| Arbetssteg | Exempelvis att hitta kort, läsa koder, läsa arbetslistor, söka PDF-stämplar eller bildläsa ritningen. |
| PDF-sida | Sidnumret i den öppnade PDF:en. Det behöver inte vara samma nummer som är tryckt på ritningen. |
| Kort eller bildområde | Det kort eller den bildyta som behandlas i det aktuella steget. Bildområden är arbetsenheter, inte antal hittade dörrar. |
| Procent och färdiga enheter | Verkliga avslutade arbetsenheter i den aktuella fasen. När ett nytt arbetssteg börjar får det en egen räknare. |
| Bildläsningens procent | OCR-motorns lokala framsteg för bilden som läses just nu. Det är separat från sid-/områdesräknaren. |
| Förfluten tid | Hur länge den pågående körningen har varat. Tidräkningen slutar vid klart, fel eller avbrott. |
| Uppskattad tid kvar | En försiktig uppskattning för den aktuella fasen eller bildsökningen på den aktuella ritningssidan, baserad på verkligt slutförda jämförbara enheter. Den är ingen sluttid för hela projektet. |

Exempel: **PDF-sida 6, bildområde 43 av 325** betyder att ritningens bildytor håller på att läsas. Det betyder inte att 325 dörrar har hittats. Om OCR-procenten under tiden ökar arbetar programmet med den aktuella bilden, även om områdesräknaren ännu står kvar.

I början visas ingen tidsuppskattning. När tillräckligt många enheter i samma arbetssteg har blivit klara kan en uppskattning visas. Den återställs vid byte av fas eller arbetsomfattning, exempelvis när bildsökningen börjar på en annan ritningssida. En större bildyta, fler textobjekt eller en långsammare enhet kan ändra tiden. Vissa PDF-operationer saknar mätbara delsteg; då visas vad som pågår och förfluten tid utan en påhittad procent.

Avbryt med **Avbryt avläsningen** när du vill stoppa det pågående arbetet. Dialogens **Avbryt** finns också kvar. Statusen skiljer mellan färdigt, avbrutet och fel. En försenad OCR-uppdatering från en avslutad körning ska inte starta tidräkningen igen.

## Fortsätt från tidigare TEST 9

TEST 9.1 har egen lokal lagring för testets projekt, läsmallar och markeringar. Tidigare TEST 9:s lokala historik flyttas inte automatiskt. Öppna i stället din senast sparade **projekt-PDF** i TEST 9.1 för att ta med sparade kopplingar och arbetsstatus. Om arbetet bara finns lokalt i TEST 9 behöver du först öppna [TEST 9](smartmatch-read-test-v9.html) och spara det med **Spara → Spara PDF**.

## Avgränsning

Detta gör avläsningen lättare att följa. Det ändrar inte vilka koder som godkänns, vilka sidor eller bildytor som läses, vilket söksätt som valts, hur beteckningar matchas eller vilka GS-arbetsrader som tas med. Det inför inte en ny OCR-motor eller en extern tjänst. Projekt-PDF behåller TEST 9:s arbetssätt; lokal lagring hålls separat enligt testernas versionsregel.

En mindre rättning gör att manuellt angivna kortsidor kan läsas i **Matcha bara koder** även utan tabellmarkering. Tidigare kunde kopiering av den saknade, valfria tabellmarkeringen stoppa läsningen innan den startade. Kodläget kräver fortfarande bara kodmarkeringen.

För stora bildbaserade PDF:er kan själva avläsningen fortfarande ta lång tid. Filens första öppning och PDF-tolkning är separata från avläsningsfaserna. Detta är inte en verifiering av användarens ej tillgängliga 251 MB-fil eller av fysisk iPad/Safari. Ingen native-källkopia eller TestFlight-build finns verifierad för denna webbändring.

## Verifiering

- `node tests/smartmatch-read-progress-v9-1.cjs`: godkänt. Kontrollerar verkliga fasräknare, separat OCR-procent, uppskattning efter observerade enheter, löpande förfluten tid, återställning vid fas-/omfattningsbyte och stopp av timer samt sena uppdateringar vid klart, fel och avbrott.
- `node tests/smartmatch-read-detail-v9-1.cjs`: godkänt. Kontrollerar sidstart före PDF-arbete, valda sidors total, stämpel-/textläsning, bildområden som räknas först efter färdig OCR, separat omfattning per ritningssida, fel/avbrott och oförändrade matchningsresultat.
- `node tests/smartmatch-read-progress-browser-v9-1.cjs`: godkänt i Chromium på dator 1366 × 900, iPad-vy 820 × 1180 och telefonvy 390 × 844, både via versionssidan och den fasta adressen. Ett genererat sjusidigt textunderlag verifierar kortupptäckt, verkligt inmatat manuellt sidval 6–7 utan tabellmarkering, korrekt PDF-sida 6 som första av två valda kort, kodläge utan OCR-/produktläsning, strikt beteckningsmatchning och senare GS-/DT-urval utan ändrade kopplingar. Styrda fördröjningar verifierar förfluten tid, uppskattning, återställd uppskattning vid fasbyte och fryst sluttid. Separata OCR-stubbar kontrollerar lokal OCR-procent, bildområden, hängande OCR, avbrott, sena uppdateringar, fel och nytt försök. Dessa stubbar verifierar statusflödet, inte OCR-kvalitet. Bilder från aktiv progression och OCR i de emulerade vyerna är granskade utan breddöverflöde; inga runtime-fel registrerades.
- TEST 9:s befintliga kodförst-test, tillfälligt riktat mot TEST 9.1: dator- och iPad-flöden är godkända med fyra kort, tre ritningskopplingar och ingen produkt-/bildläsning i det genererade textunderlagets kodsteg. Granskad projekt-PDF med väntande produkter öppnas direkt. Senare GS-läsning bevarar kopplingarna utan ny matchning. Det tidigare fullständiga flödet passerar också.
- Alla lokala skript och stilar som TEST 9.1 laddar finns i offlinecachens fillista och på disk. Syntax- och diffkontroller passerar.

Tidigare versionsfiler för TEST 9 och den ordinarie SmartMatch-logiken är oförändrade. Testunderlag och bilder ligger utanför Git; inga kundhandlingar publiceras.
