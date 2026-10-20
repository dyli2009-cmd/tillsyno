# Avläsning TEST 9.80

Knappen Ändra i produktlistan satte produktnamnet som sökfilter i den gemensamma materialvyn. Filtret följde sedan med tillbaka till Projektmaterial, där övriga produkter doldes. Byte mellan Produktlista och Projektmaterial rensar nu sökfiltret. Upprepade klick på den redan valda vyn behåller sökningen. Inga projektprodukter tas bort eller ändras av vybytet.

Produktlistan har mindre gruppmarginaler, tätare fältetiketter och mindre radavstånd. På dator ligger radens sparknapp och + Projekt bredvid varandra när utrymmet räcker. Telefonens fält och knappar behåller sina tidigare höjder.

Ny versionskopia: TEST 9.80, intern build 36.223, app/cache 2.4.448. Tidigare 9.79 bevaras. Startsida och fast testadress pekar på 9.80. Produktbibliotekets stabila lagringsnyckel behålls.

Verifiering: browser-testet innehåller direkt återgång efter Ändra i produktlistan samt två upprepade spara/återgå-cykler utan manuell rensning av sökfältet. Kontrollerar alla tre projektprodukterna, oförändrade beräkningar och bockningar. Hela katalogtestet körs i Chromium på dator och iPhone-profil, inklusive ändrade tider/namn/kategorier, extraantal, flikändringar, lagringsfel och verklig projekt-PDF som återöppnas i ren webbläsare. Det är inte fysisk Safari-verifiering.

Riktade tester för produktkatalog, Excel-paritet, osparade utkast, metadataskrivare, exportkö, protokollnavigation och lokal sparning använder 9.80-modulerna.
