# SmartMatch TEST v36.59 – originalstämplar från PDF

2026-10-11. Användaren förtydligar att själva projekterade stämpelgrafiken ska vara skarp, inte ersättas av extratext. Generiskt SVG-textlager och rekonstruerade vita ID-etikettplattor från v36.57/v36.58 tas därför bort.

Mobilen behåller en begränsad helsidesöversikt. Efter 900 ms stillhet renderas små utsnitt direkt från PDF.js runt identifierade GS-/projektstämplar, positioner och automatikrektanglar, med 4 PDF-enheters marginal. Utsnitten innehåller källfilens verkliga former, färger, text och annoteringar; de skapar inga nya/gissade beteckningar. Appens kopplingspilar, markörramar och egna ritningsanteckningar ligger fortsatt separat som HTML/SVG ovanför.

Rendering sker ett utsnitt i taget i samma kö som helbild/datorns detaljbild. Högst 32 synliga områden, prioriterade närmast vycentrum; högst cirka 160 000 pixlar per utsnitt och 650 000 totalt i cache. Cache återanvänds; gamla ytor frigörs före ny tilldelning. Avbrott frigör ofärdiga canvasytor i finally. Rörelse och byte av sida/zoom döljer gamla utsnitt direkt; reset rensar cache. Ingen utsnittsrendering under 100 procent zoom eller på datorn. Det gamla helskärmsdetaljlagret är fortsatt avstängt på mobil.

Begränsningar: endast identifierade stamp-/objektområden skärps. Okända originalsymboler utanför dessa områden och resten av ritningsbilden behåller översiktsupplösningen. Ursprungligt lågupplöst bildinnehåll kan inte få detaljer som saknas i källfilen. PDF.js interna minnesanvändning är inte helt kontrollerad av vår pixelbudget; faktisk iPhone/Safari-stabilitet måste verifieras.

Verifiering: JS-syntax, HTML/versioner och borttagna textetikettsfunktioner. Verklig PDF.js-rastertest i Node med native canvas och syntetisk PDF: färgad rektangel/ellips/linje och GS14 på 90-graders roterad sida; vår utsnittstransform gav exakt samma pixlar som originalrenderingens motsvarande område (medelskillnad 0). Dubblettundertryckning och pixelbudget kontrollerade. Testet använder miljöns PDF.js-paket, inte en fysisk Safari. Original- och utsnittsbild visuellt kontrollerade. Fysisk telefon med användarens PDF återstår.

v36.58 bevarad. Filnamnsfält och flyttbara datorrutor kvar. Endast SmartMatch TEST; Kontrollflöde/ordinarie app/iOS orörda.
