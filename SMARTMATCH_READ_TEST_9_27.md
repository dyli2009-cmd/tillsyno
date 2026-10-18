# SmartMatch Avläsning TEST 9.27

TEST 9.27 gör DS- och DA-stämplar tydligare på iPad utan att läsa om den stora ritningssidan. Dörrstängare visas som **DS** och dörrautomatik som **DA** i ett separat, kompakt lager ovanpå ritningen.

Teknisk build: **36.170**. Synlig Tillsyno-version: **v2.4.394**.

TEST 9.26 och samtliga äldre versionsmärkta filer ändras inte.

## Utseende och storlek

Varje hittad DS/DA-stämpel får ett högkontrastmärke med:

- gul bakgrund
- svart text och svart ytterkant
- tunn röd innermarkering
- rektangulär form för DS och rund form för DA
- minst 24 × 18 CSS-pixlar
- högst 36 × 24 CSS-pixlar
- textstorlek mellan 11 och 13 CSS-pixlar

Märket behåller PDF-stämpelns mittpunkt. Storleken beräknas från den aktuella ritningszoomen, men begränsas av minimi- och maximimåtten. Efter zoom, sidbyte, storleksändring eller omritning beräknas placeringen på nytt och måtten begränsas igen. Märket blir därför läsbart i översikten utan att fortsätta växa och täcka ritningen vid inzoomning.

## Passivt lager

DS/DA-märkena ligger i ett eget lager med lagerordning `z-index: 6`. Både lagret och märkena använder `pointer-events: none`.

De visar alltså information men fångar inga tryck eller klick. Befintliga dörrpositioner, stämpellänkar, procentmärken och andra arbetskontroller kan fortsatt väljas och användas genom lagret. Märkena skapar inte nya arbetspositioner eller kontrollpunkter.

## Vad som läses

Funktionen använder endast det förberedda stämpelindex som redan finns i projektet. Där väljs synliga PDF-annoteringar av typen `/Stamp` på den aktuella ritningssidan. Svenska benämningar som **Dörrstängare** och **Dörrautomatik**, samt de korta formerna **DS** och **DA**, känns igen.

Visningen:

- startar ingen OCR
- extraherar inte vanlig text från PDF-sidan
- bildläser inte ritningen
- läser inte GS-positioner eller automatiklistor
- visar inte märken på identifierade dörrkortssidor
- ignorerar PDF-annoteringar som är markerade som dolda, osynliga eller NoView

Det minskar arbetet i Safari och återanvänder information som redan har förberetts en gång.

## Viktig avgränsning

Lagret hittar bara verkliga PDF-stämplar som finns i det förberedda `/Stamp`-indexet. Om bokstäverna DS eller DA är:

- inbakade i en skärmbild eller annan platt bild
- ritade direkt som en del av sidbilden
- skrivna som vanlig PDF-text utan en stämpelannotering

skapas inget märke automatiskt av TEST 9.27. Sådant material behöver först förberedas eller skannas separat så att stämpeln kan registreras.

## Verifiering

De fokuserade browserproven för TEST 9.27 kontrollerar att:

- enbart DS/DA från det förberedda stämpelindexet visas
- vanliga textannoteringar, andra stämpeltyper och andra sidor inte följer med
- dolda PDF-flaggor hoppas över
- svensk text och de korta DS/DA-koderna klassificeras rätt
- lagret ligger på z-index 6 och aldrig tar emot pekhändelser
- varje märke håller sig mellan 24 × 18 och 36 × 24 pixlar
- texten håller sig mellan 11 och 13 pixlar
- zoom och omritning beräknar och begränsar måtten på nytt
- upprepade uppdateringar ersätter gamla märken utan dubbletter
- ett fördröjt, äldre indexresultat inte skriver över en ny sida
- dörrkortssidor inte får DS/DA-märken
- ingen OCR eller vanlig sidtextläsning startas

iPadens browserprov körs med touch-, Safari- och hög-DPR-signaler och kontrollerar att de befintliga klickbara dörrstämplarna, procentmärkena och zoomflödet fortfarande fungerar. En fysisk iPad med Safari och en verklig kundritning rekommenderas fortsatt som sista visuell kontroll.
