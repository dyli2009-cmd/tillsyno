# Projektering 2.5 – pekstyrning på telefon och iPad

Ritningsytan har en separat, icke-passiv TouchEvent-hantering för pekskärmar. Mus och penna använder fortsatt PointerEvent. Samma fysiska pekgest behandlas en gång. Stämplarnas SVG-element behålls under pågående beröring, även när markering, projekt eller zoom uppdateras. Förhandsvisning av flytt och storlek ändrar befintliga element tills fingrarna har lyfts.

En ny beröring efter avslutad tvåfingerszoom får direkt flytta eller öppna en stämpel. Kvarvarande fingrar från samma zoom får inte placera eller öppna något. Avbruten gest, byte av ritningssida, flikbyte och förlorat fönsterfokus återställer gesten utan att spara en halvfärdig flytt. Avslutad flytt hanteras före frigörande av pekfångst.

## Användning

- Dra på tom ritningsyta för att panorera. Använd två fingrar för att zooma.
- Dra i en stämpel för att flytta den. Flytten sparas när fingret lyfts.
- Tryck en gång på en dörrstämpel för att öppna dörrkortet på pekskärm. Tryck på en produktstämpel för produktuppgifterna.
- Med mus öppnas kort och produktuppgifter med dubbelklick, som tidigare.
- Välj ett storlekshandtag för att ändra storlek. Projektets befintliga regel för gemensam storlek gäller fortsatt.

Canvasåtgärder väntar i ordning när lokal sparning pågår. Materiallistan beräknas om när sparat projekt eller sökning ändras, i stället för vid varje markering. Produkt- och kortfält får inget automatiskt tangentbordsfokus på pekskärm. Formulärfält har minst 16 px text på enheter med pekskärm för att undvika Safaris sidzoom vid fältfokus.

Projektformat, lokalt sparade projekt, kategorier, produkter, materialberäkning och PDF-export använder fortsatt 2.4-modulerna. Tidigare versionerade filer är orörda. Ingen bildgenerering eller skapande av skärmbilder används.

Verifiering: canvasregression och webbläsartest med riktiga TouchEvent via Chromium samt dator, emulerad iPhone och iPad. Testerna omfattar snabb zoom följd av tryck eller drag, avbrutna gester, kortöppning, sparad produktflytt, storleksändring, flikbyte, kategorier, material och återöppning av PDF/JSON/IndexedDB. Fysisk iPhone/iPad med Safari har inte testats i denna miljö.
