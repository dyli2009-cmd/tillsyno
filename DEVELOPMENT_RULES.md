# Dörrservice – utvecklingsregler

Det här dokumentet ska läsas innan någon ändring görs i Dörrservice.

## 1. Grundregel: ändra bara rätt arbetsområde
Varje arbetsområde behandlas som en egen modul.

- Kontrollflöde
- Dörrautomatik
- Säkerhetsservice
- Brand
- Projektflöde
- Ritningsverktyg

Om en ändring gäller ett visst arbetsområde får andra arbetsområden inte ändras samtidigt, om det inte uttryckligen är nödvändigt och godkänt först.

Exempel:
- "Ändra Säkerhetsservice" betyder att bara Säkerhetsservice ska ändras.
- "Ändra Projektflöde" betyder att bara Projektflöde ska ändras.
- En förbättring i Projektflöde får inte automatiskt flyttas till Kontrollflöde.

## 2. Projektflöde ska vara helt separat
Projektflöde är ett eget systemflöde och ska hållas isolerat från Kontrollflöde.

Regler:
- Projektflöde får ha egen kod, egen logik, egen navigation och egen versionsserie.
- Ändringar i Projektflöde får inte påverka Kontrollflöde.
- Gemensam kod får bara användas om den är tydligt avgränsad och inte ändrar beteendet i Kontrollflöde.
- Om en ändring i gemensam kod riskerar att påverka Projektflöde eller Kontrollflöde ska det sägas innan ändringen görs.

## 2A. Projektflöde – strikt isolering

Projektflöde ska behandlas som ett **eget system** och utvecklas så separat som möjligt från Kontrollflöde.

Regler:
- när användaren pratar om Projektflöde ska arbetet avgränsas till Projektflöde
- återanvänd inte Kontrollflödets UI, navigation, protokoll- eller arbetslogik bara för att det är enklare
- skapa egen HTML, CSS, JavaScript, state/lagring, PDF-logik och projektlogik där det är praktiskt möjligt
- ändringar i Projektflöde får inte kräva ändringar i Kontrollflöde
- gemensamma hjälpfunktioner får bara användas om de är neutrala och inte skapar beroende mellan systemen
- Projektflöde får ha egna idéer, egna arbetssteg, egna verktyg och egen UX
- Kontrollflödets lås gäller fortfarande och får inte kringgås genom ändringar i Projektflöde
- den nya fristående Projektflödesytan ligger i `project-workspace.html`, `project-workspace.css` och `project-workspace.js`; dessa filer får inte importera Kontrollflödets `security.js`, `security.css` eller `all-in-one.*`

När Projektflöde diskuteras ska fokus ligga på Projektflöde och inga ändringar göras i Kontrollflöde om användaren inte uttryckligen först låser upp Kontrollflödet.

## Fortsättning från senaste arbetspasset

Läs **[SMARTMATCH_FORTSATTNING_2026-10-10.md](SMARTMATCH_FORTSATTNING_2026-10-10.md)** före fortsatt SmartMatch-kodning. Här finns beslut, befintlig TEST-status, återöppningstest, Dropbox-delning, olösta risker och prioriterade förbättringar. Detta är en dokumentationspost, ingen ny funktionsversion.

## SmartMatch – samlade och låsta funktionsregler

Läs **[SMARTMATCH_FUNCTION_RULES_LOCK.md](SMARTMATCH_FUNCTION_RULES_LOCK.md)** före fortsatt SmartMatch-utveckling och när användaren frågar hur en funktion är tänkt. Den samlar gällande principer, avläsningskällor, kopplingar, motiv, verifiering och beslutshistorik.

**[SMARTMATCH_AUTOMATION_RULE_LOCK.md](SMARTMATCH_AUTOMATION_RULE_LOCK.md)** låser det uppdaterade v36.101-flödet: placerad märkning → sök hela objektnumret → egen knapp per fysisk träff → kontrollera GS:s eget dörrkort → pil till närmaste verifierade GS på samma sida. Exakt en synlig pil per fysisk automatik; inga sparade kontroller raderas. Ren närmaste-GS från v36.92 är historik. Manuella val bevaras.

Dessa beteendeprinciper ändras endast efter ett nytt uttryckligt användarbeslut. Felrättningar som återställer beslutad funktion är tillåtna inom beställd omfattning. Äldre versionsanteckningar är historik och överstyr inte aktuell låst regel.

