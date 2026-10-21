# Avläsning 9.96 – manuell stämpelkoppling och åsidosatta dörrkort

Koppla använde sidans vanliga text före stämpelns egen beteckning. Rumstext bakom en PDF-stämpel kunde därför fylla sökfältet, medan stämpelns beskrivande metadata inte motsvarade den tryckta koden. Samtidigt räknades åsidosatta dörrkort som kända sidor utan att deras originalnamn visades i kortväljaren.

## Rättning

- En markerad fysisk PDF-stämpel läses via sitt eget normalutseende med den avgränsade stämpelläsaren från 9.93. Bakomliggande sidtext används inte för den stämpeln. Exakt känd metadata återanvänds så att äldre dold eller klippt text i stämpelformen inte ersätter rätt kod. Tvetydiga etiketter lämnas olösta.
- Färg och form lärs från stämpelns fysiska rektangel. Sökningen får det berikade stämpelindexet och jämför hela koden. Sidans vanliga text används fortsatt för markeringar som saknar en fysisk stämpel.
- Endast det lilla textindexet cachas per PDF. PDF-lib-kopian är tillfällig; befintliga batchgränser, avbrott och kontroll av aktuell PDF behålls. Kortväljaren tar en projektsnapshot för hela sidlistan.
- Kortväljaren visar originalnamn även för kort som lämnats till senare. Ett verifierat kortindex används som reserv för äldre projekt, utan att ritningens alternativa namn görs till kortets originalnamn.
- När användaren bekräftar en koppling återställs det exakt valda åsidosatta originalkortet med samma ID, produkter och kontroller. En avvikande ritningskod blir ett uttryckligen valt alias med hänvisning till originalkortet. Övriga åsidosatta kort bevaras. Äldre poster utan separat ID använder sin befintliga nyckel.
- Konflikter, tvetydiga källkort, ogiltig geometri och olästa koder stoppas före ändring. Produktläsningsfel bevaras med sin rättningsväg. Inga generella stavningsgissningar eller nya kodsynonymer införs.

Nya 9.96-filer bevarar äldre versioner. Startsida, fast testadress och offlinecache följer 9.96 / app 2.4.466, med HTML-build 36.231. Layouten från 9.95 återanvänds. Kontrollflöde, inloggning och separat SmartMatch 1.3 ändras inte. Inga kundfiler, extraherade kundtexter eller koordinater ingår i ändringen.

## Verifiering

- `tests/smartmatch-read-deferred-link-v9-96.cjs`: originalnamn, exakt och atomisk återställning, stabila ID:n även i äldre poster, bevarade produkter/kontroller, andra åsidosatta kort, alias efter återställning, konflikter och rättning av produktfel.
- `tests/smartmatch-read-extra-browser-v9-96.cjs`: genererade PDF-stämplar med beskrivande metadata och rumstext bakom, tre åsidosatta originalkort, två likadana stämplar, avvikande originalkod, fel färg och suffix, granskad koppling och avbrott. Verklig PDF-export och öppning i en ny webbläsarsession bevarar original, sökexempel, alias och avprickningar; tidigare kopplingar känns igen utan dubbletter. Känd exakt metadata med äldre dold formtext ingår. Passerar med mus/touch på dator, iPad och iPhone utan OCR.
- Det befintliga dörrkortsflödet passerar i sex Chromium-profiler. Befintliga manuella, bulk- och överlämningstester körda mot nya läsaren. Befintligt manuellt flöde med vanlig färgad sidtext kontrollerat på dator, iPhone och iPad.
- Bifogad PDF kontrollerad endast lokalt: de två aktuella stämplarnas egna beteckningar och båda positionerna hittas utan OCR; kända korta metadataetiketter förblir korrekta. Kundfil och resultat ingår inte i repot.

Webbläsarprofiler är simulering; fysisk Safari/iPhone/iPad och TestFlight har inte körts.
