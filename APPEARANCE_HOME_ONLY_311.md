# Färger och enhet endast på startsidan – v2.4.311

Inställningsknappen visas endast på startsidans index-/rotadress när appHome/homeMode faktiskt visas. Den döljs när man lämnar startsidan, även i samma HTML-arbetsyta. Knappen flyttas inte längre in i verktygs-/SmartMatch-/CE-/auth-/adminrubriker. Programmatiskt öppningsanrop kan inte öppna inställningsvyn från en arbetsyta. Om inställningsvyn är öppen när startsidan lämnas stängs den.

Teman, enhetsval, lagringsnycklar och tillämpning av sparade inställningar på arbetsvyerna behålls. Ikondekoration och versionsrader fortsätter fungera. Inga domän-, ritnings-, PDF- eller authfunktioner ändras. Produktionsmodulens separata utseendekopia får samma regel. TEST v16 med historiska versioner bevaras.

iOS-produktionsmodulen speglas. Startsidan i iOS får motsvarande befintliga utseendelager/knapp för att inställningarna ska kunna väljas där i stället för i arbetsytan; samma lagringsnyckel som produktionsmodulen. Native filhantering och safe-area behålls. Ingen signerad TestFlight-build eller fysisk enhet verifieras här.

Verifierat i Chromium: välj/spara färg och enhet på Hem, dölj/återvisa vid homeMode-byte, dold/ej öppningsbar på Kontrollflöde, produktionsrevision, Ritningsverktyg, SmartMatch och CE, inställningar kvar vid navigering/återöppning samt Hem vid 390/768/1366 px.
