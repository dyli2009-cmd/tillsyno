# Kontrollflöde – LÅST

Status: **LÅST**

Låst från och med: **Tillsyno v2.4.215**

Kontrollflöde får inte ändras förrän användaren uttryckligen säger att det ska låsas upp.

Godkänd upplåsning är en tydlig instruktion som exempelvis:
**"Lås upp Kontrollflödet."**

Efter den beställda ändringen ska Kontrollflödet åter betraktas som låst, om användaren inte uttryckligen säger annat.

När låset är aktivt:
- ändra inte Kontrollflödets UI, funktioner, navigation, översikt, protokoll, kundmall eller PDF-logik
- ändra inte delad kod på ett sätt som påverkar Kontrollflöde
- håll Projektflöde och andra moduler separata

## Senaste beställda ändring

2026-10-08, Tillsyno v2.4.252: användaren låste upp Kontrollflöde för att lägga till **Checklista revision lås** under **Dörrautomatik / Lås**, med användarens 11 kontrollpunkter. Revision och egenkontroll dörrautomatik samt deras design behölls oförändrade. Efter denna ändring gäller status **LÅST** igen.

2026-10-08, Tillsyno v2.4.253: användaren beställde ett offlinetest av arbetsappen. Appfiler och PDF-bibliotek görs tillgängliga offline, och ritningen kan återöppnas från lokal lagring. Protokollens punkter och PDF-design ändras inte. Kontrollflöde är låst igen efter denna beställda ändring.

2026-10-08, Tillsyno v2.4.254: användaren beställde menyn vid ögat för att visa/dölja alla markeringar eller markeringar per valt protokoll. Beställningen tillåter denna avgränsade ändring i Kontrollflöde. Protokoll, arbetsdata och PDF-export är oförändrade. Kontrollflöde är låst igen efter denna ändring.

2026-10-08, Tillsyno v2.4.255: användaren beställde att avstå från sparad ritning och själv namnge separat PDF-kopia. Denna avgränsade beställning tillåter ändringen; protokollinnehåll och PDF-layout är kvar. Kontrollflöde är låst igen efter ändringen.

2026-10-08, Tillsyno v2.4.256: användaren beställde att ta bort erbjudandet om sparad ritning och knappen Inte nu. Det vanliga PDF-valet används. Beställningen tillåter denna avgränsade ändring; Kontrollflöde är låst igen efter ändringen.

2026-10-12, Tillsyno v2.4.288: användaren godkände uttryckligen upplåsning enbart för designändringen i protokollväljaren. En mörkblå mappvy visar Dörrautomatik / Lås, Säkerhetsservice och Brand var för sig; ett eller flera befintliga protokoll väljs före ritningen. Inga kontrollpunkter, PDF-funktioner eller ritningsvyer ändrades. **Kontrollflödet är LÅST igen efter denna ändring.**

2026-10-12, Tillsyno v2.4.289: felrättning inom den senast godkända mappdesignen – Hem och Ritningsverktyg i protokollväljaren fick mörkblå bakgrund och ljus text/ikon för läsbarhet. Ingen ändring av protokoll, navigation, ritning eller PDF. **Kontrollflödet förblir LÅST.**

2026-10-12, Tillsyno v2.4.290: på användarens uttryckliga beställning tonades den starka och feta texten ned i alla Kontrollflödets mappar och protokoll, tillbaka-knappen ‹ Mappar gjordes mer kompakt och automatisk PDF-filväljare efter Fortsätt till ritning togs bort. Användaren väljer själv Öppna PDF på ritningsytan. Befintliga checklistor, val av flera protokoll och PDF-inläsning bevarades. **Kontrollflödet är åter LÅST.**

2026-10-13, Tillsyno v2.4.291: användaren godkände en avgränsad rättning av vit skärmblinkning vid navigering mellan Hem, Kontrollflöde och Ritningsverktyg. Endast mörkblå sidbakgrund och diskret sidövergång har ändrats; checklistor, arbetsdata, PDF-inläsning och protokoll är oförändrade. **Kontrollflödet är fortsatt LÅST.**

2026-10-13, Tillsyno v2.4.292: på användarens uttryckliga beställning ersattes **Öppna fel** med **Anmärkning** i Kontrollflödets sammanfattning och **ÖPPNA FEL** med **ANMÄRKNING** i kundmallens Anmärkningsöversikt. Samma avgränsade textändring finns i webb och iOS. Antal, statuslogik, kontrollpunkter och PDF-layout bevarades; fristående Säkerhetsservice behåller sina tidigare rubriker. **Kontrollflödet är åter LÅST efter denna ändring.**
