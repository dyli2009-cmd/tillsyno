# Ritningsverktyg v2.4.398 – fler dörrkortslayouter och sann avläsningsstatus

**Digitalisera dörrkort · TEST** kan nu skapa en mall från fler svenska dörrkortsformat. Rättningen gäller själva förberedelsen i Ritningsverktyget; SmartMatch, Kontrollflöde och tidigare Avläsning TEST-versioner ändras inte.

## Rättat stopp efter 100 procent

På Tånga-korten blev den lokala OCR-läsningen färdig men mallskapandet stoppades efteråt. Kortet använder ansvarstabellen **Övrigt · Lev av · Mont av · Ansl av · Funk ansv. · Anm · Montering klar**, medan den första versionen bara godkände tabeller med **Benämning · Typ/utförande · Antal · Monteras av**. Därför visades först 100 procent och sedan det allmänna beskedet *Arbetet stoppades*.

Nu används avläsningens första 90 procent till PDF-text och lokal bildtext. De sista 10 procenten är reserverade för att tolka, kontrollera och autospara dörrkortet. Ett fel eller ett avbrott stannar på den verkliga procentsatsen och visar orsaken direkt. Endast ett sparat mallförslag visas som 100 procent.

## Layouter som känns igen

- **Standardtabell** med Benämning, Typ/utförande, Antal och Monteras av.
- **Ansvarsmatris** med Övrigt, Lev av, Mont av, Ansl av, Funk ansv., Anmärkning och färdigmarkering. Produktnamnet i vänsterdelen och värdet under Övrigt förs till egna redigerbara fält. Mont av bevaras som montör.
- **Enkel produktlista** där en uttrycklig Dörrkort-rubrik, exempelvis Dörrkort 140C, följs av produkt och typ på varje rad. Beslagskod-format behöver en vanlig tabellrubrik eller avsnittsstruktur så att projektmetadata inte misstolkas som produkter.

Rubriken **Övrigt** i en ansvarsmatris behandlas som kolumnrubrik och blandas inte ihop med avsnittet **Övrig utrustning**. Tomma avsnittspositioner blir inte längre noll och kan därför inte felaktigt flytta alla rader till Larm-Passer. En lodrät tabellinje efter beteckningen tas inte med i koden.

All källtext behålls med position och säkerhetsvärde. Text som inte kan placeras säkert visas fortfarande under **Text som inte förts över** och måste granskas eller markeras som *Inte en uppgift* innan kortet kan godkännas.

## Arbetsgång

1. Öppna original-PDF:en i **Ritningsverktyg**.
2. Öppna **Verktyg → Digitalisera dörrkort · TEST**.
3. Välj **Markera dörrkort på aktuell sida** och dra runt hela kortets rubrik och tabell.
4. Skriv ett namn på layoutgruppen, exempelvis `Tånga dörrkort`. Namnet behöver inte vara samma som beteckningen WC eller G69.
5. Välj **Skapa mall från markeringen**. Vänta tills statusen säger att mallförslaget är sparat och visar 100 procent.
6. Öppna granskningen sida vid sida. Kontrollera särskilt Beslagskod/Dörrkort, produkt, typ och Mont av.
7. Godkänn mallgruppen och läs sedan bara de sidor som använder samma layout.

Om arbetet stannar visar statusraden nu den verkliga orsaken, till exempel att beteckningen saknas eller att markeringen innehåller för lite text. Den redan sparade mallen och tidigare granskade kort ersätts inte av ett misslyckat försök.

## Verifiering

- Kärnprov täcker standardtabell, Tånga-formatets ansvarsmatris, explicit Dörrkort-beteckning, enkel produktlista, svenska tecken och tomma avsnittsankare.
- Webbläsarprov kontrollerar att en lyckad OCR-fas stannar under 100 procent tills malltolkning och autosparning är klara.
- Fel och avbrott kontrolleras så att de behåller sin verkliga procentsats, visar den exakta orsaken och inte ersätter sparat arbete.
- Den riktiga `Tånga 43 MB.pdf` används som slutprov för att säkerställa att mallförslaget skapas från den tidigare stoppande markeringen.
