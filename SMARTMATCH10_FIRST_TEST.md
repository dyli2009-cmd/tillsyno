# SmartMatch 10 – fristående första test (2026-10-17)

## Syfte och avgränsning
En tredje, separat SmartMatch-sida utan ingrepp i ordinarie SmartMatch, Avläsning TEST 9.5, Projektflöde eller Kontrollflöde.

**Filer:** `smartmatch10.html`, `smartmatch10.css`, `smartmatch10.js`. 
Egen lokal lagringsnyckel: `tillsyno-smartmatch10-cardfirst-v1`. 
Befintlig inloggnings- och modulbehörighetskontroll används oförändrad. Original-PDF:er skrivs aldrig över.

## Arbetsgång

1. Välj en eller flera PDF-filer med dörrkort. Tryck **Hitta alla dörrkort**. Granska listan. För bildbaserade PDF-filer: välj **Bildläs saknade kort**. Vid missad rubrik kan en kortsida och dess beteckning anges manuellt. Korten kan korrigeras, granskas och felaktiga förslag tas bort.
2. Välj ritnings-PDF eller **Använd samma PDF**. Tryck **Hitta märkningar** (PDF-text + anteckningar). Vid skannade stämplar: välj **Bildläs ritningsstämplar**. Vid utebliven träff: **Markera stämpel** och klicka dess position på ritningen.
3. Granska och godkänn träffar. Bara hela beteckningar matchar; t.ex. WC skiljs från HWC och GS2 från GS20. Dubbla dörrkort med samma kod kräver användarval. Varje fysisk position behåller separat kontrollstatus, medan original, produktuppgifter och positionerna nås från rätt dörrkort.
4. **Spara lokalt** lagrar kortregistret, kopplingar och status på denna enhet. Öppna samma original-PDF:er igen för att återställa tidigare kopplingar utan ny avläsning. **Exportera projektdata** ger separat JSON-fil som backup, inte en komplett fristående PDF.

## Verifiering

- Kodens JavaScript-syntax har kontrollerats.
- Isolerade automatiska logiktester: registrering av en tabellrubrik och två produktenheter; helkodsnormalisering; uteslutning av "Separat Dörrkort"; unika dörrpositioner för 25 respektive 35 syntetiska testträffar; dubblettnamn blockeras från automatisk koppling. Alla dessa tester gick igenom.
- De två bifogade PDF-exemplen har granskats med en separat PDF-textavläsare. Båda innehåller 7 olika dörrkort. Den ena ritningssidan har 25 relevanta positioner, den andra 35. Det är **referensvärden för kommande webbläsartest**, inte ett påstående att hela webbläsarflödet redan är verifierat.

## Avgränsningar som återstår att testa

- Bildbaserade original och PDF-stämplar behöver verifieras med Tesseracts svenska/engelska OCR-filer i en riktig webbläsare, inklusive riktiga koordinater, filstorlek och tidsåtgång.
- Nya layouter med flera dörrkort bredvid varandra, roterade/ovanliga tabeller och legendstämplar behöver regressionstest och manuell granskning.
- Inga original-PDF:er sparas i webbläsarens lokala projektmetadata; användaren måste ha kvar och återvälja sina PDF-filer.
- Första testet skapar ännu inte redigerbar PDF eller produktprotokoll. Produktinformation på kortet kan redigeras i testets arbetsdata.
- GitHub-branch och källkod är inte liktydigt med en verifierad, publicerad webbapp.