## SmartMatch – låst tabellregel

Läs **[SMARTMATCH_TABLE_RULE_LOCK.md](SMARTMATCH_TABLE_RULE_LOCK.md)** före ändringar i dörrkortsidentifiering eller ritningskoppling. Regeln är låst av användaren: identifiera tabellens celler först, läs ID från översta vänstra rutan och matcha sedan hela beteckningen mot ritningen. Nya tabellupplägg ska läsas in och verifieras med ett exempel; den låsta standardprofilens ID-källa ändras inte. Separata kända läsprofiler läggs endast till enligt ett uttryckligt användarbeslut och dokumenteras med egen ID-källa och verifiering; se tabellregelns avsnitt 8 (TEST v36.94).

## SmartMatch TEST – versionsregel

SmartMatch TEST är en fristående experimentversion och ska inte förväxlas med Tillsynos globala appversionsnummer.

- SmartMatch TEST kan ha en underrevision inom samma huvudversion när användaren vill det, t.ex. v36.13 → v36.14 → v36.15. Höj bara till nästa heltal efter ett uttryckligt beslut. Använd bindestreck i filnamn för underrevisioner, t.ex. `project-workspace-smartmatch-v36-14.js`.
- Skapa nya versionsmärkta HTML-, JS- och CSS-filer för varje ny testversion (t.ex. `project-workspace-smartmatch-v36-14.html`, `.js`, `.css`). Behåll föregående version oförändrad som jämförelse/återgång.
- Uppdatera konsekvent sidrubrik, versionsmärkning, resursreferenser, logg- och nedladdningsnamn. Använd en separat lokal lagringsnyckel för varje testversion.
- Läs gärna tidigare testversioners inbäddade projekt-PDF-data så att tidigare arbete går att ta med till den nya versionen. Skriv däremot nytt projektformat under den nya versionen.
- Nuvarande aktiva testversion: **TEST v36.102**. Nästa underrevision blir **TEST v36.103**.
- **En enda fast adress för SmartMatch TEST:** `project-workspace-smartmatch-test.html` på GitHub Pages. Denna fil är alltid en full kopia av senaste `project-workspace-smartmatch-vNN.html` och länkar till samma versionsmärkta JS/CSS (ingen vidarebefordran, inget iframe).
- **Varje gång en ny TEST vNN görs måste samma commit också uppdatera `project-workspace-smartmatch-test.html`**, så användaren alltid kan använda samma bokmärke/hemskärmsikon. Öppna den fasta adressen först för att verifiera rätt testnummer.
- TEST-versionen betyder **inte** att Tillsyno-appen eller TestFlight har uppdaterats. Publicering dit kontrolleras separat.

## 3. Kontrollflöde
Kontrollflöde är den gemensamma arbetsytan för kontroll/protokoll.

Dörrautomatik, Säkerhetsservice och Brand får använda samma grundfunktioner, till exempel:
- ritning
- markering av objekt
- checklista/protokoll
- översikt
- fel och anmärkningar
- beskriv åtgärd
- kundmall
- spara PDF
- projektuppgifter

Texterna, kontrollpunkterna, benämningarna och innehållet får vara olika för respektive område.

Målet är:
**samma arbetssätt och funktion – olika protokollinnehåll.**

En ändring i den gemensamma funktionen ska kontrolleras mot alla berörda protokoll innan den görs.

## 3A. KONTROLLFLÖDE ÄR LÅST

**STATUS: LÅST från och med Tillsyno v2.4.215.**

Kontrollflöde får inte ändras så länge detta lås är aktivt.

Det innebär:
- gör inga ändringar i Kontrollflödes funktion, design, navigation, protokoll, översikt, kundmall, PDF-flöde eller projektdata
- ändra inte gemensam kod om ändringen kan påverka Kontrollflöde
- ändra inte `all-in-one.html`, `all-in-one.css`, `security.js`, `security.css` eller andra filer som påverkar Kontrollflöde, om inte Kontrollflöde först uttryckligen har låsts upp
- en ändring i en annan modul får inte användas som anledning att samtidigt justera Kontrollflöde
- cache-/versionsändringar får inte i sig användas för att smyga in funktionella ändringar i Kontrollflöde

