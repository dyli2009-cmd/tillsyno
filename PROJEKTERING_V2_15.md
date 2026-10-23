# Projektering 2.17 – dubbeltryck på pekskärm

- På iPhone och iPad väljer första trycket stämpeln; två snabba tryck på samma stämpel öppnar dörrkortet.
- Med mus öppnar ett klick dörrkortet. Dragning flyttar stämpeln utan att öppna kortet. Skift-klick används för flerval.
- Dragning, nypzoom, bakgrundstryck, byte av stämpel och avbrutna gester bryter dubbeltrycket. Retur öppnar fortfarande kortet med tangentbord.
- Synlig version och resursversioner är höjda till 2.17. Hjälptexter beskriver samma beteende.

Verifiering: `node tests/smartmatch-projektering-v2-17-taps.cjs` kör riktiga pekar- och touch-händelser genom renderaren med en DOM-adapter, inklusive kompatibilitetsklick, dragning och nypzoom. Testet ersätter inte fysisk Safari-testning på iPhone/iPad.

## Tidigare: Projektering 2.16 – välj stencil utan att skapa dörrkort

- Ett klick i stencillistan väljer placeringsverktyget. Det skapar inget dörrkort eller tomt redigeringsutkast. Befintliga kort kan fortfarande öppnas.
- Första placeringen på ritningen skapar kortet. Det går även att avsiktligt använda Nytt dörrkort.
- Alla gula standardstämplar för dörrkort är rundare, med proportionen cirka 1,4:1. Tidigare standardstorlekar uppdateras; personliga färger och storlekar bevaras. Befintliga markeringar ryms inom sina tidigare gränser.
- DBL / WC ligger först under Dörrkort och samlar DBL, HWC och WC. GS1–GS100 är separat. DA ligger under Övrigt.
- Version 2.16 visas i sidhuvudet och längst ned till höger, även via äldre aktuella ingångar. Höj synlig version och resursversioner vid kommande ändringar.

## Verifiering

- `node tests/smartmatch-projektering-v2-16-selection.cjs`: verkliga val- och placeringsfunktioner med UI-/lagringsadaptrar, inga kort eller utkast vid val, skapande vid placering, befintliga kort, avbrutet byte och rundare proportioner.
- `node tests/smartmatch-projektering-v2-15-text-cards.cjs`: grupper, sparade data, PDF-text och återöppning.
- Fullständig webbläsar-/Safari-testning har inte körts i miljön.
