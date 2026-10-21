# Avläsning 9.97 – godkännande och inställningar vid öppningsknappen

9.95 placerade inställningar och godkännande sist inne i resultatlistans rullning. Vid många kort följde de därför fortfarande med listan. De ligger nu i samma nederdel som **Öppna SmartMatch**, utanför `.rtRailScroll`.

Nederdelen innehåller samma inställningsfält, samma granskningsruta och samma öppningsknapp med befintliga händelser och spärrar. Kort och träffar rullar i det separata resultatfältet på dator och iPad. På telefon följer nederdelen skärmens underkant under rullning. Öppna inställningar har egen begränsad höjd så att gransknings- och öppningskontroller går att nå.

Inställningar finns även före sökning. Godkännandet visas först vid ritningsträffar och döljs vid produktläsning. Öppningsknappens befintliga stegstyrda visning och granskningskrav bevaras. Läsaren, manuell koppling, matchning och projektdata från 9.96 återanvänds.

Startsida, fast testadress och offlinecache följer 9.97 / app 2.4.467, HTML-build 36.232. Tidigare versionsfiler bevaras.

Verifierat med en genererad projekt-PDF med 75 dörrkort och 75 ritningspositioner på sex skärmstorlekar: dator, iPad stående/liggande och telefon 390×844, 360×780 och 844×390. Verklig rullning högst upp, i mitten och längst ner, med stängda och öppna inställningar, behåller kontrollerna tillsammans och synliga. Granskningskravet och övergången med alla 75 positioner fungerar. Ingen vågrät överrullning eller JavaScript-fel.

Det befintliga webbläsartestet för hela avläsningsflödet passerar på sex enhetsprofiler, inklusive ritningsmatchning, godkännande och senare produktläsning. Syntax, identisk fast HTML-adress, lokala filreferenser och offlinecachens 869 filer är kontrollerade. Skärmtesterna använder Chromium med emulerad storlek/pekfunktion; fysisk iOS-enhet har inte testats.