Kontrollflödet får endast låsas upp efter en **uttrycklig instruktion från användaren**, till exempel:
**"Lås upp Kontrollflödet."**

När användaren låser upp Kontrollflödet får endast den uttryckligen beställda ändringen göras. Efter avslutat arbete ska Kontrollflödet betraktas som låst igen om användaren inte tydligt säger att det ska fortsätta vara upplåst.

Det separata låsdokumentet `CONTROLFLOW_LOCK.md` ska också kontrolleras innan arbete som kan påverka Kontrollflöde.

## 4. En gemensam synlig appversion

Tillsyno ska ha **en enda synlig versionsserie** för hela appen.

Aktuell version: **v2.4.256**

Regler:
- Samma appversion gäller Kontrollflöde, Dörrautomatik, Säkerhetsservice, Brand, Projektflöde och Ritningsverktyg.
- Visa inte separata versionsnummer för enskilda moduler.
- Varje användarsynlig uppdatering ska höja Tillsyno-versionen med ett steg.
- Exempel: v2.4.244 → v2.4.245 → v2.4.247.
- Versionsnumret ska visas på Home så att det är enkelt att kontrollera vilken uppdatering som körs.
- Tekniskt buildnummer för TestFlight får finnas separat, men den synliga versionsbeteckningen ska följa Tillsyno-versionen.
- När en ny version görs ska webb och iOS speglas till samma Tillsyno-version.

## 5. Stabil funktion ska inte ändras i onödan
När en del är godkänd och fungerar ska den betraktas som stabil.

Gör inte:
- spontana designändringar
- omstrukturering bara för att "städa"
- ändringar i fungerande navigation
- ändringar i protokoll som inte hör till uppgiften
- massändringar i gemensam kod utan kontroll

Gör minsta möjliga ändring för den aktuella uppgiften.

## 6. Innan en ny ändring
När arbete återupptas ska följande göras:

1. Läs detta dokument.
2. Kontrollera vilket arbetsområde användaren pratar om.
3. Kontrollera senaste relevanta ändringarna i GitHub.
4. Bekräfta vilken modul som ska ändras.
5. Ändra bara den modulen.
6. Kontrollera att andra moduler inte har påverkats.
7. Spegla motsvarande ändring till iOS endast när samma modul ska finnas 1:1 där.

Om användaren säger:
"Kan du kolla vad vi gjorde sist?"
ska senaste relevanta GitHub-ändringar för just den aktuella modulen kontrolleras innan fortsatt arbete.

## 7. Gemensam kod
Gemensam kod är tillåten för verkligt gemensamma funktioner, men ska behandlas försiktigt.

Före ändring i gemensam kod:
- identifiera vilka moduler som använder den
- kontrollera risken för bieffekter
- undvik att ändra beteendet för andra moduler
- separera modulspecifik logik när det behövs

Om en funktion börjar skilja sig mycket mellan två arbetsområden ska den hellre delas upp än fyllas med specialfall som gör systemen beroende av varandra.

## 8. Webb och iOS
Webb och iOS ska normalt ha samma funktionalitet för samma modul.

### Aktiv regel för Projektflödet
Så länge användaren uttryckligen arbetar med **Projektflödet** ska varje användarsynlig ändring i Projektflödet speglas till både webb och iOS i samma arbetsomgång.

Det innebär:
- `project-workspace.html`, `project-workspace.css` och `project-workspace.js` ska hållas funktionellt 1:1 mellan webb och iOS
- efter en webbändring i Projektflödet ska motsvarande iOS-filer uppdateras innan arbetet betraktas som klart
- efter en iOS-specifik korrigering ska webbversionen kontrolleras så att funktionerna fortfarande motsvarar varandra
- endast nödvändiga native-skillnader får avvika, till exempel Capacitor FilePicker, Share, lokala runtime-filer eller iOS safe-area
- samma synliga Tillsyno-version ska användas på webb och iOS
- denna speglingsregel gäller endast den aktiva Projektflödesutvecklingen och får inte användas för att ändra Kontrollflödet eller andra låsta moduler

Men:
- ändring i webb ska inte automatiskt innebära förändring i andra arbetsområden
- iOS-specifik kod får vara separat
- native-anpassningar ska inte ändra webbflödets funktion

## 9. Huvudprincip
**Rätt ändring, på rätt plats, i rätt modul – utan att röra det som redan fungerar.**

