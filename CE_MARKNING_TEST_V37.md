# CE TEST 37 – signaturer och fel på Egenkontroll-sidor

- Felorsak: Den äldre hjälpfunktionen `slrRefreshSignatureButton` anropades i alla fem PDF-sidor efter att rendering flyttats till `slrRenderSignPreview` i TEST 30. Funktionen saknades och gav ReferenceError varje gång en signaturruta på sidan skulle visas.
- Återinför `slrRefreshSignatureButton` som en enkel kompatibilitets-wrapper till den befintliga signaturvisningen. Återställd renderning av textbaserade och riktiga signaturfält i flersidig Egenkontroll.
- Riskanalys sida 5, punkt 4.7 Riskanalys utförd av – signatur: sparad projektunderskrift syns automatiskt i det fördefinierade signaturområdet.
- Vid PDF-export av Riskanalys används först en verklig signatur-widget om PDF-mallen har en. Om den femsidiga SLR-mallen saknar sådant fält används tryckt signaturområde på sida 5 som reserv. Ingen dubbelstämpel på sida 5.
- Endast CE TEST-filer ändrade. SmartMatch och Kontrollflöde oförändrade.

Verifiering: 5 simulerade Egenkontroll-sidor med PDF Sig-fält gav alla 5 sidor utan fel och med bild i varje signaturruta. Samma test med Tx-signaturfält gav 5 av 5. Riskanalys Tx-signaturfält gav 5 av 5 med bild. Äkta `slrSignatureFor` returnerar projektets sparade signatur till Riskanalys och markerade Egenkontroll-punkter, men lämnar omarkerad punkt och Loggbok utan underskrift. Praktiskt iPad-test och riktig PDF-export behöver verifieras av användaren.