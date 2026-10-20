# Avläsning TEST 9.83 – PDF-sparning vid produktnamnskonflikt

Användaren kunde inte spara projekt-PDF: Förbered PDF stoppades med att en produkt redan finns i produktlistan och att ett annat namn måste väljas. Valideringen från 9.82 kontrollerade hela katalogen vid materialutkast och avvisade även oförändrade, äldre alias-/namnkollisioner som inte hade skapats av den aktuella ändringen.

Katalogvalideringen skiljer nu redan befintliga kollisioner från nytillkomna. Ändrad tid och PDF-export blockeras inte av en historisk kollision på en annan produkt. Ny namnkonflikt accepteras fortfarande inte som en produktöverskrivning.

Om en påbörjad namnändring faktiskt krockar med en annan produkt kan projekt-PDF ändå sparas. De oförändrade sparade produkterna och hela materialutkastet följer med i PDF:en, utan att ta bort, slå samman eller döpa om någon produkt. Exporten visar att påbörjade ändringar följer med som utkast. Utkasten återställs när materialvyn öppnas i den sparade filen och kan redigeras vidare eller följa med vid ny PDF-sparning. Sökning hittar också produktens ursprungliga identitet under en påbörjad namnändring.

Giltiga materialändringar fortsätter att tillämpas före PDF-ögonblicksbilden. Övriga ogiltiga fält och verkliga skriv-/PDF-fel fortsätter att stoppa exporten med orsak. Projektmaterialets företräde från 9.82 bevaras.

Versionskopia 9.83, intern build 36.226 och app/cache 2.4.451. 9.82 bevaras; startsida och fast testadress pekar på 9.83.

## Verifiering

`tests/smartmatch-material-export-conflicts-v9-83.cjs` kontrollerar i Chromium på dator och iPhone-profil att en äldre aliasnamnskonflikt inte stoppar en annan produkts tidsändring eller PDF-export. Därefter provas en faktisk ny namnkonflikt: riktig PDF laddas ned, sparade produkter förblir separata och namnutkastet finns i metadata. Filen öppnas i en ren webbläsare och namnutkastet återfinns i materialvyn; ännu en PDF sparas med oförändrade produkter och bevarat utkast.

Hela materialöverföringstestet från 9.82 passerar på dator. Riktade tester för katalog, utkast, Excel-paritet, exportkö, metadataskrivare och lokal sparning passerar också. Ingen fysisk Safari-enhet har verifierats.
