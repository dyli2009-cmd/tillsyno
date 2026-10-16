# Ritningsverktyg v2.4.365 – bildrensning även vid Spara PDF

## Problem och ändring

Analysen kunde visa uppskattade bilddubbletter, samtidigt som **Spara PDF** byggde en ny arbetskopia med vanlig ompackning utan bildåteranvändning. Bildrensningen kördes tidigare bara via **Rensa förlustfritt och mät**. En misslyckad ny mätning/rensning kunde dessutom lämna en tidigare cachad arbetskopia tillgänglig för sparande. Dessa kodvägar är bekräftade; orsaken i användarens egen stora PDF är ännu inte bekräftad.

**All förlustfri export** genom Ritningsverktyg återanvänder nu identiska bildobjekt och verifierar kvarvarande sidinnehåll och dokumentdata. Det gäller direkt **Spara PDF**, **Mät exakt** och underlaget för uppdelning. Den särskilda rensningsknappen finns kvar för analysrapport, avbrott och resultat före sparande.

En ny exportberäkning rensar den tidigare exportcachen innan arbetet börjar. Om rensningen eller kontrollen misslyckas kan sparandet därför inte falla tillbaka till en äldre cachad fil. Felet visas och ingen ny PDF laddas ner. Sparandets slutmeddelande visar faktisk storlek före och efter, samt när originalfilen har behållits.

Uppskattade bilddubbletter är fortfarande ett uppskattat utrymme. Den faktiska besparingen beror även på hur hela PDF-filen är packad. Originalets utseende, text, stämpeluppgifter, lager och bilagor ska bevaras. Signerade filer behåller befintligt skydd. Användarens egen stora PDF är inte tillgänglig för test.

## Verifiering

`tests/drawing-analysis-browser.cjs` testar nu direkt sparning utan analys/rensningsklick och kontrollerar att den sparade filen saknar extra identiska bildobjekt. Testet framkallar även ett verifieringsfel efter en tidigare lyckad export: ingen cachad fil får laddas ner; en ny lyckad rensning ska sedan gå att spara. PDF.js jämför verkliga pixlar, text och markeringar, och PDF-lib kontrollerar formulär, bilagor, lager och projektdata.

Samtliga flöden passerade i dator-, iPhone- och iPad-vyer. Befintliga tester för export, bildimport, beskärning, uppdelning och markerad textgruppering passerade också. Ingen ändring av SmartMatch, Kontrollflöde, auth eller native-projektets källkod.
