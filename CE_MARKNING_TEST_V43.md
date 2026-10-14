# CE TEST 43 – PDF flatten med signaturfält utan fel

## Orsak
- Originalet Riskanalys Svängdörr V1.0 innehåller 1 PDF-signaturwidget.
- Egenkontroll Svängdörr V1.0 på fem sidor innehåller 27 signaturwidgets.
- PDF-lib:s form.flatten() kastar 'Unexpected N type: undefined' på osignerade AcroForm Sig-fält som saknar Appearance N. Förra TEST 42 hjälpfunktionen anropade flatten utan att hantera dessa.

## Ändring
- Behåll befintlig signaturpositionsextraktion och ifyllda svar först.
- Skapa en isolerad PDF-kopia för utplattning och ta bort endast /Sig-fält och deras widget-annotationer genom låg nivå AcroForm-trädkirurgi, eftersom pdf-lib form.removeField() också kan kasta på samma signaturfält.
- Platta till återstående text-, radio- och kryssrutor med updateFieldAppearances true; lägg därefter in projektunderskrifter grafiskt på de positioner som samlats in innan borttagning.
- Om en annan felaktig annotering mot förmodan gör utplattningen omöjlig används en oskadad ifylld PDF som reserv i stället för att stoppa Visa PDF och ZIP. Fellogg visas i konsolen.
- Samma compose() används av Visa PDF, Spara PDF och ZIP, så alla tre får rättningen.
- SmartMatch och Kontrollflöde orörda.

## Kontroller
- Inspekterade tidigare insända originalmallar: Riskanalys 5 sidor, 109 widgets inklusive 1 signatur; Egenkontroll 5 sidor, 143 widgets inklusive 27 signaturer.
- Återskapade faktiska pdf-lib-felet 'Unexpected N type: undefined' med syntetisk PDF som har text, kryss, 1 respektive 27 osignerade signaturwidgetar.
- Den nya hjälpfunktionen öppnar, plattar till och sparar samma femsidiga test-PDF:er utan undantag, med 0 kvarvarande formfält.
- JS-syntax och version/källor verifieras. Visuell iPad-kontroll med användarens pågående projektfil återstår.