# CE TEST 42 – fix Visa PDF / Skapa ZIP på iPad

## Rättat
- Orsak till ReferenceError "Can't find variable: flattenDocument": `compose(cat,door)` försökte anropa en PDF-utplattningsfunktion som saknades efter tidigare omstrukturering.
- Ny `flattenDocument(pdf)` använder PDF-lib `form.flatten({updateFieldAppearances:true})` så ifyllda kryss och text visas i både förhandsvisningen och exporterade filer. Funktionsfel förklaras med svenskt meddelande.
- Samma PDF-komposition används av både Visa PDF och Exportera CE-underlag; felet rättas därför på ett gemensamt ställe.
- ZIP-bygge ger nu status efter varje dörr/dokument och låter webbläsaren uppdatera mellan dokument. `streamFiles:true` används tillsammans med STORE för korrekt ZIP-kompatibilitet på Safari/iPad.
- Inga ändringar i den separata funktionen för projektöverlämning. Befintlig huvudsida `Spara PDF` skapar fortsatt en redigerbar projekt-PDF med metadata och bilagor för en kollega, och `Öppna PDF` läser den. `Spara lokalt` sparar enhetsinternt. Diskussion om delat arbete avvaktas.

## Test
- Appens inkluderade `pdf-lib` verifierad på riktiga PDF-data: kryss och text blev bevarade vid flatten, och femsidig PDF kunde skapas och läsas om.
- Appens inkluderade `JSZip` verifierad på riktig fil: flera PDF-sidor i ZIP öppnade igen. Även radio/text → flatten → ZIP med `streamFiles:true` testad.
- JavaScript-syntax kontrollerad. Fysisk iPad-test på användarens verkliga mallar återstår.
