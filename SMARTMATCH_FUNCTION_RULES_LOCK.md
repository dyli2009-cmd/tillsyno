# SmartMatch – samlade och låsta funktionsregler

**Beslut 2026-10-11:** Användaren bekräftade v36.92:s objektsökning. Senare samma dag begärde användaren återställning av dörrkortskontroll och endast en GS-pil per fysisk automatik. Gällande regel är v36.97; v36.92:s närmaste-GS-utan-kort gäller inte längre.

Det här är ingången när vi återupptar utvecklingen eller användaren frågar: **”Hur tänkte vi kring den här funktionen?”** Läs den berörda regeln före ändring. Använd aktuell beslutad regel; äldre versionsanteckningar är historik.

## Gällande regler

| Funktion | Avläsningskälla och koppling | Gällande dokument | Status |
| --- | --- | --- | --- |
| Dörrautomatik | Placering → hela objektnumret → egen knapp per fysisk automatik → läs kopplat GS-dörrkort → en pil till närmaste rätta GS på samma sida | [Dörrautomatik och GS-koppling](SMARTMATCH_AUTOMATION_RULE_LOCK.md) | LÅST; v36.97 ersätter v36.92:s fria närmaste-koppling |
| Dörrkort, standardprofil | Identifiera tabellen → läs ID i översta vänstra cellen → matcha samma hela ID på ritningen → koppla kortet till positionen | [Tabellavläsning och dörrkort](SMARTMATCH_TABLE_RULE_LOCK.md) | LÅST; generell tolkning av alla tabellupplägg är ännu inte färdig |
| Dörrkort, separat känt tillägg | Uttrycklig korttitel → verifierad Objekt-rad och Komponent/Produkt-tabell → samma hela ID på ritningen | [Tabellavläsning, avsnitt 8](SMARTMATCH_TABLE_RULE_LOCK.md) | Tillägg enligt användarbeslut; v36.95 |
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


## ED100/ED250 och ID100/ID250 – TEST v36.98

Undantaget gäller endast GS-valets maskintyp, i båda riktningar: 24 (ED100/ID100) och 37 (ED250/ID250). `ID250` och `ID 250` läses uttryckligen som typ 37. Fullständiga ID ska behålla samma objekt och sista nummer; originaltyp, kontroller och SLR ändras inte. Se [TEST v36.98](SMARTMATCH_TEST_V36_98.md). Föregående v36.97 är historik och återgångssnapshot.

## Protokollsexport utan ritning – TEST v36.96

Användaren vill ta bort Ta med ritning och GS-länkar från Spara → Protokoll. Exporten ska bara innehålla valda protokoll. Godkända protokoll är förvalda enligt det befintliga urvalet; urvalsfilter och kontrollstatus ändras inte. Både ett och flera valda protokoll ger bara sina protokollsidor. Detta är skilt från att spara själva projektet med ritningen. Se [TEST v36.96](SMARTMATCH_TEST_V36_96.md).
