# SmartMatch – Avläsning TEST 9.5

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-5.html`. Intern version: `36.148-READ-TEST`. Tillsyno-version: `v2.4.372`.

Användaren rapporterade att en sparad projekt-PDF var **0 kB i Utforskaren** och inte kunde öppnas. Vi har inte den felaktiga filens tidigare sparförlopp. Däremot kunde sparlogiken i TEST 9.4 återskapa tomma filer: den tillät tomma byte, öppnade Windows sparruta innan PDF-genereringen lyckats och stängde skrivströmmen även efter skrivfel. Vid väntan på filval/behörighet användes dessutom en global exportbuffert som kunde rensas när dialogen stängdes.

## Rädda det arbete som finns kvar

1. Om arbetet fortfarande syns i TEST 9.4: välj **Spara → Spara lokalt** innan du stänger eller uppdaterar sidan. Radera inte webbläsarens lagring.
2. Öppna den fasta testadressen och kontrollera att det står **Avläsning TEST 9.5**.
3. Välj ditt projekt under **lokalt sparade projekt**. När TEST 9.5:s lagring är tom kopieras giltiga lokala TEST 9.4-arkiv och deras arbetsutkast en gång. Originalarkiven behålls i TEST 9.4. Öppna samma webbplats i samma webbläsare/profil.
4. Välj **Spara → Spara PDF**. Vänta tills det står **PDF kontrollerad och klar** och knappen **Spara PDF** blir tillgänglig.
5. Ange gärna ett nytt filnamn, tryck **Spara PDF**, välj plats och vänta på beskedet att filen sparats. Vid fel: behåll projektet öppet, spara lokalt och försök en annan plats eller ett nytt namn.
6. Öppna den nya filen via **Öppna ny PDF**. Granskade kopplingar, produkter och kontroller används utan ny scanning.

En fil som faktiskt innehåller 0 byte har inget PDF-innehåll att återskapa. Återhämtning kräver det öppna arbetet, en lokal arbetskopia, en tidigare fungerande PDF eller en filversion i lagringstjänsten. Om arbetet endast finns i ett öppet, ännu inte lokalt sparat TEST 9.4-fönster måste steg 1 göras först. Kopiering av äldre arkiv skriver aldrig över befintliga TEST 9.5-projekt eller deras utkast.

## Ändrad sparning

- Projekt-PDF och inbäddade projektdata skapas och verifieras **före** Windows filväljare. Ett genereringsfel ger en tydlig varning och **Försök förbereda PDF igen**; ingen sparruta har då öppnats.
- Varje sparåtgärd behåller en oföränderlig `File` genom väntan på filval och behörighet. Exportdialogens stängning kan inte tömma filen som håller på att sparas.
- Tomma byte stoppas före `createWritable`. Ett skrivfel anropar `abort`, utan att därefter anropa `close` och begå en tom eller ofullständig ersättning.
- Vid direkt filskrivning läses diskfilen tillbaka och jämförs byte för byte i 1 MB-stycken innan lyckat besked. Tom, förkortad eller ändrad diskfil ger fel. En nyligen skapad plats kan fortfarande bli kvar tom om själva operativsystemets skrivning misslyckas; det rapporteras som misslyckad sparning.
- Webbläsarens vanliga nedladdning och iOS-delning får en kontrollerad, icke-tom PDF. De gränssnitten ger inte appen åtkomst att kontrollera den slutliga målfilen; beskeden gäller nedladdning respektive delningsmeny.
- Försök att öppna en tom PDF stoppas med svensk förklaring innan det öppna projektets data ersätts. Lokal arkivering fångar källfilen före asynkront arbete och återanvänder inte en tom eller storleksavvikande cachad kopia.
- Listan över lokala projekt uppdateras efter att lagringsmodulen startat. Detta förhindrar att återhämtade projekt döljs när huvudskriptets första uppdatering körs innan lagringsskriptet har laddats. Browserprovet fördröjer uttryckligen det skriptet.

Produktläsare, GS-regler, beteckningar, ritningsmatchning, avprickningar och tid är oförändrade. Produktmodulen från TEST 9.4 återanvänds. TEST 9.4:s versionsfiler är oförändrade. Ordinarie SmartMatch, Kontrollflöde, behörigheter och Ritningsverktygets funktioner ändras inte.

## Verifiering

- `node tests/smartmatch-read-save-v9-5.cjs`: tom indata innan skrivning, fungerande PDF, avbrutet skrivfel, tom/förkortad/förändrad diskfil, jämförelse över flera datablock, export som inte är klar samt fördröjda spar- och behörighetsdialoger. TEST 9.4 fallerar kontrollen att tomma byte ska avvisas.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-save-browser-v9-5.cjs`: faktisk TEST 9.5-vy, genererad ritning och två dörrkort, åtta GS-produkter i fyra grupper, avprickning och tid. Injekterat exportfel öppnar ingen sparruta; nytt försök lyckas; sparning fortsätter med rätt fil när dialogen stängs under ett fördröjt filval. Återöppning bevarar kopplingar, GS-produkter, kontroll och tid utan ny scanning. Skrivfel behåller den tidigare diskfilen, tom återläsning rapporteras och öppning av tom PDF lämnar befintligt arbete kvar. TEST 9.4-arkiv återhämtas utan att källan ändras; borttagna återhämtade projekt kommer inte tillbaka.
- Befintligt `tests/smartmatch-read-work-browser-v9-4.cjs`, riktat till TEST 9.5 i minnet: dator-, iPad- och iPhone-vyer passerar hela flödet med kodmatchning, uppskjuten produktläsning, rättning av läsområden, export/återöppning och äldre kontrollnycklar.

Alla PDF-testfiler är syntetiska. Inga kundhandlingar läggs i Git. Chromium-vyerna verifierar inte fysisk Safari/iPad eller Windows lagringstjänster. Ingen TestFlight-publicering ingår.
