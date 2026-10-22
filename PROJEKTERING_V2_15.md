# Projektering 2.16 – välj stencil utan att skapa dörrkort

- Ett klick i stencillistan väljer placeringsverktyget. Det skapar inget dörrkort eller tomt redigeringsutkast. Befintliga kort kan fortfarande öppnas.
- Första placeringen på ritningen skapar kortet. Det går även att avsiktligt använda Nytt dörrkort.
- Alla gula standardstämplar för dörrkort är rundare, med proportionen cirka 1,4:1. Tidigare standardstorlekar uppdateras; personliga färger och storlekar bevaras. Befintliga markeringar ryms inom sina tidigare gränser.
- DBL / WC ligger först under Dörrkort och samlar DBL, HWC och WC. GS1–GS100 är separat. DA ligger under Övrigt.
- Version 2.16 visas i sidhuvudet och längst ned till höger, även via äldre aktuella ingångar. Höj synlig version och resursversioner vid kommande ändringar.

## Verifiering

- `node tests/smartmatch-projektering-v2-16-selection.cjs`: verkliga val- och placeringsfunktioner med UI-/lagringsadaptrar, inga kort eller utkast vid val, skapande vid placering, befintliga kort, avbrutet byte och rundare proportioner.
- `node tests/smartmatch-projektering-v2-15-text-cards.cjs`: grupper, sparade data, PDF-text och återöppning.
- Fullständig webbläsar-/Safari-testning har inte körts i miljön.
