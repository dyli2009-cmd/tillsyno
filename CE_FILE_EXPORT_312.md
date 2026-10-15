# CE-märkning: valda filer i ZIP – Tillsyno v2.4.312

Beställt 15 oktober 2026: välj alla eller vissa dörrar, välj dokumenttyper och spara en ZIP med en separat fil per dörr/dokument, utan undermappar.

I **Dokument & export → Spara valda filer (ZIP)** öppnas en vanlig sektion i arbetsytan. Alla dörrar är förvalda; Loggbok, EG-försäkran och Egenkontroll är förvalda dokument. Användaren kan ändra båda valen. Räknaren visar antal filer innan export. Skapa ZIP, Spara ZIP och Dela ZIP är separata steg så att delning på mobila webbläsare sker genom ett användarklick.

Exempel: `EG-försäkran-57617-14-24-1.pdf`. Tio dörrar och tre dokument ger 30 filer direkt i ZIP-roten. Namnkollisioner får suffix och skriver inte över en annan dörr. CE-skylt behåller sitt befintliga bild-/PDF-format. DEFLATE nivå 6 används; redan komprimerade PDF-filer kan minska lite i storlek.

Exporten använder samma compose/PDF-rendering som individuell PDF-export. Projektformat, originalmallar, granskningar och godkännanden ändras inte. En komplett, slutförd dörr krävs fortfarande för den befintliga mappexporten. Den nya filexporten kräver bara valda dokument; den kan inte markera en ofärdig dörr som färdig. Egenkontroll med valda punkter kräver befintliga punktsignaturer. Saknade/stale dokument stoppar hela ZIP-exporten med ett tydligt fel; inga filer hoppas över tyst. Ändringar under export eller före nedladdning kräver en ny ZIP.

Verifierat med `tests/ce-file-export-v312.cjs`: verklig PDF-renderare + JSZip, 30 platta PDF-filer och korrekt individuell text, urval av dörrar/dokument, saknad mall/signatur, oförändrad helhetsexport, namnkollisioner, skydd mot ändrade projekt, inbyggd sektion utan dialog samt 390/768/1366 px. ZIP genereras offline och CE-sidan återöppnas offline med de nya resurserna. Syntetiska formulär med kryss och handritad signatur renderade för visuell granskning. Inga privata kundfiler publiceras.

Webbändring, inklusive mobilwebb. Den separata iOS-källan innehåller ännu ingen CE-modul; endast den gemensamma versionsmärkningen speglas där. Denna release tillför inte CE till TestFlight och någon signerad native-byggnad har inte verifierats här. Övriga moduler får enbart den gemensamma versions-/cachehöjningen.
