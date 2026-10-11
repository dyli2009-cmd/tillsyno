# SmartMatch – samlade och låsta funktionsregler

**Beslut 2026-10-11:** Användaren bekräftar att dörrautomatikflödet i TEST v36.92 fungerar och vill samla, förklara och låsa de viktiga reglerna.

Det här är ingången när vi återupptar utvecklingen eller användaren frågar: **”Hur tänkte vi kring den här funktionen?”** Läs den berörda regeln före ändring. Använd aktuell beslutad regel; äldre versionsanteckningar är historik.

## Gällande regler

| Funktion | Avläsningskälla och koppling | Gällande dokument | Status |
| --- | --- | --- | --- |
| Dörrautomatik | Första placeringsrutans märkning → hela objektnumret söks på ritningssidorna → egen knapp per träff → pil till närmaste GS på samma sida | [Dörrautomatik och GS-koppling](SMARTMATCH_AUTOMATION_RULE_LOCK.md) | LÅST; v36.92 bekräftad av användaren |
| Dörrkort | Identifiera tabellen → läs ID i översta vänstra cellen → matcha samma hela ID på ritningen → koppla kortet till positionen | [Tabellavläsning och dörrkort](SMARTMATCH_TABLE_RULE_LOCK.md) | LÅST; generell tolkning av alla tabellupplägg är ännu inte färdig |

## Två kopplingar som bygger på varandra

**Tabellunderlaget kommer först:** För ett nytt eller oprövat dörrkortsupplägg lägger användaren in ett exempel på tabellen. Vi läser och kontrollerar hur den är byggd, vilka celler som finns och var översta vänstra ID-rutan ligger. Därefter verifieras avläsningen och matchningen. Redan verifierade upplägg kan återanvändas; automatisk inlärning av nya mallar är inte byggd.

**Dörrkort → ritningsposition:** Kortets ID, till exempel GS10 eller 140 C, bestämmer vilken beteckning som ska hittas på ritningen. Hela beteckningen matchas; mellanslag kan normaliseras, men ID 1 får inte matcha en del av 11.

**Dörrautomatik → GS-position:** Automatikens objektnummer och maskintyp kommer från dess märkning på ritningen. Varje funnen automatik får en knapp och en pil mot närmaste GS på samma sida. Den GS-positionen kan redan vara kopplad till sitt dörrkort genom den första regeln.

Dörrkortets utrustningsrad är inte en spärr för automatikens närmaste-GS-pil. Saknat eller oläsbart kort hindrar inte att en läsbar automatik hittas och får en knapp.

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

## Utveckling och fortsatt arbete

[DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) anger arbetsområden, isolering och versionsregler. [Fortsättningsdokumentet](SMARTMATCH_FORTSATTNING_2026-10-10.md) innehåller status och tidigare arbetspass. [TEST v36.92](SMARTMATCH_TEST_V36_92.md) redovisar implementation och verifiering av det godkända automatikflödet.

Denna dokumentationsändring ändrar inte appkoden och höjer inte TEST-versionen. Låset är en dokumenterad utvecklingsregel, inte en teknisk spärr i GitHub.
