# SmartMatch – Avläsning TEST 9.7

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-7.html`. Intern version: `36.150-READ-TEST`. Tillsyno-version: `v2.4.374`.

Användaren rapporterade att en PDF sparad med **Spara PDF i SmartMatch** ändå avvisades av **Öppna PDF** som om färdig avläsning saknades. Den aktuella felande sparade filen har inte bifogats; därför är dess exakta orsak ännu inte bekräftad. Däremot reproducerades ett sparfel i den tidigare versionens riktiga webbläsarflöde: exportera projekt A, stäng det och öppna projekt B i samma flik. B:s export kunde återanvända A:s verifierade bytes eftersom exportcachen bara var knuten till ett revisionsnummer som överlevde projektbytet.

## Rättningar

- Exportcache och pågående exportjobb hör till projektets generation, ursprungliga byteobjekt, arbets-ID och ändringsrevision. Byte eller stängning ogiltigförklarar tidigare jobb. En försenad A-export kan inte ersätta B:s fil eller kontrollbesked.
- Både skapande och kontroll av projekt-PDF kräver en giltig granskad avläsning. Null eller saknade avläsningsdata kan inte ge en godkänd export eller öppna en sparruta.
- Samma avkodare används vid förkontroll, öppning och exportkontroll. PDF-referenser löses upp innan text läses. Unicode-strängar och tidigare hexkodad UTF-16-lagring stöds. Om den nyare nyckeln inte går att avkoda kan en läsbar kompatibilitetsnyckel användas. En nyare **läsbar** projektpost är alltid bestämmande, även om dess avläsning är tom; äldre data får inte tyst återuppväckas.
- Fel vid själva metadatainspektionen skiljs från frånvarande avläsning. Inget av felen startar en ny avläsning automatiskt.
- Sparningar som väntar på filväljare eller skrivning får inte ändra nästa projekts filhandtag, status eller sparade ändringsläge. Ändringar som tillkommer under sparningen finns kvar som osparade. Lokala återställningsutkast raderas inte efter extern export, eftersom webbläsarens käll-PDF fortfarande kan vara originalet.
- Separat 9.7-lagring kopierar vid behov 9.6:s lokala arkiv med arbetsutkast. Ett granskat aktivt 9.6-utkast med matchande källfil kan också erbjudas som lokalt projekt. Källversionen ändras inte och externa PDF-filer får inte ersättas av lokala utkast utan ett uttryckligt lokalt återställningsval.

## Så går du vidare

1. Öppna den fasta adressen och kontrollera att **Avläsning TEST 9.7** visas.
2. Om arbetet finns under sparade projekt: öppna det där. Kopplingar och arbetslistor ska visas direkt. Behåll den äldre felande filen för felsökning.
3. Välj **Spara → Spara PDF**. Kontrollrutan måste visa rätt antal dörrkort, kopplingar och arbetsrader. Vänta tills **Spara PDF** är tillgänglig och välj sedan plats. På Windows kontrollerar appen den faktiska skrivna filens innehåll innan den säger att sparningen är klar.
4. Välj just den sparade PDF-filen med **Öppna PDF**, även på en annan dator. Granskade kopplingar, produkter och kontroller återställs utan ny kodläsning, produktsökning eller OCR.
5. Om den tidigare felande filen fortfarande avvisas: bifoga den sparade kopian för kontroll av vilka projektdata den verkligen innehåller. Saknade data kan inte återskapas ur PDF:en enbart, men kan finnas kvar i det öppna arbetet eller lokal lagring.

**Spara lokalt** behåller arbetet på samma enhet. **Spara PDF** är filen som tar med projektet till en annan dator. Originalbilderna och ritningens kvalitet ändras inte av den här rättningen.

## Verifiering

- `node tests/smartmatch-read-project-browser-v9-7.cjs`: olika projekt i samma flik, försenad äldre export, återöppning i ren webbläsare, olika giltiga PDF-lagringsformer, skydd mot tom avläsning och återhämtning från 9.6.
- `node tests/smartmatch-read-save-v9-7.cjs`: icke-tom fil före skrivning, avbryt vid skrivfel, jämför faktiskt diskresultat i begränsade block; alla tre sparvägar testas med projektbyte och nytillkomna ändringar före och under skrivning.
- Befintliga tester av svenska textfragment, produktkontroller och portabel PDF körs mot nya sidan. Kundens tidigare uppladdade original används separat för kontroll av läsning → export → ren återöppning; kunddata läggs inte i Git.

Faktiska resultat: det nya webbläsartestets tio grupper passerar. Sparningens tester passerar för alla tre filvägar. Den befintliga Unicode-/produkt-/PDF-testsviten passerar på den nya sidan vid dator-, iPad- och iPhone-storlek. Kundens tidigare uppladdade skoloriginal ger 7 kort, 35 kopplingar och 63 arbetsrader; exporterad PDF på 136 575 byte öppnas i ren webbläsare med 0 nya avläsningar, produktläsningar, OCR-arbetare och granskningsguider. Detta är provresultat, inga inbyggda sidantal eller koder.

Tidigare TEST 9.6 och äldre snapshots behålls. Beta 10, ordinarie SmartMatch, DA-koppling, GS-regler, Ritningsverktygets funktioner, Kontrollflöde och auth ändras inte. Ingen fysisk iOS-enhet eller ny TestFlight-build verifieras här.
