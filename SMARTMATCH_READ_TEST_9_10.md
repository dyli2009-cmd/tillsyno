# SmartMatch – Avläsning TEST 9.10

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-10.html`. Intern version: `36.153-READ-TEST`. Tillsyno-version: `v2.4.377`.

Användaren vill förbereda nya handlingar en gång och sedan arbeta med de sparade kopplingarna. TEST 9.10 delar därför ingången i förberedelse och öppning av ett färdigt projekt inom samma separata testyta. Äldre testversioner behålls.

## Första gången med en ny PDF

1. Välj **Förbered ny PDF**. Välj ritningen och dörrkorten från en eller flera PDF-filer.
2. Markera beslagskoden på ett exempelkort och läs korten. Markera en exempelstämpel vid behov. Välj söksätt uttryckligen; bildläsning är fortfarande ett separat, långsammare alternativ.
3. Granska träffarna. Rätta kopplingar eller lägg olösta kort åt sidan för senare kontroll. Kortets ursprungliga beteckning och den valda ritningsbeteckningen kan skilja sig enligt den sparade manuella kopplingen.
4. Läs produkterna när du vill använda GS-kontrollpunkterna. Redan avlästa produkter återanvänds. Montagekolumnen är fortsatt ansvarskälla; ingen ny GS-regel införs.
5. Välj **Spara → Spara PDF**. Använd den nya projekt-PDF:en nästa gång eller på en annan dator. En lokal säkerhetskopia är skild från denna överförbara PDF.

## Nästa gång

1. Välj **Öppna färdigt projekt** och den sparade projekt-PDF:en.
2. Appen läser projektinformationen och visar ritningen med sparade positioner, kort, produkter och arbete. Ingen ny textavläsning, bildläsning eller ritningssökning ska starta.
3. Arbeta med kontrollpunkterna och spara PDF igen när arbetet ska följa med till en annan dator.
4. Välj **Ändra förberedelse** endast när du vill justera läsområden eller kopplingar. Återstående kort och produkter har egna uttryckliga fortsättningsval.

En rå PDF utan färdig projektinformation får ett tydligt fel i öppningsläget. Appen växlar inte själv till avläsning. Delvis färdiga projekt får öppnas med de granskade kopplingarna och det sparade antalet kort för senare kontroll.

## Återöppning och prestanda

En färdig PDF måste fortfarande läsas från disk, dess sparade data valideras och den synliga ritningen ritas. En tung sida kan därför fortfarande ta tid och minne. Förbättringen ska undvika dubbla fil-/PDF-tolkningar och onödig genomgång av alla PDF-sidor; den ersätter inte ritningen med en bild i låg kvalitet och lovar ingen bestämd öppningstid.

Samma validerade fil används genom förkontroll och öppning. Tillfälligt återanvända PDF-objekt tillhör exakt den valda filen och får inte användas till en annan fil eller ett senare försök. Sparade data är auktoritativa vid extern öppning. Lokal återställning är fortfarande ett uttryckligt val. Synligt exporterade framstegsstämplar och noteringar rensas bara ur visningskopian, så att redigerbara överlägg inte blir dubbla; originalbytes används fortsatt för export.

## Avgränsning och verifiering

Detta är första steget i den separata Avläsning TEST-serien. Ordinarie SmartMatch och beta 10 har inte fått ett nytt importflöde i den här ändringen. Kompatibilitet med ordinarie SmartMatch ska verifieras innan samma ingång införs där. GS-regeln, DA/SLR-reglerna, Ritningsverktygets funktioner, Kontrollflöde och auth ändras inte.

9.10 använder egen lokal lagring och kan kopiera föregående 9.9-arkiv och tillhörande utkast till en tom ny lagring. Föregående databas ändras inte. Projekt-PDF:er från tidigare läsbara testrevisioner öppnas via den gemensamma metadataläsaren.

Verifierat:

- `node tests/smartmatch-read-open-browser-v9-10.cjs`: dator och iPad; en genererad PDF med 78 sidor och 77 kort, 74 sparade ritningskopplingar, två åsidosatta kort, manuellt ritningsnamn som skiljer från kortets originalnamn och separata GS-bockningar/tidjusteringar. Verklig 9.9-export öppnas i 9.10, sparas och öppnas i ren webbläsare. 0 OCR-arbetare, 0 ritningssökningar, 0 produktavläsningar, 0 PDF-textutvinningar och 0 automatiskt öppnade avläsningsguider. Explicit Ändra förberedelse och avbrytning provas separat.
- Samma dokument öppnades med 2 filinläsningar, 2 PDF-lib-tolkningar och 2 PDF.js-dokument i 9.9. I 9.10 var motsvarande antal 1, 1 och 1. Detta mäter undviket dubbelarbete, inte en utlovad hastighetsfaktor. Äldre synliga statusannoteringar döljs fortfarande bara i visningskopian.
- `node tests/smartmatch-read-restore-safety-v9-10.cjs`: tom/rå/felaktig projektfil bevarar redan öppet arbete; ett fel vid initiering före projektbyte lämnar tidigare PDF och bytes tillsammans; ett senare visningsfel rensar misslyckad arbetsyta så data från två projekt inte blandas. Förkastade tillfälliga PDF-dokument stängs och samtidiga öppningar blockeras.
- `node tests/smartmatch-read-archive-browser-v9-10.cjs`: lokal 9.9→9.10-kopiering bevarar PDF, utkast, bockning och 31 minuter. Källdatabasen ändras inte, befintlig målversion skrivs inte över och en saknad källdatabas skapas inte.
- `node tests/smartmatch-read-project-browser-v9-10.cjs`: tio tidigare portabla projektprov körs mot 9.10, inklusive indirekta metadatareferenser, giltig äldre reservnyckel, nyare uttryckligt null, projektbyte och aktuell 9.9-arkivåterställning.
- `node tests/smartmatch-read-save-v9-10.cjs`: tidigare verifierade spar-/diskkontroller körs mot nya koden, inklusive 0-byte-skydd, misslyckad skrivning, läsning från disk, tre sparvägar och projektbyte medan sparning pågår.
- Tidigare skolprojekt-PDF från 9.7: sju dörrkort och 35 kopplingar återställs med en filinläsning, en tolkning per PDF-bibliotek och utan ny avläsning. Denna fil har redan varit förberedd; det är inte ett nytt OCR-prov på den stora 251 MB-filen.
- Hemvyn provas på dator, iPad och iPhone i Chromium: tydliga startval, 44 px knappar och ingen horisontell överströmning. `SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-partial-browser-v9-10.cjs`, `node tests/smartmatch-read-partial-state-v9-10.cjs` och `SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-work-browser-v9-10.cjs` passerar: partiell granskning, dubblettval, riktad fortsättning, säker produktomläsning, fyra produktgrupper och tidigare bockningar/tider. Äldre testfixturer är oförändrade.

Användarens 251 MB-PDF har inte funnits tillgänglig för prov; ingen öppningstid eller minnesgräns för den filen påstås. Mobil-/iPad-prov görs med webbläsaremulering; ingen fysisk iOS eller TestFlight-build ingår här.
