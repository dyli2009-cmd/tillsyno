# SmartMatch TEST v36.93 – stöd för namngivet dörrkort i första cellen

Användaren skickade ett dörrkort med en sammanfogad översta tabellcell, `Dörrkort Teknik`, och två utrustningskolumner under. Grundupplägget fungerar redan för numeriska ID:n och GS. Däremot blockerade befintlig kod ordet TEKNIK även när det uttryckligen stod efter Dörrkort i första cellen. Användaren bad att stödet läggs till utan att ändra fungerande avläsning.

v36.93 tillåter en alfabetisk beteckning på 2–6 bokstäver efter explicit Dörrkort/Dorrkort/Beslagskort i den redan identifierade första cellen. Därmed blir `Dörrkort Teknik` → `TEKNIK`; även exempelvis `Dörrkort Kontor` fungerar. Fristående administrativa/rumsord, högercellens värden och senare utrustningsrader blir inte nya ID-källor. Numeriska/GS-beteckningar följer tidigare kodväg, inklusive `Dörrkort GS1 1` → GS1. Ingen projektspecifik tabellmall eller hårdkodat TEKNIK-undantag införs.

Den översta vänstra cellen förblir den låsta ID-källan. En sammanfogad översta cell räknas enligt befintlig regel. Det är ett tillägg för en namngiven rubrik i samma grundupplägg, inte generell geometrisk tabellinlärning. Namn längre än 6 bokstäver eller nya flerradiga upplägg är inte verifierade av denna ändring.

Verifierat:

- `node tests/smartmatch-card-title-v36-93.cjs <lokal kort-PDF>`: verkliga PDF.js-fragment i den skickade ensidiga filen ger TEKNIK. Test för GS1/GS 1/GC1/140 C/1/2/A-105/WC GS1 1, tvetydig första cell, ingen reserv från högerkolumnen och alla 15 tidigare Snidaren-kortfixturer passerar.
- Den faktiska v36.93-HTML-sidan kördes i lokal Chromium med appens verkliga huvudkod. Kortet ensamt indexeras som TEKNIK på sida 1, utan påhittade ritningspositioner. Kortet tillsammans med en genererad testritning ger två TEKNIK-positioner på ritningssida 1 och korrekt kortsida 2; Teknikrum/STeknik matchas inte. Klick på positionen öppnar det ursprungliga kortet på sida 2.
- JavaScript-syntax kontrollerad. Den fasta TEST-adressen använder samma HTML som versionssidan och laddar huvudapp v36.93 samt oförändrad DA-modul v36.92 med ny cacheparameter.

Ingen verklig kundritning för detta nya kort har tillhandahållits. Matchningstestet använder en genererad ritning. Kundens PDF publiceras inte. Dörrautomatikregeln och dess godkända modul är oförändrade; äldre versioner bevaras. Kontrollflöde och native iOS/TestFlight orörda.
