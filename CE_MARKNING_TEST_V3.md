# CE-märkning TEST 3 – projektuppgifter till dokumentens fält

## Beställt 14 oktober 2026

Projektuppgifterna ska motsvara SLR-dokumentens uppgifter och föras över till rätt fält. Den som utför jobbet ska vara tydlig. Dokumentens verktyg ska vara små, tydliga och samlade på en rad för telefon, i stället för många staplade knappar.

## Förändring

- Projektuppgifter har fällbara grupper för Objekt/arbetsplats, Den som utför jobbet, Maskintillverkare, Beställare, Installation och EG-försäkran. Fältnamnen och kopplingarna är kontrollerade mot användarens fem PDF-mallar.
- Namn, utförande företag, telefon och datum går till riskanalysens utförandefält. Egenkontrollen får namn/datum för utförd riskanalys. Loggboken förifyller första arbetsradens tekniker, datum och order; senare historikrader fylls inte automatiskt.
- Objektets adress är separat från beställarens adress. Tillverkarens adress, postnummer/ort, org. nr, kontaktperson och telefon följer motsvarande PDF-fält. Objekt visar projektets objektnamn i stället för ett automatiknummer.
- EG-försäkrans dokumentationsansvarige och undertecknare har egna uppgifter. Teknikerns namn görs inte automatiskt till EG-undertecknare. Projektuppgifter sätter inga underskrifter eller kontrollmarkeringar.
- Explicit ändring av en gemensam projektuppgift styr dess PDF-fält, även när en äldre glasstandard innehåller ett gammalt värde. Egna fältundantag på en dörr bevaras, inklusive tomma värden. Fyll i uppdaterar även projektuppgiften när ett gemensamt kontakt-/utförandefält ändras direkt i PDF:en. Bara denna dörr håller ändringen lokal.
- Verktygsraden är Fil / Visa / Fyll i / Kontroll, med små enhetliga SVG-ikoner och korta etiketter. Bara denna dörr och återställning av dörrens ifyllnad finns under trepunktsmenyn. Filnamnet visas på en kort rad. Produktlista och CE-bild har motsvarande verktyg för sina respektive filtyper.
- TEST 3 har nya versionsmärkta filer och egen lokal databas. På samma enhet tas befintligt TEST 2-projekt in som en kopia; TEST 2-lagringen skrivs inte över. TEST 2-projekt-PDF kan också öppnas. Dörrar, standarder, egna undantag, mallar, signaturer, bilder och manuella produktlistor följer med. Äldre uttryckliga PDF-svar bevaras tills projektuppgiften ändras; nya uppgifter sparas i schema 3.
- Fast testadress `project-ce-markning-test.html` är en full kopia av `project-ce-markning-test-v3.html`. TEST 2-filer bevaras oförändrade. Den separata CE-cachen uppdateras för TEST 3 med samma smala sid-scope.

## Verifiering

`tests/ce-markning-v3.cjs` använder projektets faktiska pdf-lib, PDF.js och JSZip. Det kontrollerar glasprofiler, egna false/tomma/text-värden, rätt dörridentitet, explicit Klart, delade mallar/signaturer och tre PDF-sparrundor utan dokumentackumulering. Nya kontroller gäller TEST 2-migrering, separata adresser, projekt-till-PDF-kopplingar, utförarens namn i rätt dokument, separata EG-roller, egna dörrundantag och explicit tömning av tidigare gemensamma fält. Dokumentrenderarens faktiska funktion kontrolleras för en rad med fyra verktyg plus menyn.

De fem PDF-mallarna har dessutom provfyllts lokalt med syntetiska uppgifter genom den faktiska modulen. Motsvarande canonical AcroForm-värden kontrollerades före utplattning: 16 fält i Riskanalys, 1 i Beskrivning av maskin, 16 i Loggbok, 11 i EG-försäkran och 15 i Egenkontroll. Samtliga 16 genererade sidor renderades; utföranderutan, kontaktuppgifterna och EG-rollerna granskades visuellt. Källfilerna ändrades inte och inga privata mallar, bilder eller kunduppgifter publiceras i repot.

JavaScript-syntax, unika HTML-ID, versionsreferenser och filavgränsning kontrolleras. Lokal Chromium saknas, så faktisk telefonlayout och lokal/offline återöppning behöver fortsatt provas på enheten. Globala Tillsyno-versionen, inloggning, Kontrollflöde, ordinarie SmartMatch, SLR-testet och iOS/TestFlight ändras inte.
