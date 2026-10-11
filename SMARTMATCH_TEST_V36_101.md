# SmartMatch TEST v36.101 – en entydig GS-källa per fysisk dörrautomatik

Datum: 2026-10-11. **Användarbeslut:** Viktigare än att enbart utgå från ritningens `DA`-tecken är att varje *fysisk dörrautomatik* har **högst en korrekt GS-koppling**, som senare ska kunna användas för att hämta dörrkortsuppgifter till SLR.

## Låst regel

1. En fysisk dörrautomatik → **0 eller 1** GS-position (och därmed **ett bestämt dörrkort**). Aldrig två olika GS-källor till samma automatik. Om säker match saknas: lämna okopplad och begär manuellt val, inte två pilar eller en gissning.
2. Flera fysiska automatiker får dela samma GS om de faktiskt hör till samma dörr. Regeln är **inte** att varje GS måste ha en unik automatik.
3. Koppla mot **rätt fysisk GS på samma ritningssida**. Kontrollera GS-dörrkortets uppgifter om dörrautomatik, kompatibel maskintyp (ED100/ED200/ED250 enligt föregående beslut) samt fullständigt ID när det finns. Av möjliga kandidater väljs närmaste säkra fysiska dörr. Långa eller tvetydiga automatiska pilar blockeras.
4. PDF-tecknet `DA` är **ett geografiskt hjälpmedel**, inte ensamt bevis för identiteten. Behåll v36.100:s fördelning av separata fysiska DA-symboler eftersom den rättar Snidaren GS2/GS4. Ingen symbol krävs i alla PDF:er; befintlig reserv använder textens position.
5. Ett manuellt bekräftat GS-val kan ersätta ett äldre automatiskt förslag. Tidigare bekräftade manuella länkar ändras **inte** av automatisk omsökning. För dubbla sparade poster för exakt samma fysiska märkning synkroniseras GS-valet vid en uttrycklig manuell omkoppling. Kontrollsvar, anmärkningar, SLR-status och historik raderas inte.
6. Finns motstridiga gamla GS-värden ska **ingen GS räknas som verifierad SLR-källa** förrän operatören valt rätt. Tvivelaktig gammal automatisk GS kan rensas utan att checklistan eller SLR påverkas. Befintlig visuell en-pil-regel gäller fortsatt; en konflikt får inte ritas som en påstått korrekt pil.
7. **SLR-förberedelse:** Kopplingen ska bestämma `GS-position → exakt det kopplade dörrkortets sida`. För framtida automatisk SLR-data används bara `getSLRSource()`/den verifierade relationen, inte en rå `linkedGsId` eller en pil på skärmen. Manuellt vald GS behöver också ett faktiskt dörrkort med förenliga automatikuppgifter för att SLR-källan ska godtas.
8. Ingen automatisk SLR-dokumentgenerering eller överföring av tekniska fält införs i denna version. SLR visar bara vilken GS/dörrkortssida som är verifierad som framtida källa; annars visas tydligt varför källa saknas.

## Exempel Snidaren PDF-sida 3 / Plan 0

- `200154-28-24-1 → GS4` (dörrkort sida 14).
- `200154-28-24-2 → GS2` (dörrkort sida 12).
- Båda kort anger ED100. Att bara minska antalet pilar **utan att kontrollera mottagande GS** skulle inte rätta felet. Den fysiska DA-symbolen fortsätter att vara ett stöd för rätt geografisk matchning.

## Implementering

- `smartmatch-da-v36-101-module.js`: fysisk dublettidentitet, samma sparade GS för överlappande poster vid omkoppling, skydd för manuella länkar, rensning av osäker automatisk restlänk, konfliktspärr för synliga pilar och verifierad SLR-källa.
- `project-workspace-smartmatch-v36-101.{html,js,css}` samt fasta `project-workspace-smartmatch-test.html`; v36.100 finns kvar för återgång.
- `tests/smartmatch-snidaren-gs2-v36-101.cjs`: regression för GS2/GS4, bevarad SLR, dubbla gamla poster, manuell korrigering och giltig SLR-källa.

## Verifiering och begränsning

Kod, filreferenser och testfall finns på GitHub. Nytt v36.101-regressionstest och verkligt visuellt utfall i Safari/iPhone/iPad har **inte körts eller verifierats här**. Ursprungskundens PDF finns inte publicerad i GitHub. Ingen ordinarie Kontrollflöde-/iOS-/TestFlight-uppdatering görs.

**Regeln gäller tills användaren uttryckligen beslutar något annat.**