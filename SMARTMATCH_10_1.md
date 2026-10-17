# SmartMatch 10.1 – SmartScan TEST

Separat testsida: [Öppna SmartMatch 10.1](smartmatch10-1.html).

`smartmatch10.html` är fortfarande den bevarade versionen 10.0. Ingen befintlig SmartMatch-, kontroll-, admin- eller inloggningsfil ändras av denna leverans. 10.1 använder samma befintliga behörighetskontroll men separat lokal projektlagring.

## Arbetsgång

1. **Lägg till PDF**, välj en dörrkortssida och välj **Markera kod**. Dra en ruta runt beteckningen eller rubrikraden. Rubriken före koden, exempelvis Dörrkort eller Beslagskod, kan tas bort vid läsning. Ange sidor med samma layout, exempelvis `2-8`. **Ignorera område** maskerar oönskad text inne i kodrutan.
2. **Hitta dörrkort** läser PDF-text. **Bildläs saknade** använder lokal svensk/engelsk bildläsning enbart inom kodrutan när en giltig beteckning saknas. Resultaten sparas efter varje färdig sida. **Pausa efter denna sida** och samma läsknapp fortsätter från sparad position. För en annan layout: markera ett nytt exempel på en annan sida och välj dess sidintervall. Tidigare kort behålls.
3. Granska registret, ändra en felaktig beteckning eller lägg till/ta bort kort manuellt. **Granskat – godkänn dörrkorten** öppnar nästa steg. Samma beteckning på flera kort kräver ett uttryckligt val vid koppling.
4. Öppna en ritningssida, välj beteckning och **Markera stämpel** runt hela stämpeln inklusive ram/bakgrund. **Hitta märkningar** jämför hela beteckningar och utseendet runt texten. Vanlig WC-text utan motsvarande stämpelform räcker inte. Alla träffar är förslag tills de godkänts. Manuellt går det att välja annat kort, flytta markering, ta bort felträff och ångra borttagning. Arbetsstatus och anmärkning tillhör varje enskild position.
5. **Spara lokalt** och **Öppna senaste** behåller både originalunderlag och projektdata utan omskanning. **Spara projektfil** skapar en separat `.sm101`-fil med alla original-PDF:er, läsområden, kort, kopplingar och arbetsstatus. **Öppna projektfil** verifierar format och PDF-kontrollsummor. Originalens bytes ändras inte. Sparfel ger inte ett falskt lyckat besked.

Mushjulet zoomar mot pekaren. Vänster musknapp drar vyn i Flytta-läget. Plus/minus, Anpassa och dubbelklick finns också. Två fingrar är implementerade för zoom. Markeringar och PDF använder samma transform. Sidans visningsläge sparas per PDF-sida.

## Verifiering

GitHub Actions [körning 39065673535](https://github.com/dyli2009-cmd/tillsyno/actions/runs/39065673535), appkod vid `0550a8ee65e28d4446823d939078b37c0fcdf705`: syntaxkontroll och webbläsartest i Chromium godkända. Testet använder syntetiska underlag och en lokal inloggningsstub endast i testkörningen; den publicerade sidan använder ordinarie auth/guard.js.

Kontrollerat: sju dörrkort från markerat område, 35 inramade stämplar, vanlig WC-text bortvald, paus/fortsättning, separata godkännanden, borttagna träffar återuppstår inte vid ny sökning, manuell omkoppling och flytt, muszoom och panorering, simulerat lagringsfel, lokal återöppning, projektfilens export/import, identiska SHA-256-kontrollsummor för originalen och verklig beskuren OCR av bildkoden GS10. Ingen JavaScript-sidkrasch i körningen. Skärmbilder för dator och 390 px mobilbredd har granskats.

## Avgränsningar för denna testversion

Den riktiga 77-sidiga stora kundfilen har inte prestandatestats i denna körning. Ingen bestämd hastighetsökning utlovas. Testgräns: totalt 400 MB PDF-underlag; faktisk kapacitet beror på enhet och webbläsarminne. Ny fullständig offline-start, fysisk iPhone/iPad och Safari är inte verifierade här. Öppna med internet vid första användningen. Bildritningar behöver ett markerat sökområde och riktad bildläsning före stämpelexemplet; roterade eller annorlunda stämplar kan kräva manuell koppling. Produktlistor läses inte i detta första kod- och matchningsflöde. 10.0:s gamla JSON-export migreras inte automatiskt till det nya projektformatet.
