# SmartMatch – Avläsning TEST 9.12

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-12.html`. Intern version: `36.155-READ-TEST`. Tillsyno-version: `v2.4.379`.

## Lokal säkerhetskopia

I TEST 9.11 fanns **Spara lokalt** kvar, men den låg under den stora PDF-exportens förloppsruta. På en mindre skärm, eller medan en tung fil bearbetades, kunde knappen hamna utanför den synliga delen och uppfattas som borttagen.

TEST 9.12 visar **Spara arbetet direkt → Spara lokalt nu** före exportförloppet. Den lokala kopian väntar inte på PDF-exporten. Knappen visar `Sparar lokalt…` och därefter `✓ Sparad lokalt`, med en separat förklaring bredvid. Kopian innehåller original-PDF:en och projektets kompletta aktuella arbetsutkast i samma webbläsare. Den är en säkerhetskopia på enheten; för överföring till en annan dator används fortfarande den verifierade **Spara PDF**-filen.

Lokala projekt från TEST 9.11 kopieras vid behov till TEST 9.12:s egna lagring utan att 9.11-källan ändras eller skrivs över.

## Verifiering

- Ett telefonprov på 390 × 667 pixlar håller PDF-exporten avsiktligt väntande, kontrollerar att **Spara lokalt nu** ligger inom den första synliga skärmen och sparar projektet i det lokala arkivet.
- Metadata- och PDF-sparproven från 9.11 körs mot 9.12, inklusive stor Unicode-projektdata, skrivfel, tom fil, felaktig läsning tillbaka och projektbyte under sparning.
- Portabel återöppning provas i ren webbläsare. TEST 9.11:s lokala arkiv samt aktiv PDF med granskat utkast återställs till 9.12 utan OCR eller ny matchning.
- Det genererade 24,2 MB-provet med 79 sidor, 74 kopplingar och 3 060 000 OCR-tecken körs på dator och iPad. PDF-export, nedladdning, bild-/metadataretention, återöppning och blockskrivning är oförändrade.

## Avgränsning

Ändringen gäller endast den separata Avläsning TEST-seriens aktiva version. Produktläsning, GS-ansvar, ritningsmatchning, ordinarie SmartMatch, beta 10, DA/SLR, Ritningsverktyget, Kontrollflöde och auth ändras inte.
