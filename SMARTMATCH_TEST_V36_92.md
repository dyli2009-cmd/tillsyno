# SmartMatch TEST v36.92 – placering, hela objektet och närmaste GS

Användarens nya instruktion ersätter tidigare DA-pilkrav: placera den första märkningen via Verktyg → Koppla dörrautomatik, läs objektnummer/maskintyp/antal från märkningen, sök samma hela objektnummer på alla ritningssidor och skapa en egenkontroll-/SLR-knapp på varje träff. Pilen går till närmaste fysiska GS på samma sida. Dörrkortets automatikrad, modell, ID, förekomst eller tidigare en-till-en-krav filtrerar inte denna geometriska koppling. Därför kan flera märkningar peka mot samma GS. Exakt avståndslika skilda GS kräver manuellt val; saknad GS ger fortfarande en DA-knapp utan pil. Närhet är inte ett bevis på att dörrkortets utrustning stämmer; vald GS kan ändras manuellt.

Exempel: `20-83-92-3-24-10` → objekt `20-83-92-3`, maskintyp `24` (Dorma ED 100), antal `10`. Antalet bindestreck i objektet är inte låst. Maskintyp och sista nummer läses för varje träff, inte kopieras från första märkningen. Hela objektet matchas; ett annat objekt som innehåller samma siffror godtas inte.

När placeringsrutan sparas läses PDF-text och annotationer i rutan. En entydig läsbar märkning används, även om operatörens exempel skiljer sig. Flera märkningar i rutan stoppar placeringen med ett konkret fel. Om rutan saknar läsbart ID används den uttryckligt angivna märkningen och detta anges i status. Därefter startar sökningen automatiskt. Textfragment följer sin baslinje och riktning, inklusive lodrätt text, och sammanfogas bara inom lokala textgrupper. Annotationer läses i samtliga Contents/Subj/T-fält.

## Reproducerad orsak i den faktiska sidan

Den fullständiga v36.91/92-sidans indexering klassade ritningssidor som dörrkort, bland annat via tabell-/hårdvaruord och ritningsstämpelns namn. DA-skannern uteslöt dessa sidor i både text och annotationer. Tidigare isolerade tester hade en förberedd lista med kortsidor 11–25 och reproducerade därför inte felet. Nu ger rumsligt separerade explicita GS-annotationer, eller GS + automatikannotation, stöd för ritningssida. En ritningsstämpel med SKALA, ritningsadministration och skalförhållande ger också stöd. Dessa sidor tas inte in i dörrkortsindexet. DA-sökningen har dessutom skydd mot en felaktig kortklassning av en sida som redan har fysiska GS-positioner.

Den låsta översta-vänstra-cell-regeln ändras inte. På Snidaren är nu enbart sidor 11–25 kort: alla 15 korrekta ID:n, ingen falsk STARK-post och inga ritningssidor i kortlistan.

## Sparat arbete och verifiering

Placering på en redan befintlig fysisk märkning återanvänder posten och dess kontroller. Upprepad sökning skapar inte nya dubletter. Obekräftade äldre pilar får den nya närmaste-GS-kopplingen; uttryckligt bekräftade kopplingar och frånkopplingar bevaras. Redan sparade dublettkontroller raderas inte automatiskt. Snidaren-filen innehåller sedan tidigare två självständiga poster för första märkningen; dess 18 sparade poster och ifyllda uppgifter behålls, medan sökningen redovisar 17 fysiska märkningar.

Verifiering från repo-roten:

- `node tests/smartmatch-da-placement-v36-92.cjs`: faktiska entry-resurser, märkning 1–14, annat objekt, flera bindestreck, typ per träff, delade/lodräta textfragment, alla sidor, kortsidor, närmaste GS utan kortkrav, upprepning och bevarade manuella val.
- Samma test med Snidaren-PDF som extra CLI-argument: 17 märkningar och 17 närmaste-GS-pilar i kontrollerad modulmiljö.
- `node tests/smartmatch-da-browser-v36-92.cjs <lokal Snidaren-PDF>` med Playwright/Chromium: den riktiga fasta HTML-sidan, dess faktiska scripts och huvudapp, filuppladdning, verktygsdialog, verkligt musdrag, Spara position, läst märkning från rutan trots annat inskrivet exempel, automatisk sökning, markeringsknappar, ritade pilar och öppning av både Egenkontroll och SLR. Körts med originalfilens sparade projekt och en lokal testkopia där endast projektmetadata tagits bort. Råkopian skapar 17 DA; originalets befintliga arbete bevaras. Kortlista verifieras som exakt 11–25.
- JavaScript-syntax kontrollerad för DA och huvudapp. Fast entry identisk med versionssidan och laddar `smartmatch-da-v36-92-module.js?v=36-92`.

Testerna kördes i en lokal Chromium-miljö med den bifogade filen, inte i användarens aktiva app eller på fysisk iPhone/iPad. Ingen ny OCR för bildbaserade automatikmärkningar är införd. Den andra ritningen har inte tillhandahållits och är inte verifierad. Inga kund-PDF-filer publiceras.

Ny versionerad HTML/JS/CSS/DA-modul; tidigare versioner bevaras. Endast isolerad SmartMatch TEST. Kontrollflöde och native iOS/TestFlight orörda.

## Användarbekräftelse och lås

2026-10-11 bekräftade användaren: ”Okej, nu funkar detta” och bad att funktionernas regler och motiv sparas och låses. Se [samlade funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md), [automatikregeln](SMARTMATCH_AUTOMATION_RULE_LOCK.md) och [tabellregeln](SMARTMATCH_TABLE_RULE_LOCK.md). Bekräftelsen avser användarens provade flöde; den gör inte oprövade PDF-format eller alla enheter verifierade.
