# Projektering 2.6 – grupperade dörrkort och enkla symboler

Stencilbiblioteket har två huvudval: **Dörrkort** och **Övrigt**. Dörrkort delas upp i GS1–GS100, DBL, VC/HVC och Andra dörrkort. Numrerade och utökade beteckningar följer sin familj; DBLB-OPPS ligger exempelvis i DBL. DGS100, WC/HWC och övriga egna kort finns i Andra dörrkort. Sökningen söker i alla grupper samtidigt.

Alla stenciler utan dörrkort samlas i Övrigt oavsett tidigare kategori. DA, DS, DFS, egna symboler och eventuella äldre DADS ligger där. Den tidigare kombinerade DADS-stencilen läggs inte tillbaka som en ny standard. Den som redan har den i ett projekt kan använda den och det går att skapa en egen med valfri beteckning.

Symbolerna visar endast sin kod på ritningen och i ritningens PDF-sidor. De visar inga objektnummer, modelltexter eller antal inne i stämpeln. Tryck, dubbelklick och Retur öppnar ingen produkt- eller kortdialog för en symbol. Markering, flytt, storlek, låsning, kopiering och borttagning fungerar fortsatt. Dörrstämplar öppnar sina gemensamma dörrkort och deras produktval som tidigare.

## Skapa en egen symbol

1. Välj Övrigt och tryck på plus eller Ny stencil.
2. Skriv beteckning och eventuellt namn. En liten fyrkant, 28 × 28 punkter, är förvald.
3. Välj färg, form och storlek. Räkna som anger hur symbolen bidrar till materialantalet.
4. Spara och placera symbolen på ritningen.

Ändring av en befintlig stencil behåller dess färger, mått och sparade uppgifter tills användaren ändrar dem. Grupperingen är en visningsregel; tidigare kategori, produktuppgifter, projektformat och lokalt sparade projekt ändras inte genom inläsning.

Materiallistan räknar fortsatt produkter från placerade dörrkort samt symboler som har en materialklassning. En symbol utan sparad modell räknas under sin kod, exempelvis DA eller DFS, utan krav på produktuppgifter. Tidigare uttryckligen sparade modeller och antal bevaras. Symboler med Ingen separat produkt räknas endast som markeringar. Armbågskontakter behåller faktor två. Samma beräkning används i app, CSV och material-PDF. Projekt-PDF:ens bilaga behåller äldre fullständiga produktuppgifter; när modell saknas visas symbolens kod.

Pekstyrningen från 2.5 bevaras: tvåfingerszoom, direkt flytt efter zoom, avbrutna gester och köad sparning. Nya versionerade filer används för app, skal, canvas, material och PDF. Data-/lagringsmodulerna och tidigare versioner bevaras. Inga bilder eller skärmbilder har skapats.

Verifiering: canvas-, material-, PDF- och webbläsarregressioner med dator och emulerad iPhone/iPad i Chromium. Kontrollerna omfattar grupper, global sökning, egna färgade fyrkanter, symboler utan aktivering, dörrkortens produktval, materialantal och återöppning via PDF/JSON/IndexedDB. Fysisk Safari har inte kunnat verifieras i miljön.
