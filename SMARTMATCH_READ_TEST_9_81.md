# Avläsning TEST 9.81

Projektmaterial och Produktlista använder samma kategorinamn och katalogordning. Projektets egna produkter får vid behov egna grupper efter katalogens grupper. Gamla standardgrupper som inte används läggs inte längre in som extra tomma projektkategorier. Masterproduktens kategori följer fortsatt produktlistan vid ändringar och namnbyten.

Radknappar ligger i en egen rad i båda vyerna. Ändra produkt har en fast 16-pixels pennikon, läsbar knapptext, förklarande titel och ett produktnamn i tillgänglighetsnamnet. Knappen öppnar fortfarande rätt produkt i produktlistan. På telefon ligger produktnamnet överst, kategori och stycktid bredvid varandra, sedan projektets extraantal och sist knapparna. Knapparna är minst 34 pixlar höga och visas utan överlapp eller avklippt ikon. Samma gruppmarginaler, fältetiketter och knapputformning används i båda vyerna.

Tidigare 9.80 bevaras. Startsida, fast testadress och offlinecache följer 9.81; intern build 36.224 och appversion 2.4.449. Produktbibliotekets lagringsnyckel behålls.

Verifiering: hela produktbibliotekets Chromium-test på dator och iPhone-profil kontrollerar kategoriordning mellan vyerna, pennikonens placering i knappen, knappens placering inom raden, höjd, horisontell överbredd, redigera/återgå, kategoribyten, mängder/bockningar/tider samt verklig projekt-PDF som återöppnas i en ren webbläsare. Båda vyernas layout granskas i lokala skärmbilder. Riktade tester för katalog, Excel-paritet, utkast, exportkö och lokal sparning passerar. Det är inte fysisk Safari-verifiering.
