# Avläsning TEST 9.85 – spara PDF när målfilen är låst

Användaren fick `Kunde inte spara PDF: An attempt was made to modify an object where modifications are not allowed.` efter förberedd PDF. Texten motsvarar `NoModificationAllowedError`, som File System Access kan kasta när den valda filen eller sparplatsen inte tillåter skrivlås. Det separata tillägget om materialutkast beskriver PDF-innehållet och är inte orsaken till skrivfelet.

Spara PDF, Spara som och Spara i öppnad PDF återanvänder nu den redan verifierade, oföränderliga PDF-filen om ett sådant låsfel uppstår. Den laddas ned som en ny `-kopia.pdf` utan att filväljaren eller samma låsta målfil används igen. Det låsta filhandtaget släpps. Förberedd PDF, materialutkast och osparad arbetsstatus bevaras. Meddelandet säger att nedladdning av en kopia har startat; det påstår inte att en nedladdad fil har verifierats på disk.

Knappen Ladda ner kopia är synlig i sparvyn och fungerar direkt efter att PDF:en förberetts. Den går förbi File System Access-väljaren, även på dator. Vid vanligt Spara PDF fortsätter skrivning och återläsningskontroll av den valda filen som tidigare när destinationen fungerar.

Endast det identifierade låsfelet utlöser automatisk kopienedladdning. Avbruten dialog, full disk och andra fel behandlas fortsatt som avbrott/fel. En ändrad exportrevision eller ett annat öppnat projekt får aldrig starta nedladdning av en äldre fil.

Version 9.85, intern build 36.228 och app/cache 2.4.453. Tidigare 9.84 bevaras; startsida och fast testadress följer 9.85.

## Verifiering

`tests/smartmatch-locked-pdf-save-v9-85.cjs` passerar i Chromium med riktig förberedd projekt-PDF och injicerade låsfel i filväljare, createWritable, write och close. Varje fall ger en nedladdad kopia med exakt samma PDF-byte och projektmetadata. Materialutkast och meddelandet om utkast bevaras. Streamavbrott sker vid write-/close-fel. Förberedd export och osparad status finns kvar. Synlig Ladda ner kopia klickas via UI och anropar inte filväljaren. Avbrott, generiskt skrivfel och projektbyte under väntande skrivning ger ingen automatisk nedladdning.

`tests/smartmatch-read-save-v9-85.cjs` verifierar verkliga sparfunktioner för primär sparknapp, Spara som och ursprungsfil, med fördröjda filoperationer, tomma/korrupta återläsningar och nya ändringar under sparning. Låsfall ger identiska kopior, medan avbrott, kvotfel och inaktuella revisioner inte ger fallback. Material-/positions- och PDF-namnkonflikttester samt exportkö, metadataskrivare och lokal sparning passerar. Det är inte verifiering av användarens verkliga låsta fil eller fysisk Safari.
