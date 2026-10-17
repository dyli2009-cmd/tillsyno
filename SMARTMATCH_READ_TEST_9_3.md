# SmartMatch – Avläsning TEST 9.3

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-3.html`. Intern version: `36.146-READ-TEST`. Tillsyno-version: `v2.4.370`.

TEST 9.3 skiljer kortets ursprungliga beteckning från den beteckning som ska hittas på ritningen. Du kan också justera läsområden och läsa om ett enskilt kort när dess layout skiljer sig från den gemensamma mallen. [TEST 9.2](smartmatch-read-test-v9-2.html) finns kvar separat.

## Koppla DBL-1 på ritningen till dörrkortet DBL

1. Öppna projekt-PDF:en och visa en ritningssida. Välj **Lägg till kopplingar**, eller **＋ Koppling** i positionsvyn.
2. Under **1. Välj dörrkort**, välj **Dörrkortssida som ska öppnas** och kontrollera förhandsbilden.
3. Kontrollera **Dörrkortets ursprungliga beteckning**, exempelvis **DBL**. När beteckningen redan är avläst behålls den. Finns flera kort på sidan väljer du rätt kort under **Välj dörrkort på sidan**. Saknas en avläst beteckning behöver du kontrollera bilden och själv ange kortets ursprungliga namn.
4. Under **2. Visa vad som ska hittas på ritningen**, tryck **Markera beteckning på ritningen** och markera en hel exempelstämpel.
5. Kontrollera eller rätta **Beteckning på ritningen**, exempelvis **DBL-1**. Detta är ett separat fält; dörrkortet ska fortfarande heta **DBL**.
6. Kontrollera sammanfattningen: **DBL-1 på ritningen → DBL · dörrkort sida …**. Låt färgkravet vara valt om bara text med samma färg ska hittas.
7. Tryck **Sök på ritningen**, granska med **Visa** och avmarkera felaktiga träffar.
8. Tryck **Lägg till valda kopplingar** och kontrollera att ett klick på den nya positionen öppnar rätt dörrkort.
9. Välj **Spara → Spara PDF** för att ta med både beteckningarna och kopplingarna i filen.

Det är en uttrycklig, manuellt bekräftad koppling mellan två beteckningar. Den vanliga textsökningen börjar inte gissa att DBL och DBL-1 är samma kod. Sökningen kräver hela ritningsbeteckningen, med samma hantering av mellanslag, bindestreck och stora/små bokstäver som tidigare.

Flera ritningsbeteckningar kan peka på samma ursprungliga kort utan att döpa om det. Befintliga kopplingar och kontroller ersätts inte. Redan kopplade positioner läggs inte till igen, och en ritningsbeteckning som redan är kopplad till ett annat kort får inte skrivas över genom kompletteringsflödet.

Färgkrav, valfri bildsökning, granskning och tillägg av saknade kort-PDF:er finns kvar. Se [TEST 9.2:s kompletteringsguide](SMARTMATCH_READ_TEST_9_2.md) för dessa steg; i TEST 9.3 väljs dörrkortet först och ritningsbeteckningen anges i sitt eget fält.

## Justera en sida eller ett enskilt kort

Använd detta när en kod eller arbetslista ligger på en annan plats än den gemensamma mallen. Du behöver då inte flytta markeringen för alla kort.

1. Öppna avläsningsdialogen och visa listan med hittade kort eller läsresultat. För färdiga produktlistor kan du gå via **Läs produkterna igen**.
2. Välj **Justera läsområdet** vid kortet som behöver ändras. Appen visar den aktuella sidan och det aktuella kortet.
3. Kontrollera **Markering gäller**: **Bara den här sidan**, eller **Bara detta kort** när flera kort delar sidan. Välj rätt kort i **Kort på sidan**. **Gemensam mall** gäller det vanliga delade läsområdet.
4. Välj **Markera kod** och dra runt kortets hela kod om kodfältet behöver flyttas.
5. Välj **Markera tabell / arbetslista** och markera kortets önskade tabell om arbetslistan behöver flyttas. Ta med **Övrigt / Produkt**, **Monteras av / Mont av** och avsnittsrubrikerna.
6. Tryck **Läs bara detta kort**. Kontrollera den lästa beteckningen och arbetsraderna. Om en tidigare felaktig kod rättas, välj **Sök på ritningen igen** och granska den nya kodens träffar.
7. Välj **Visa gemensam mall** när du vill lämna den lokala justeringen och fortsätta med övriga kort.
8. Slutför granskningen och spara projekt-PDF:en.

Den riktade läsningen återanvänder övriga korts resultat. När beteckningen är oförändrad behålls den befintliga ritningsmatchningen. Om du faktiskt ändrar vilken kod ett kort har behöver den nya matchningen granskas; gamla positioner ska inte tyst få ett annat underlag.

Lokala sid- och kortmarkeringar följer projektet och projekt-PDF:en. De sparas inte som undantag i en generell läsmall för andra filer. GS-urvalet är fortsatt **GS i Monteras av**, och produktvärden visas under kortets avsnitt enligt TEST 9.2.

**Visa gemensam mall** återgår till den gemensamma geometrin i visningen. Det tar inte bort sidans eller kortets sparade undantag.

## Spara PDF efter borttagna sidor

Ritningsverktyget kan redan spara kvarvarande sidor. Ingen ny sparfunktion krävs för detta.

1. Ta bort sidorna du inte vill behålla och kontrollera sidlistan.
2. Tryck **Spara PDF**.
3. Välj **Spara mina sidval och ändringar**.
4. Tryck **Spara PDF** i dialogen och välj var den nya filen ska sparas.
5. Öppna den sparade kopian och kontrollera att rätt sidor finns kvar.

Den vanliga exporten sparar de kvarvarande sidorna utan den separata bildoptimeringens jämförelse. Filen blir ofta mindre när borttagna sidor innehöll stora egna bilder. Delade bilder, typsnitt och andra resurser kan behövas av sidor som finns kvar, så storleksminskningen är inte proportionell mot antalet borttagna sidor. Originalfilen skrivs inte över automatiskt.

## Tidigare projekt och avgränsning

TEST 9.3 har egen lokal lagring. Tidigare testers lokala historik flyttas inte automatiskt. Öppna din senast sparade **projekt-PDF** i TEST 9.3. Finns arbetet bara lokalt i TEST 9.2 behöver du först öppna den versionen och välja **Spara → Spara PDF**. Ett äldre alias kan få ursprunglig kortinformation från ett entydigt, oförändrat källkort. Tvetydiga eller manuellt ändrade äldre kortkopior slås inte ihop genom en gissning.

Detta gäller den separata avläsningstesten. Standardprofilens låsta ID-källa, automatisk DA-koppling, ordinarie SmartMatch, Kontrollflöde, inloggning och licenser ändras inte. Svenska/engelska språkfiler och granskning av osäkra ord behålls. Första avläsningen av tunga bildfiler kan fortfarande ta tid; användarens ej tillgängliga 251 MB-fil och fysisk iPad/Safari eller TestFlight är inte verifierade genom denna webbändring.

## Verifiering

- `node tests/smartmatch-read-extra-main-v9-3.cjs`: godkänt. Ursprunglig kortidentitet och separat ritningsbeteckning följer projektdata. Tvetydiga eller ogiltiga identiteter avvisas före ändringar. Additiva positioner, sparade kontrollsvar, återställning vid fel samt PDF-import med metadata, formulär, stämplar och bilagor kontrolleras.
- `node tests/smartmatch-read-extra-unit-v9-3.cjs`: godkänt. Kontrollerar hela beteckningar, färgavgränsning och avbrytbar bildrendering.
- `SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-extra-browser-v9-3.cjs`, även med `SMARTMATCH_DEVICE=ipad` och `SMARTMATCH_DEVICE=iphone`: godkänt för de tre enhetsvyerna i Chromium. Faktisk mus-/pekmarkering kopplar **DBL-1 → DBL** över två ritningssidor utan att kortets namn eller gamla kontroller ändras. **DBL-DS** och andra färger utesluts; dubbletter och avbrott kontrolleras. Projekt-PDF öppnas direkt utan ny skanning. Datorflödet provar dessutom saknad kort-PDF med manuellt källnamn **NYTT KORT** och ritningsbeteckningen **WC77**; källkortets produktläsning blir tillgänglig även för aliasens arbetslista.
- Tidigare TEST 9:s kodtester, tillfälligt riktade mot 9.3, passerar med sammansatta beteckningar, oförändrade verkliga bokstavsskillnader, kodläge utan tabell och det fullständiga flödet. Det tidigare kodförst-webbläsartestet passerar på dator med fyra kort, tre kopplingar, ingen OCR eller produktläsning i det genererade textunderlagets kodsteg samt separat senare produktläsning.
- TEST 9.2:s grupp-/produktwebbläsartest, tillfälligt riktat mot 9.3, passerar på dator med åtta GS-produkter i fyra grupper, separata kryss för samma produkt i olika avsnitt, omläsning samt PDF-export/direktöppning med bibehållna procent och tider. Migrering av äldre TEST 9.1-radnycklar passerar också.
- `node tests/smartmatch-read-codes-overrides-v9-3.cjs`: godkänt. Sidans egna kod-/tabellrektanglar används vid text- och bildläsning utan att standardområdena ändras för andra sidor. Käll-ID, avgränsning av upprepade kort, riktat resultat/förlopp, rektangelvalidering och avbrott kontrolleras.
- `node tests/smartmatch-read-area-contract-v9-3.cjs`: godkänt. Två separata kort på samma sida får oberoende områden; korrigering av vänstra kortet även utanför dess gamla läsområde ändrar inte det högra. Markering i grannkortets tabell avvisas. Uttryckligt kortval, källalias, dubblettskydd och synkronisering, projektmetadata och skydd mot inaktuella markeringar från en annan PDF ingår. Äldre 9.2-alias kompletteras bara från en entydig oförändrad källa; tvetydiga eller manuellt ändrade kopior lämnas självständiga.
- `node tests/smartmatch-read-areas-browser-v9-3.cjs`: godkänt i Chromium på dator, iPad-vy och telefonvy med faktisk pek-/musmarkering, ett kort per sida. Lokala kod-/tabellområden behåller gemensamma områden; riktad omläsning läser bara det valda kortet utan OCR eller ny ritningssökning i det genererade textunderlaget. Oförändrad beteckning behåller granskade träffar och godkännande. Andra kort, kopplingar, kontroller och tider bevaras. Avbruten omläsning lämnar projektet oförändrat. Sidundantagen följer projekt-PDF och återöppnas direkt utan ny avläsning.
- Det utökade områdeswebbläsartestet passerar också med riktad kodrättning på dator: en sparad felaktig kod korrigeras lokalt på sida 3, **Sök på ritningen igen** söker bara den nya koden **GS24** och behåller tidigare granskade träffar och deras ID:n. Ny kortupptäckt efter områdesändringen behåller tre ursprungliga käll-ID:n. Flera kort på samma sida är verifierade i kontraktstestet ovan; de tre pek-/musflödena använder ett kort per sida.
- Den fasta adressens HTML är identisk med versionssidan, samtliga lokala skript och stilar finns i offlinecachens fillista och tidigare TEST 9.2-snapshots är oförändrade. Syntax- och diffkontroller passerar.

Ritningsverktygets befintliga sidvalsexport har verifierats i enhetstest och Chromium på dator, iPad-vy och telefonvy: sidor 1 och 3 behålls efter att sidan 2 tagits bort, med bibehållen text och synligt innehåll. Ett syntetiskt prov där den borttagna sidan ensam ägde en stor bild minskade från **7 684 304 till 1 480 byte**. Det visar att borttaget eget bildinnehåll kan lämna exporten; det är inte ett storlekslöfte för andra PDF-filer.
