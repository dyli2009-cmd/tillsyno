# Avläsning TEST 9.38

Visningsområde sparas en gång för hela projektet i readTestData.projectDisplayBounds. Det gäller alla kort och nya kort efter omläsning, och bevaras genom sparad projekt-PDF. Befintliga individuella områden används tills ett gemensamt område väljs. Visa hela originalet sätter hel sida för hela projektet. OCR-områden och original-PDF ändras inte.

Tid visar kompakta totalsiffror och samma GS-materiallista som Material. Fliken Per dörr och dess vy är borttagna. GS-material har produktnamn, mängd och tid/st (h,min). En produkttid gäller alla förekomster av det korrigerade produktnamnet i projektet, före äldre individuella eller kategoribaserade tider. Extra tid är separat. Tomt tidsfält återgår till tidigare individuella/standardtider. Ändring av enbart namn behåller tiden; vid sammanslagning används målets gemensamma tid om den redan finns.

Tester: gemensamt visningsområde mellan olika källdörrkort, återöppnad sparad PDF, hel-original-reset, omläsning/export, gemensam produkttid trots olika individuella tider, namn/sammanslagning och kryss, projektisolering, borttagen Per dörr, mobil layout och läsbar total, offlinecache.
