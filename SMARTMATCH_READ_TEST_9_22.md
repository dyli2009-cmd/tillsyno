# SmartMatch Avläsning TEST 9.22

## Problem

En första produktavläsning kan missa en rad på ett enskilt dörrkort. Tidigare behövde användaren gå tillbaka till den gemensamma förberedelsen för att läsa om produkter. Kontrollistan i Avläsning TEST saknade också de vanliga SmartMatch-reglagen för att rätta text, tid och egna punkter.

## Ändring

- Det öppna dörrkortet har knappen **Läs om detta kort**.
- Omläsningen använder den sparade tabellmarkeringen på just kortets källsida.
- Ritningen söks eller bildläses inte igen.
- Endast nya GS-produkter läggs till efter granskningen. Befintliga punkter tas inte bort av omläsningen.
- Ritningskopplingar, bockningar, ändrade texter, egna punkter och egna tider behålls.
- Kontrollistan visar **＋ Punkt**, **Ändra**, **Ta bort** och tidsreglaget från ordinarie SmartMatch.
- Räknaren visar klara punkter mot det sammanlagda antalet, inklusive egna punkter.

## Arbetsgång

1. Öppna ett färdigavläst projekt och välj stämpeln för dörren som saknar en produkt.
2. Kontrollera att rätt dörrkort visas och tryck **Läs om detta kort**.
3. Appen öppnar kortets sparade arbetsområde och läser endast den sidan.
4. Granska de hittade GS-raderna och välj **Spara produkter**.
5. Nya punkter visas i dörrens kontrollista. Använd **Ändra**, **Ta bort**, **＋ Punkt** eller tidsreglaget om något behöver justeras manuellt.
6. Spara projektet för att bädda in kompletteringen i projekt-PDF:en.

## Bevarat

- TEST 9.21 och äldre filer, lokala projekt och IndexedDB-arkiv är oförändrade och kan öppnas som äldre källor.
- Omläsningen ändrar inte den sparade stämpelmatchningen eller andra dörrkort.
- iPadens zoom-, renderings- och minnesskydd från TEST 9.21 är oförändrade.

## Kontroll

Automatiska webbläsartester verifierar att endast ett källkort läses, att en saknad produkt läggs till och att länkar, bockningar, egna tider, egna punkter och andra dörrkort bevaras. Kontrollera dessutom flödet på en fysisk iPad i Safari med ett verkligt projekt innan TEST-versionen används i produktion.
