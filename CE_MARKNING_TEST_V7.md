# CE-märkning TEST 7 – kontosparade uppgifter och riskmallar

Bygger ovanpå TEST 6 utan att ändra dess PDF-motor, SmartMatch, SLR, Kontrollflöde eller iOS. TEST 6 finns kvar.

- TEST 7 väntar på godkänd inloggning innan den läser ett lokalt projekt. Projektet sparas i IndexedDB under en databas per Supabase-användar-ID, så olika inloggade personer på samma enhet inte delar aktivt projekt.
- TEST 6 och tidigare lokala projekt importeras **inte automatiskt**, eftersom de saknar kontomärkning. Användaren kan aktivt välja att hämta den äldre lokala filen, eller öppna en exporterad CE-PDF. TEST 6 är kvar som återgång.
- "Mina uppgifter": Spara/hämta separata uppsättningar för utförare/maskintillverkare och beställare. Endast uttryckligen sparade uppgifter lagras på denna webbläsare och detta konto. Ändringar i ett projekt ändrar inte de sparade uppgifterna utan att användaren väljer Spara igen. Objektnummer, projektadress, datum, dörr-ID och signaturer ingår aldrig.
- "Standardmallar Med glas/Utan glas": administratören kan spara risk-/sensorval som redan valts under "Ändra standard" i projektet. Endast relevanta val från Riskanalys 4.4 och 4.6 sparas. 10.5-egenkontrollpunkter, underskrifter, mätvärden, tillverkare, projektspecifika adressuppgifter, datum, fri risktext och godkännandestatus följer aldrig med.
- Adminmallar i denna testversion är **lokala**, inte centralt synkade. Administratören kan exportera en JSON-mall som användare kan importera. Importfilen valideras och rensas till tillåtna fältnamn/typer. På ett nytt projekt kan sparade val användas automatiskt. Om man applicerar standard på ett pågående projekt återöppnas berörda dörrars kontrollstatus så granskning måste ske igen.
- PDF-exporter från tidigare TEST 2–6 kan öppnas. D7 export behåller all projektdata och befintlig separat mall-/bilagelagring i PDF.

Säkerhetsgräns: enhetslokal data är inte serverlagrad, central behörighetsstyrning eller automatisk synk. Ett verkligt centralt administrerat mallbibliotek behöver separat datamodell, RLS och offline-synk. Inga riskbedömningar eller signaturer godkänns automatiskt via en mall.

Efter commit: kör manuellt på iPhone/iPad, kontrollera konto A/B, import/export av riskmallar, lokal migration TEST 6, ifylld PDF samt signatur vid 10.5. Funktionerna är inte produktionstestade förrän dessa är kontrollerade.
