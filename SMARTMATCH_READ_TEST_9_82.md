# Avläsning TEST 9.82 – projektmaterial följer projektfilen

Användaren rapporterade att projektmaterialets ändringar inte kom tillbaka som sparade när en projekt-PDF öppnades i en annan webbläsare/enhet. Tidigare prioriterades mottagarens lokala produktlista framför filens sparade produktnamn, kategorier och tider. Projektets material kunde därför visas annorlunda trots att motsvarande data fanns i PDF:en.

En sparad `timeConfig.productLibrary` och dess kategorier är nu projektets materialkälla. Den används före mottagarens appkatalog och ändras inte av lagringshändelser från andra projekt/flikar. Namnkopplingar, projektets extraantal, egna produkter, kategorier, tider och bockningar återläses från samma sparade projekt. Enhetens befintliga grundkatalog skrivs inte över genom att bara öppna filen. En helt tom enhet kan fortfarande starta med filens katalog; filer utan sparad produktlista använder appens befintliga grundkatalog. Ett aktivt projekts produktlista märks som tillhörande projektet och medföljande projekt-PDF:en.

Två sparfel rättas samtidigt:

- Spara alla tar med påbörjade materialändringar från båda materialflikarna, även om användaren gått tillbaka från Ändra produkt till Projektmaterial. Båda sidornas data valideras före skrivning. Ogiltiga dolda utkast visas som sparfel.
- Förbered PDF sparar påbörjade materialändringar innan den portabla ögonblicksbilden tas. Fel blockerar exporten i stället för att lämna en äldre fil. Ändringar i materialfälten ogiltigförklarar förberedd export. Avsiktligt tom tid på en egen projektprodukt sparas som okänd tid i stället för att återuppliva ett äldre punktvärde.

Denna beställning ersätter den tidigare 9.79-principen att mottagarens produktlista alltid ska styra även öppnade projekt-PDF:er. Ingen automatisk synkronisering mellan enheter införs. Kontrollflöde, OCR, ritningskoppling och autentisering ändras inte.

9.82 använder intern build 36.225 och app/cache 2.4.450. 9.81 bevaras; startsida och fast testadress följer 9.82.

## Verifiering

`tests/smartmatch-material-save-pdf-v9-82.cjs` passerar i Chromium på dator och iPhone-profil. Testet ändrar uppgifter i båda vyerna, använder Spara alla från båda hållen, laddar ned riktiga projekt-PDF:er och granskar deras inbäddade data. Samma filer återöppnas i samma webbläsare, en tom webbläsare och en annan webbläsare med motstridiga produktnamn, kategorier, tider och en extra katalogprodukt vars namn kolliderar med en egen projektprodukt. Hela den visade materiallistan jämförs: produktnamn, kategori, extraantal, timmar/minuter och totalt antal. Vid återexport jämförs hela timeConfig med originalfilens. Mottagarens grundkatalog förblir oförändrad genom öppning och återexport; senare externa katalogändringar ändrar inte det öppnade projektet. Ogiltigt dolt utkast blockerar PDF-förberedelse. Påbörjade giltiga tider och avsiktligt okänd tid överlever återöppning.

Hela produktbibliotekets tidigare browser-regression passerar på dator. Riktade katalog-, utkast-, Excel-paritets-, exportkö-, metadataskrivar- och lokala sparningstester passerar också. Ingen fysisk Safari/iOS-enhet har testats.
