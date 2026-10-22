# Projektering 2.2 – flytta och forma direkt

Tillsyno Projekt under Testversioner öppnar den nya redigeraren. Tidigare versioner av projektering, Avläsning, SmartMatch och Kontrollflöde ändras inte.

## Arbeta på ritningen

1. Öppna din PDF eller exemplet med 50 dörrar. Sök exempelvis GS65 i stencilbiblioteket och tryck där dörren finns, eller dra stencilen till ritningen.
2. Dra en befintlig stämpel direkt för att flytta den, även när stämpelverktyget är aktivt. Dra tom yta för att flytta ritningen. Mushjulet zoomar kring pekaren; på pekskärm används två fingrar för zoom.
3. Välj en stämpel och dra ett av de fyra runda handtagen för att ändra storlek. Proportionerna och placeringens mittpunkt behålls. Under **Vald markering → Storlek gäller** väljs alla dörrstämplar, samma beteckning eller bara denna.
4. **Alla dörrstämplar** är standard. GS1, GS65 och andra dörrkortsstämplar får samma bredd och höjd på alla sidor. Nya placeringar följer storleken. DA/DS och andra symboler ändras tillsammans med sin egen beteckning. En låst berörd stämpel måste låsas upp före gemensam storleksändring.
5. Högerklicka för att öppna dörrkort, kopiera, klistra in, duplicera, ändra storlek, redigera stencil, låsa eller ta bort. Högerklick på tom rityta kan placera den valda stämpeln där. Shift-drag på tom yta markerar flera; Ctrl/Cmd+A markerar sidan.
6. Dörrkortet visas automatiskt efter placering. Dubbelklicka eller dubbeltryck på en dörrstämpel för att fylla i det gemensamma kortet. Spara dörrkortet för att använda innehållet för alla dörrar med samma beteckning. Automatisk visning kan stängas av under **Verktyg**.
7. Pil och stämpel ligger alltid framme. Under **Verktyg** väljs övriga snabbverktyg: egna stenciler, nya dörrkort, ångra/gör om, kopiera, radera, låsa, rotera, justera och fördela. Valet sparas med projektet.

**Rutnät** är det tidigare valet Fäst. Det avrundar placeringen till 5 PDF-punkter. Stämpelstorlek är oberoende av ritningens visningszoom.

## Sparning och kompatibilitet

Placeringar, gemensam storlek och verktygsval sparas atomiskt lokalt efter slutförd åtgärd. Dörrkort har fortsatt ett uttryckligt sparsteg och osparade ändringar skyddas vid byte. En storleksgest är ett ångrasteg; lås och sidkanter kontrolleras på samtliga berörda sidor före sparning.

Spara projekt ger en flyttbar JSON-kopia med originalritning. Exportera PDF ger sökbara stämplar och sparade dörrkort samt redigerbart projektinnehåll för återöppning. Nya inställningar följer JSON, PDF och lokal återöppning. Äldre schema 2-projekt öppnas med standardinställningar och behåller sina befintliga mått tills användaren ändrar storlek.

Nya versionerade filer för skal, data, canvas och app används från `smartmatch-projektering.html`. Befintliga lagrings- och PDF-moduler återanvänds med den nya datamodellen. Behörighetskontrollen är oförändrad.

## Verifiering

Genererade PDF-underlag används i testerna. De nya data-, canvas- och webbläsartesterna finns i `tests/smartmatch-projektering-v2-2-*.cjs`. Webbläsarflödet täcker dator, iPad- och iPhone-bredder, touchpanorering och tvåfingerzoom, stämpelflytt i placeringsläge, gemensamma mått över flera sidor, högerklick, dubbeltryck utan genomklick till produktval, verktygsval, historik, lås och återöppning via PDF/JSON/IndexedDB. Befintliga tester för lagring och PDF används också.

Pekskärmstester körs i Chromium med emulerad touch; fysisk Safari/iPhone har inte testats i denna ändring.
