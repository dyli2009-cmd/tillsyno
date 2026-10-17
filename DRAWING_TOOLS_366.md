# Ritningsverktyg v2.4.366 – spara kvarvarande sidor separat från bildoptimering

## Problem och ändring

Sedan v2.4.365 körde **Spara PDF** även jämförelsen för att återanvända identiska bildobjekt. Den jämförelsen har en skyddsgräns för antal korsreferenser. En komplicerad sida kunde därför ge felet **Sidan har för många korsreferenser för en säker jämförelse** och stoppa sparandet, även när användaren bara ville spara dokumentet efter att ha tagit bort extrasidor.

**Spara PDF** öppnar nu dialogen **Vad vill du spara?** med två val:

- **Spara mina sidval och ändringar** sparar arbetsfilens kvarvarande sidor och aktuella sidändringar utan att kräva en ny jämförelse av bilddubbletter. Det är standardvalet när målet är att spara efter sidborttagning.
- **Optimera bilder och spara** jämför och återanvänder identiska bildobjekt med samma strikta verifiering som tidigare. Om dokumentet är för komplicerat för den säkra jämförelsen avbryts just optimeringen och felet visas.

En misslyckad optimering ska inte hindra ett nytt, uttryckligt val av vanlig PDF-export. Exportcachen rensas vid ett misslyckat försök. Ett redan verifierat optimeringsresultat får återanvändas för samma sidval och ändringar; en vanlig export får däremot inte ersätta den verifiering som krävs när bildoptimering väljs. Befintliga innehållskontroller och skyddet för signerade filer behålls. Originalfilen skrivs inte över.

Vanlig export följer det valda kvalitetsläget. Standardläget **Förlustfri (originalkvalitet)** behåller bildkvalitet och upplösning. Tidigare uttryckliga val för att göra sidor till bilder finns kvar. Hur mycket mindre filen blir beror på vilka sidor och resurser som kan tas bort; någon bestämd filstorlek utlovas inte. OCR och sökbart textlager ingår inte i den här ändringen.

## Arbetsgång

1. Öppna PDF-filen i **Ritningsverktyg**.
2. Analysera eller läs den markerade rubriken, granska förslagen och ta bort valda extrasidor.
3. Tryck **Spara PDF**, behåll **Spara mina sidval och ändringar** och bekräfta med **Spara PDF** för att spara de kvarvarande sidorna.
4. Välj **Optimera bilder och spara** i dialogen om bilddubbletter också ska jämföras och återanvändas.

## Verifiering

`tests/drawing-save-selection.cjs` passerade med en PDF-fixtur som når jämförelsens gräns på 250 000 korsreferenser. Testet kontrollerar att vanlig export av kvarvarande sidor fungerar medan bildoptimeringen behåller sin skyddsgräns.

`tests/drawing-save-selection-browser.cjs` passerade i dator-, iPhone- och iPad-vyer med samma verkliga korsreferensgräns. Efter borttagning av sida 2 sparades bara sidorna 1 och 3; PDF.js jämförde pixlar och text och PDF-lib kontrollerade dokumentdata. Testet omfattar dialogens standardval och avbrott, fel utan nedladdning vid strikt bildoptimering, vanlig sparning efter analys-/optimeringsfel samt exportcache och återhämtning efter verifieringsfel.

Befintliga tester för analys (`drawing-analysis-browser.cjs`), PDF-export (`drawing-export-v360.cjs`) och grupperade dörrkort (`drawing-card-groups-browser.cjs`) passerade i alla tre enhetsvyer. Navigationen passerade på dator och mobil. Spardialogen bildgranskades i samtliga tre vyer utan överflöd åt sidan.

Användarens egen 251 MB-PDF finns inte tillgänglig för test. Ändringen gäller Ritningsverktygets sparflöde; SmartMatch TEST 9, Kontrollflöde och auth ändras inte funktionellt. Gemensam appversion och offlinecache uppdateras till v2.4.366. Ingen tillgänglig native-källkopia, fysisk iOS-enhet eller ny TestFlight-build har verifierats.
