# SmartMatch SLR TEST 36.121 – kompakt projekt-PDF

## Problem
Användarens exporterade projekt-PDF var 141 MB. Kodgranskning visar två förstoringar i v36.120:
1. `SLR.saveTo()` bäddade in en separat komplett PDF per dörrautomatik × uppladdad SLR-mall, även när dokumentet saknade ifyllt innehåll.
2. `pdf-lib.attach()` behåller äldre exporterade SLR-filer i både `/Names/EmbeddedFiles` och `/AF`, så upprepade sparningar kunde skapa dubbletter och linjär tillväxt.

## Fix
- Behåll en gemensam originalmall per SLR-kategori som PDF-bilaga.
- Spara varje fysisk automatik och dess individuella kontrollsvar, datum, signerade data och status i det vanliga projekt-JSON som ingår i PDF:en.
- Skapa en separat statisk SLR-PDF-bilaga endast för kategorier med sparade fältvärden, explicita kryss, signatur eller status doing/done/completed. Tomma SLR-formulär byggs vid behov från den gemensamma mallen i appen.
- Produktlistor med verifierad GS behålls per automatik precis som tidigare.
- Vid återexport rensas bara filer med det egna och tidigare använda prefixet `slrtest-...-(mall|dokument|produktlista)-`. Namnträdet och `/AF` uppdateras tillsammans. Bilagor som tillhör kunder och andra moduler bevaras; okända hierarkiska PDF-namnträd lämnas orörda.
- Den befintliga prune-funktionen tar bort oåtkomliga gamla PDF-strömmar efter att filreferenserna rensats.
- Manifestets schema höjs till 5. Gamla sparade schema 4-filer är fortfarande läsbara.
- Verifieringen kräver fortfarande alla gemensamma mallar samt statiska dokument för ifyllda SLR-kategorier och per-dörr-produktlistor.

## Kontroll
Det syntetiska PDF-testet använde riktiga PDF-lib och den verkliga SLR-modulens `saveTo()/verify()`, 45 automatiker, 3 SLR-mallar och en annan PDF-bilaga. Tre på varandra följande exportomgångar gav:
- Tidigare kod: 111 114 B → 220 441 B → 329 698 B.
- Kompakt kod: 4 320 B → 4 328 B → 4 329 B.
- Samtliga tre gemensamma mallar, ifyllda loggboksdokumentet för rätt automatik och kundbilagan var kvar.
- Katalogens `/AF` uppdaterades och onåbara objekt prunades; storleken växte inte vidare.
- Testet bekräftar inte en viss storlek för användarens verkliga 141 MB-PDF. Användarens iPad/Safari ska användas för verifiering av den verkliga filen, alla SLR-svar och redigering efter återöppning.

Avgränsning: enbart fristående SLR TEST. Ingen ändring av GS-matchning, Kontrollflöde, ordinarie SmartMatch eller TestFlight. v36.120 finns kvar som återgång. Fast URL `smartmatch-slr-test.html` pekar på v36.121.
