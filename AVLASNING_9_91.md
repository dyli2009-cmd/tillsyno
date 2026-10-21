# Avläsning 9.91

Användaren rapporterade lång sökning och rubriken ”Avläsningen stoppades av ett fel”. Den fullständiga feltexten och ritnings-PDF:en saknas, så orsaken till just det felstoppet är inte bekräftad.

Bekräftat i koden: manuell sökning i 9.90 startade bildläsning som standard. Helritnings-OCR spelade dessutom om PDF:ens operatorer för varje överlappande ruta.

- Manuell kodsökning börjar nu med PDF-text och stämplar på samtliga ritningssidor. Bildsökning väljs uttryckligen, med förklaring i panelen. Resultaten anger fortfarande att bildtext inte kontrollerats i snabbsökningen.
- Helritnings-OCR renderar en återanvänd sidbild och klipper OCR-rutorna från den. Minnet begränsas till 12 miljoner bildpunkter som standard, högst 24 miljoner vid explicit inställning. iOS behåller sin befintliga gräns. Färgstämpelns separata högupplösta OCR finns kvar.
- OCR-fel släpper läsarens worker. Ritningsfel innehåller sidnummer. Timeouttexten anger 45 sekunder och möjliga nästa steg.
- Raster och rutor frigörs även vid fel. Tidigare kopplingar ändras inte av en misslyckad manuell sökning.

Verifiering: `smartmatch-stamp-reading-v9-91.cjs` med PDF.js och riktig rendering; `smartmatch-read-bulk-v9-91.cjs` med verkliga läsarfunktioner för urval, atomisk koppling, spara/återöppna samt fel/avbryt; `smartmatch-read-raster-v9-91.cjs` verifierar en rendering för många OCR-rutor, städning och sidnummer vid injicerat fel. OCR-svaren är stubbar, inte noggrannhetstest mot användarens ritning. Ingen garanti för att samtliga åtta saknade beteckningar hittas. Begränsad rasterstorlek kan minska detaljnivån på mycket stora sidor; en liten manuellt markerad yta kan då användas.

Befintliga main- och review-moduler från 9.90 återanvänds. Gamla versionssidor är oförändrade.
