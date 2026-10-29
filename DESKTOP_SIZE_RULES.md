# Tillsyno – gemensamma storlekar på dator

## Användarbeslut 15 oktober 2026

Vid nya datoranpassningar ska storleksskalan från Tillsynos första sida vara förebild. Referensen är den godkända startsidan i **v2.4.323**, dokumenterad i `DESKTOP_HOME_323.md` och implementerad under `body.homeMode #appHome` i `tillsyno-appearance.css`.

| Del | Datorstorlek |
| --- | --- |
| Centrerad yttre ram | Högst 700 px bred |
| Ramens luft | 28 px ovanför/under, 24 px på sidorna |
| Innehåll och valkort | Högst 640 px breda |
| Huvudrubrik | 28 px, radavstånd 1,25 |
| Titel i valkort | 20 px, radavstånd 1,3 |
| Beskrivning i valkort | 14 px, radavstånd 1,5 |
| Inledande brödtext, om den finns | 15 px, radavstånd 1,5 |
| Valkortets höjd | Minst 108 px |
| Luft i valkort | 18 px ovanför/under, 20 px på sidorna |
| Mellanrum mellan valkort | 14 px |
| Ikonruta | 60 × 60 px |
| Själva SVG-ikonen | 32 × 32 px |
| Hörn på valkort / ikonruta | 16 px / 14 px |

Kortets högra kolumn anpassas till innehållet: startsidans pil behöver 24 px, medan CE-startsidans text ”Öppna ›” behöver 70 px. Text, ikonruta och kortstorlek följer samma skala.

## När datorstorlekarna gäller

Använd samma villkor som den godkända startsidan:

```css
@media (min-width:1100px) and (hover:hover) and (pointer:fine)
```

Undanta uttryckligt enhetsval `phone` och `tablet`, även om skärmen är bred och mus är ansluten. Telefon och iPad behåller sin befintliga storlek. Samma benämningar, ikoner och valda färgtema gäller på alla enheter; storlek, placering och radbrytning får anpassas.

## Beställd sida i denna diskussion

**Kontrollflöde → Dörrautomatik / Lås → CE-märkning → första sidan**, med knapparna **Öppna projekt-PDF** och **Nytt projekt**.

Denna startsida använder ovanstående datorskala i v2.4.355. CSS är avgränsad till `body.ceProjectPickerOpen #ceProjectHome`. Referensen gäller storleken; CE-startsidans befintliga innehåll och funktion används. Projektarbetsytan efter Nytt projekt har egna befintliga mått.

## Regel för kommande arbete

Läs denna fil före nya storleksändringar för dator. Utgå från tabellen, avgränsa till den beställda sidan och jämför datorvyn med telefon/iPad. Kontrollera även bred touchskärm samt manuellt telefon-/surfplatteval. Bevara valt tema och gemensamma texter. Denna guide innebär ingen generell ombyggnad av redan godkända sidor.

Se även `DESKTOP_AREA_324.md`, `DESKTOP_CHECKLISTS_325.md` och `DESKTOP_DRAWING_HEADER_326.md` för områdesväljare, checklistval och ritningsstart.


## Ny avgränsad standard 29 oktober 2026

[UI_RULES.md](UI_RULES.md) gäller nu Kontrollflödets ordinarie arbetsytor i v2.4.501: 18 px vanlig text i rymlig datorvy och 16 px på telefon/iPad, med separat skala till 200 %. Äldre startsidesmått ovan fortsätter gälla sidor som ännu inte omfattas av den nya beställningen.
