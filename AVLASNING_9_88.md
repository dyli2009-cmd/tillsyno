# Avläsning 9.88 – stopp vid matchning på 0 procent

Användaren rapporterade att Matcha koder mot ritningen stannar på 0 %. Den exakta kundfilen och ett körningsspår finns inte tillgängliga, så den enskilda orsaken är inte bekräftad.

Kodgranskningen visade att färgsökningen i 9.86/9.87 spelade upp PDF-sidans rendering för varje överlappande delområde. Dessutom saknade flera väntesteg tidsgräns, och upplåsningen kunde vänta på en OCR-motor som aldrig startat.

- Färgsökningen renderar nu en begränsad sidbild en gång och läser samma överlappande delområden från den. Färger, hela koder och flerradiga stämplar behandlas fortsatt enligt samma regler. Bilden frigörs även vid fel.
- Förberedande rendering visas utan påhittad procent; färgkontrollen visar faktiskt antal färdiga områden.
- PDF-text, aktuella sid-/stämpelhämtningar, bildklassning, rendering av kodområden och matcherbilder samt OCR-start har tidsgräns och avbrottskontroll. Fastnad rendering avbryts; felet blir inte ett lyckat resultat med noll träffar.
- Städning av en OCR-motor blockerar inte upplåsning. En motor som blir färdig efter timeout stängs, och ett gammalt fel får inte nollställa en senare motor.
- Dörrkortslänkar, manuella val och träffantal från 9.87 behålls.

Verifierat med `tests/smartmatch-stamp-reading-v9-88.cjs`: faktisk PDF-rendering, en färgrendering per ritningssida, delområdesframsteg, DBL/DBL DS/DBL B uppst/WC DS/GS1/GS2 och färgfilter. Rasterdelens OCR-svar är simulerat.

`tests/smartmatch-read-step-v9-88.cjs`: väntesteg som lyckas, misslyckas, aldrig svarar, avbryts eller svarar sent; cleanup av fastnad OCR-start; en PDF-rendering som aldrig svarar avbryts och frigör bild/sida.

`tests/smartmatch-read-handoff-v9-88.cjs`: tidigare kopplingsfixar och statusräkning. Syntaxkontroller och lokala HTML-resurser kontrollerade. Användarens faktiska ritnings-PDF och iPad/iPhone har inte verifierats.
