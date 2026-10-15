# Projekt och kund-PDF – TEST v4

Beställt 2026-10-15, endast i den separata revisionstestappen.

- Projektets rubrik heter Signatur. Teknikerfältet visas inte. Befintliga teknikeruppgifter behålls internt för äldre arbetsfiler.
- Signatur kan skrivas med finger, penna eller mus, eller anges som text. Spara signatur bekräftar en handskriven signatur. Rensa gäller den pågående skissen, Avbryt behåller projektets tidigare signatur och Ta bort signatur tömmer projektets signatur.
- Samma aktiva signatur används i alla protokollens signaturrutor. Bilden beskärs runt pennstrecken och behåller proportionerna. PNG-bilden återanvänds i PDF:n.
- Signatur, valt läge och bildmått sparas som projektuppgifter i lokal lagring och inbäddade arbets-PDF-data. Ingen extern signeringstjänst används. Ny service tömmer både dagens textsignatur och handskrivna signatur enligt befintlig regel.
- Exporterade automatiketiketter är 50 procent större: 10,8 → 16,2 punkter, eller 9,2 → 13,8 punkter för långa ID. Ramen anpassas till texten; pilspets och etikettcentrum ligger kvar. Inställningen gäller PDF-exporten.
- Den nya text/pilprofilen tar anläggningsnummer från ritningens fullständiga ID genom att skilja av de två sista delarna (maskintyp och löpnummer). `57617-14-24-1` ger `57617-14`; `ABC-24-1` ger `ABC`. Nya automatiker använder anläggningsnumret som ID-prefix.
- Ett gemensamt prefix från exakt verifierade ritnings-/protokollpar prioriteras. Om inga sådana par finns krävs ett gemensamt prefix från ritningspilarna. Flera prefix ger tomt anläggningsnummer och synlig projektvarning. En omatchad avvikande pil får inte skriva över ett verifierat gemensamt prefix. Företag, kund, order och övriga projektuppgifter följer tidigare fältregler.
- Redan sparade projekt skrivs inte om automatiskt. Öppna ursprunglig service-PDF för ny avläsning eller ändra Anläggningsnummer under Projekt. Manuellt ändrade ID förblir manuella.

TEST v3 finns kvar i `v3/all-in-one.html`. V1–V3:s runtime-filer och `legacy-door-import.js` är oförändrade. Ordinarie Kontrollflöde, SmartMatch och iOS ändras inte. Samma kompatibla lokala projektlagring som v2/v3 används.

## Verifiering

`tests/controlflow-customer-v4.cjs`: verklig musritad signatur i webbläsaren, signaturbild i samtliga 18 rader i genererad PDF, textalternativ, arbets-PDF och återöppning, Avbryt/Ta bort, ny service, mobil dialog, PDF-textstorlek, kundmallens typsnitt och tillbaka-länk. PDF:n har renderats och granskats visuellt.

`tests/controlflow-revision-browser-v4.cjs`: numeriska och alfabetiska objektprefix, generering av nytt automatik-ID, fullständig text/pilimport, tvetydig koppling och manuellt val, historik, roterad ritning, projektkonflikter, ångra/gör om, arbets-PDF, mobil och offline. Den privata exempelfilen har också kontrollerats lokalt; den publiceras inte.

`tests/controlflow-revision-copy-v1.cjs` kontrollerar att låst grundkopia och gammal import är oförändrade. Tidigare kundmallstest pekar på den arkiverade v3-sidan. Fysisk iPhone/iPad är inte testad.
