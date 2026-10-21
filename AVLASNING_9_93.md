# Avläsning 9.93 – läs stämpelns egen beteckning

En PDF-stämpels beskrivande `/Subj` kan skilja sig från den kod som visas. Samtidigt kan sidans vanliga PDF-text innehålla rumsnummer, rumsnamn och ytor bakom stämpeln. Att läsa hela texten i stämpelns rektangel kan därför ge en annan sträng än den synliga beteckningen, särskilt för flera textrader.

## Ändring

- Ny isolerad stämpelläsare behåller metadataindexet och kan läsa texten i en synlig `/Stamp`-annotations normala `/AP`-innehåll. Även tillståndsberoende utseende via `/AS` stöds. Beskrivningar ersätts inte med hårdkodade synonymer.
- Stämpelformer kopieras till små tillfälliga PDF:er, högst 32 per omgång och 8 MB exporterad data. PDF.js läser själva stämpeltexten, utan ritningens bakgrund, helsidesrendering eller OCR. Källdokumentet ändras inte. Tillfälliga dokument och sidresurser frigörs vid framgång, fel och avbrott; resultat återanvänds under samma förberedelse.
- En exakt befintlig metadatakod återanvänds. Annars får endast stämpelns **hela** egenavlästa beteckning fylla en beskrivande metadataetikett. Motstridiga kodkällor förblir olösta. Dubblett-, konflikt-, avmarkerings- och överlämningsskydd återanvänds.
- Stämplar vars tryckta beteckning saknar exakt kortmatchning får en synlig varning. Användaren väljer kortet i **Sök / koppla manuellt** och söker den tryckta texten. Olika suffix och förkortningar slås inte ihop automatiskt.
- En vanlig textträff med rumsnummer ovanför och rumsarea i m² under behandlas som ett möjligt rumsnamn. Träffen behålls för granskning men väljs inte automatiskt. En bekräftad fysisk stämpel har fortfarande företräde, och vanliga ritningsbeteckningar utan denna rumskontext behåller tidigare stöd.

Rättningen används i Avläsnings ritningssökning och manuella komplettering. Separata 9.93-filer bevarar 9.92. Startsida, fast testadress och offlinecache följer 9.93 (app 2.4.463). Tidigare läsmallar kan läsas; nya mallar skrivs till 9.93:s egen nyckel. Inga nya projektformat eller externa avläsningstjänster införs.

## Verifiering

- `tests/smartmatch-read-appearances-v9-93.cjs`: riktig PDF.js-läsning av genererade stämpelformer med beskrivande metadata, ÅI och flera rader, tillståndsberoende utseende, rumstext bakom stämpeln och upprepade positioner. Källans objektantal bevaras. Cache, dold stämpel, suffix, olika stavning, motstridiga koder, manuell granskning av rumsnamn, resursfrigöring och avbrott verifieras utan OCR.
- `tests/smartmatch-read-appearance-browser-v9-93.cjs`: den faktiska fasta testsidan i Chromium med dator/mus och iPad/pekprofil. Markera, koppla en position, sök fler via stämpelns egna PDF-innehåll och koppla rätt kort. Beskrivande metadata och bakomliggande rumstext ingår i fixturen; andra bakgrundsfärger, vanlig text och suffix väljs bort av det markerade exemplet. Inloggning/PIN simuleras som redan verifierade.
- `tests/smartmatch-read-bulk-v9-93.cjs` samt befintliga renderer-, raster-, manuella kopplings- och handofftester körda mot de nya modulerna. Syntax, resursreferenser och diff kontrollerade.
- Den bifogade projekt-PDF:en undersöktes och jämfördes lokalt före/efter rättningen. Dess fil, extraherade text, positionsdata och bilder ingår inte i ändringen. Fysisk Safari/iPad har inte verifierats.
