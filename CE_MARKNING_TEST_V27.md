# CE-märkning TEST 27 – rena kryss från importerad PDF

- Vid import av en redigerbar CE-formulär-PDF rensas befintliga val för kryss-/radioknappar och gamla widgettillstånd (även om filen redan tidigare markerats som förberedd).
- Redigeringsvyn täcker gamla synliga kryss inom widgetrutorna med vitt och ritar endast appens aktuella kryss/ramar.
- PDF-exporten beräknar aktuella kryss från valda dörruppgifter **innan** formuläret plattas ut. Sedan täcks gamla widget-/PDF-kryss i varje ruta med vit bakgrund och en enda ren ram plus högst ett nytt X ritas på nytt. Den tidigare dubbla manuella X-ritningen och överlagringen med AcroForm-utseende är borttagen.
- För Riskanalys med den femsidiga mallen hanteras särskild koppling av öppnings-/stängningssidans 4.6.1 / 4.6.2-punkter via positionerna, utan att kryssen ritas två gånger.
- När Med glas/Utan glas väljs på nytt rensas först gamla kryss/radioval för aktuell dörr, sedan appliceras förvalen för den nya profilen. Väljs Ingen profil blir samtliga dessa val tomma. Fri sensortext, mått och andra projektfält sparas.
- Övriga CE-flöden, projektunderskrift, lokalt sparande, andra dörrar och tidigare TEST 26-filer lämnas orörda.

Testat: JS-syntax, markmålning (en X eller ingen), profilbyte och blankt läge. Begränsning: en helt platt bild-PDF utan redigerbara formulärfält kan ha kryss som inte är tekniskt identifierbara; då behövs den redigerbara originalmallen. Visuell test med original-Riskanalys-PDF på iPad återstår.
