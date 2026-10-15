# CE-startsida – Tillsyno v2.4.313

Beställt 15 oktober 2026: sparade projekt ska vara gömda tills listan öppnas, Fortsätt senaste projekt ska bort, och Nytt projekt ska gå direkt till en tom arbetsyta utan extra dialog.

Startsidan har nu två åtgärder: Öppna projekt-PDF och Nytt projekt. Sparade projekt ligger i en vanlig hopfällbar details/summary-sektion med antal och öppna/stäng-pil. Den är stängd varje gång projektmenyn öppnas. Listans befintliga öppna-/raderingsfunktioner bevaras.

Nytt projekt anropar den befintliga arkivera-först-funktionen direkt. Eventuellt arbete sparas i historiken innan state och mallar nollställs. Ett lagringsfel avbryter bytet och återställer projektet. Den extra nyprojekt-dialogen och Fortsätt-knappen har tagits bort från DOM och kontrollern. Ingen ändring av projektformat, dokumentinnehåll, signaturer, CE-godkännanden eller ZIP-logik.

Verifierat i riktig webbruntime: skapa projekt med beställaruppgifter och dörr, stäng, öppna dold historik, starta nytt med ett klick, kontrollera tom arbetsyta och återöppna det tidigare projektet med uppgifter och dörr kvar. Ingen dialog. Layout vid 390/768/1366 px och återöppning av sparade projekt offline. Webben omfattar även mobil-/iPad-webbläsare. Den separata native-källan saknar CE och får endast motsvarande gemensamma versionsmärkning.
