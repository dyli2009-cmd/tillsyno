# CE-märkning TEST 25 – sensorlista och radera en dörrautomatik

- Sensoralternativ korrigerade från FlexScan till **FlatScan**, **FlatScan 3D**, **4SAFE**, samt **Egen text**.
- Sensorväljaren öppnas i en kompakt, skrollbar rullgardin under **sensorns inmatningsfält**, inte till höger om pilen. Fungerar med PDF-zoom och horisontell panorering. Anpassar bredd och position på iPhone, iPad och dator; fälls uppåt bara vid otillräckligt utrymme nedanför. Pekvänliga menyval och egen text i samma rullgardin.
- Dörrlistan har en separat **Ta bort**-knapp på varje dörrautomatik. Inbäddad bekräftelse utan browser-popup för att undvika oavsiktlig förlust. Borttagning rensar endast den valda dörrens svar, profilkoppling, signaturer, CE-foton, granskning, färdigstatus, produktlista och verifiering. Projektets uppgifter, gemensamma PDF-mallar, projektunderskrift och övriga dörrar påverkas inte.
- Nästa nya dörrautomatik kan återanvända det första lediga löpnumret för samma objekt och maskintyp. Responsive CSS justerar touchytor och knappar i dörrlistan.
- TEST 24 finns kvar. Lokal projektdata på befintliga enheter rörs inte förrän användaren faktiskt tar bort en dörr.

Verifiering: JS-syntax kontrollerad, sensor-popupens position testad för tre skärmstorlekar och kontroll av rensning av åtta dörrspecifika datakällor utan påverkan på annan dörr. Praktiskt test i Safari på iPhone/iPad med verkligt CE-projekt återstår.
