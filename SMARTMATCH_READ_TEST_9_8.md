# SmartMatch – Avläsning TEST 9.8

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-8.html`. Intern version: `36.151-READ-TEST`. Tillsyno-version: `v2.4.375`.

Användaren bekräftade att sparning/återöppning fungerar och godkände därefter gruppändring, enskild borttagning, direkt exempelmarkering och sökning efter stämpelns utseende. Funktionen gäller den separata Avläsning TEST 9-serien.

## Ändra alla positioner i en grupp

1. Öppna ett förberett projekt med **Öppna PDF**. Öppna **Ritning & dörrkort** och gruppen, exempelvis GS23.
2. Välj **Ändra grupp**. Dialogen visar hur många positioner ändringen omfattar över hela projektet, även om **Aktuell sida** är valt.
3. Behåll eller ändra gruppens namn i appen. Välj dörrkortssida och, om flera kort finns på sidan, rätt ursprunglig kortbeteckning.
4. Kontrollera kopplingen och välj **Spara gruppändringen**. Varje fysisk dörr behåller sitt eget ID och sin placering. Originalkortets namn och innehåll ändras inte.
5. Vid byte av kort sparas varje positions gamla avbockningar och tidjusteringar per ursprungligt kort. Det nya kortets arbete börjar obockat, eller återställs från tidigare arbete med samma kort. Byte tillbaka återställer den dörrens tidigare arbete. Ren namnändring behåller aktuell arbetsstatus.

En ny beteckning som redan hör till ett annat kort stoppas utan att projektet ändras. Grupper som uttryckligen kopplas till samma kort kan dela detta kort, samtidigt som fysiska positioner och deras kontroller förblir separata.

## Ta bort en felträff

1. Klicka på den felaktiga positionen så att dörrkortet öppnas.
2. Välj **Ta bort den här positionen** och bekräfta.
3. Den valda länken och appmarkeringen försvinner. Valet sparas som ett bortval för den fysiska placeringen, så senare sökning inte återinför samma felträff. Övriga positioner behålls.
4. Välj **Spara → Spara PDF** för att föra med ändringen till nästa öppning eller dator.

## Hitta och koppla stämplar från ett exempel

1. Visa en ritningssida. Välj **＋ Koppla stämplar** i **Ritning & dörrkort**, eller samma verktyg under **Verktyg**.
2. Markera direkt hela exempelstämpeln med en ruta. Ta med den färgade bakgrunden och stämpelns kant. Exemplet skapar ännu ingen ny position.
3. Kontrollera den avlästa hela beteckningen. Saknas sökbar text kan **Läs bara exemplet som bild** läsa endast den lilla markeringen med lokala OCR-filer. Bildläsning av resten av ritningen väljs separat.
4. Välj dörrkortet som träffarna ska öppna. **Bara samma stämpelutseende som exemplet** är förvalt. Ett gult runt exempel väljer bort vanlig ofärgad WC-text, annan bakgrundsfärg och en avvikande form. Färg och form kommer från detta projekts exempel; appen har ingen generell gul/GS/WC-regel.
5. Välj **Sök på ritningen**. Kontrollera träffarna med **Visa**, avmarkera felträffar och välj **Lägg till valda kopplingar**. Redan kopplade eller uttryckligen borttagna fysiska placeringar läggs inte till igen.
6. Spara projekt-PDF. Exemplet och ändringarna följer med filen; återöppning behöver ingen ny OCR eller ritningssökning.

Utseendekravet kan stängas av uttryckligen för andra underlag. Vid oklar bakgrund/form ska användaren markera om exemplet eller välja att söka utan detta krav. Befintliga kopplingar ändras inte automatiskt när ett nytt exempel väljs. `DBL`, `DBL-OI` och `DBL B-OPPS` är olika hela beteckningar; ett kort DBL får inte matcha en del av de längre namnen. Mellanslag, bindestreck och versaler normaliseras enligt befintlig kodregel.

## Lagring och avgränsning

En separat gruppkoppling håller isär ritningens tryckta beteckning, gruppnamnet i appen och originalkortets identitet. Originalkortens avlästa tabeller ändras inte av en kopplingsändring. Sparade positioners ID:n följer med även när gruppnamnet ändras. Arbete per kort och fysiska bortval lagras tillsammans med det befintliga projektet.

TEST 9.7 och tidigare snapshots är oförändrade. 9.8 har egen lokal lagring och kan kopiera 9.7:s lokala arkiv/aktiva granskade utkast utan att källan ändras. Projekt med de nya gruppkopplingarna bör fortsätta öppnas i 9.8 eller senare. Befintlig 9.7-kontroll av icke-tom PDF, projektägd exportcache och direkt återöppning behålls.

Ingen ändring i ordinarie SmartMatch, DA/SLR-regler, GS-montageregeln, Ritningsverktygets funktioner, separata beta 10, Kontrollflöde eller auth. Testning i iPad-/iPhone-storlek är webbläsaremulering; fysisk iOS och TestFlight verifieras separat.

## Verifiering

- `node tests/smartmatch-read-group-reread-v9-8.cjs`: fysisk sökkod efter gruppnamnbyte, stabila ID:n vid frivillig omsökning, sammanslagning och individuella undantag; arbete för äldre grupper och återställning vid misslyckad gruppändring.
- `node tests/smartmatch-read-state-v9-8.cjs`: atomiska gruppkopplingar, originalkort, stabila positions-ID:n, bortval och sparat exempel.
- `node tests/smartmatch-read-group-browser-v9-8.cjs`: faktisk gruppdialog och dörrkortsknapp på dator/iPad; alla sidor trots sidfilter, separata avbockningar/tider, byte tillbaka, borttagning, ny sökning och PDF till ren webbläsare utan avläsning.
- `node tests/smartmatch-read-appearance-browser-v9-8.cjs`: genererad PDF med gula ovala stämplar, vanlig WC-text, andra färger, annan form och fullständiga DBL-varianter. Explicit avstängning av utseendekrav och lokalt exempel-OCR testas separat.
- `node tests/smartmatch-read-stamp-flow-browser-v9-8.cjs`: faktisk huvudvy, exempelmarkering och koppling med efterföljande export/ren återöppning.
- Befintliga tester av svenska textfragment, GS-produkter, grupper, kontroller, tid och PDF-återöppning körs mot 9.8-sidan. De tidigare versionernas testfiler ändras inte.

Verifierade resultat: grupp- och borttagningsflödet passerar på dator och iPad-emulering. Huvudvyns stämpelmarkering har testats med riktig musdragning och CDP-touchdragning. Två gula ovala WC-stämplar återstår, medan vanlig WC-text, blå/grön bakgrund och gul rektangel väljs bort. Både den kompletterande kopplingen och första avläsningsguidens exempel använder filtret. Export till ren webbläsare bevarar exempel, kopplingar och befintligt arbete med 0 nya sökningar, produktläsningar, OCR-arbetare och granskningsguider. Svenska text-/produkt-/PDF-regressionen passerar på dator, iPad och iPhone; GS-produktregressionen passerar på dator. Godkända syntetiska prov är ingen garanti för färg-/formigenkänning på alla kundhandlingar; träffarna granskas före koppling.
