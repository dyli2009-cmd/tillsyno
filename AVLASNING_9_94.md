# Avläsning 9.94 – enklare dörrkortsflöde

Avläsning börjar med dörrkortens beslagskoder och matchar dem mot ritningen. Det tidigare valet mellan koder och produkter är borttaget från den nya förberedelsen. Produkterna läses senare via **Läs produkter** i den öppna SmartMatch-arbetsytan.

## Gränssnitt

- Kortare instruktioner och steg som visar nästa åtgärd. Sidbyte, zoom och markering finns intill PDF:en. Upprepade hjälptexter och kapslade Info-menyer är borttagna.
- Mindre knappar och ikoner på dator, anpassade kontroller på telefon och surfplatta. Inställningar samlas i en grupp; normala arbetssteg ligger synliga.
- Starten visar **Läs dörrkort** och **Öppna projekt** för ny respektive sparad PDF. Den senare läser projektets sparade information.
- SmartMatch-arbetsytan har en direktknapp **Koppla**. Kopplingsvyn visar markera stämpel, välj dörrkort, sök och granska. Extra bild- och utseendeinställningar ligger samlade. Avbrott och faktisk framstegsvisning finns kvar.
- Kodläsning kan använda en korttabells geometri för flera kort på samma sida utan att samtidigt läsa produktlistorna. Äldre sparade läsmallar och projekt kan fortfarande användas.

Stämpelläsaren och matcharen från 9.93 återanvänds. Hela beteckningar, ursprungliga kortnamn, manuella val, granskning, kopplingskonflikter, befintliga arbetslistor och sparade kontroller behåller sina skydd. Kontrollflöde, inloggning och separat SmartMatch 1.3 ändras inte.

Nya versionsfiler bevarar tidigare utgåvor. Startsida, fast testadress och offlinecache följer 9.94, appversion 2.4.464. Ingen kundritning eller avläst kundinformation ingår i ändringen.

## Verifiering

- `tests/smartmatch-read-compact-browser-v9-94.cjs`: verkligt PDF-flöde med genererad stämpel och dörrkort i Chromium. Dator, iPhone i två bredder, iPad stående/liggande och manuellt telefonläge. Markering med mus/touch, hitta kort, exakt stämpelmatchning, godkännande, rätt kortkoppling, produkter först inne i projektet, nytt sökförsök, direkt Koppla och nåbara menyer utan horisontell klippning.
- `tests/smartmatch-read-compat-v9-94.cjs`: äldre produktfel kan rättas, tidigare produkter/avprickningar/kopplingar bevaras, granskning krävs och flerkortslayout använder korttabellens geometri utan att skapa produktlistor i förberedelsen.
- Befintlig manuell stämpelsökning verifierad mot nya sidan på dator och iPad-touch. Separat kopplingsdialog verifierad på dator, iPhone och iPad: samma stämpelutseende och hela kod, upprepade positioner, rätt källkort, bevarat arbete, avbrott och ingen oavsiktlig OCR.
- Befintliga bulk-, manuella kopplings- och överlämningstester körda mot 9.94-modulerna. Stämpelutseendetestet från 9.93 passerar fortsatt. Syntax, resursreferenser, fast adress, offlinecache och ändringarnas omfattning kontrollerade.

Enhetsvyerna är webbläsarsimulering. Fysisk Safari/iPhone/iPad och TestFlight har inte körts i denna arbetsomgång.
