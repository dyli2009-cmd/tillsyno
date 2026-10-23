# Projektering 2.18 – text och pilar

T-knappen placerar en textruta på ritningen. En kompakt panel låter användaren ändra text, teckenstorlek, fetstil, textfärg, bakgrund/genomskinlighet, kantfärg/kantbredd, rundning och mått. Preset-valen Ljus, Mörk och Röd ram ger läsbara kombinationer direkt.

En text kan ha upp till 20 pilar. Lägg till pil väljer pilspetsens läge på ritningen. Dra textrutan för att flytta den, hörnhandtagen för att ändra storlek och pilspetsarna för att peka. Pilarnas mål behåller sin position när texten flyttas. Ett tryck utanför avmarkerar. Panelen kan stängas med bocken. Duplicera, radera och ångra stöds; enskilda pilar kan tas bort.

Texter och pilar sparas i lokalt projekt, portabel projektfil och den redigerbara projekt-PDF:en. PDF-utdata använder vektorer och sökbar text, inklusive beskurna och roterade original. Inget dörrkort eller materialantal skapas av en textmarkering. Projekt med textmarkeringar får dataschema 3, vilket hindrar äldre arkiverade versioner från att öppna och sedan spara bort textinformationen. Aktuella ingångar stöder både tidigare schema 2 och schema 3.

## Kontroller

- `tests/smartmatch-projektering-v2-18-annotations.cjs`: datavalidering, layouter, flera pilar, project/PDF round trip, sökbar text, roterad sida, dragning/skalning/pilspetsar, avbrott, avmarkering och placeringsverktyg via pointer- och native touch-händelser.
- `tests/smartmatch-projektering-v2-18-inspector.cjs`: verkliga panelhändelser, text/färg/storlek/genomskinlighet, fokuserade ändringar, flera pilar, duplicering, radering och ångra.
- Befintliga kontroller för stenciler, dörrkort, touch och zoomskärpa körs också.
- PDF-rendering har granskats visuellt. DOM-adaptern är inte en fysisk Safari- eller fullständig webbläsartest; kontroll på iPhone/iPad återstår.
