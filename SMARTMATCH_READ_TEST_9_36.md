# Avläsning TEST 9.36

SmartMatch och avläsningen använder en kompakt arbetsyta. Appens HTML-dialoger öppnas som arbetsvyer under sidhuvudet utan modal bakgrund eller flytande ruta. Underliggande vy behåller storlek och tillstånd, blir inaktiv under redigering och återställs vid stängning. Formulär, avbryt och Escape behålls. De två browser-confirm-fallen i avläsningen ersätts av uttryckliga bekräftelser i arbetsytan.

Verktygsmenyerna visas i sitt verktygsområde. Centrala knappar har kortare namn och enhetliga SVG-ikoner. Längre hjälpförklaringar samlas under Info; fel, varningar och beslutsunderlag behålls. Tätare rubriker, verktyg, tabeller, arbetsrader och avläsningssteg. Telefon och touch behåller större tryckytor och radbrytning.

Isolerad TEST 9.36: tidigare versioner och kontrollflödet ändras inte. Operativsystemets filväljare/sparfönster påverkas inte.

Verifierat i Chromium:
- Dator och emulerad iPad/iPhone: hela projektflödet, läsning, GS-urval, hopfällda kort, avdelare, visningsområde, bockar/tider, export och återöppning.
- Ingen native modal vid avläsning eller nästlad områdesredigering; parent-vyn återställs.
- Separat vytest: nästlade formulär, bekräfta/avbryt/Escape och återaktiverad arbetsyta.
- Egna punkter, kopiera till samma dörrkort, extra tid och ångra alla bockar.
- Offline-cache. Visuell kontroll av kompakt avläsning och telefonens verktyg/radbrytning.
