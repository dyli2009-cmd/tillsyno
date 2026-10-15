# Flyttbar kundmall – Tillsyno v2.4.310

Kundmallen i den införda Dörrautomatik/Lås-modulen öppnas i ett centrerat fönster nära full skärmhöjd. Den befintliga PDF-renderaren anpassar aktuell sida till visningsytans bredd och höjd. Fönstret kan flyttas med mus/finger/penna genom att dra i rubrikfältet, inom tillgängligt utrymme på skärmen. Storleken följer skärmen; på små skärmar begränsas flytten så att kontroller och dokument ligger kvar på skärmen. Återöppning centrerar igen och skärmändring håller fönstret inom skärmen.

Tillbaka-raden visas inte i kundmallen; X stänger och återställer tidigare arbetsvy. PDF-sidval och A–/A+ behålls. På telefon har rubrik och navigering varsin rad så att X inte täcker zoomknappar. Den flytande temaknappen döljs medan kundmallen är öppen. Andra valvyer behåller den kompakta utformningen från v2.4.309.

Endast visning ändras: samma PDF-byggare, ritningsmarkeringar, rapportinnehåll och inbäddat projektformat. TEST v16 lämnas orörd. Motsvarande HTML/CSS/JS är speglad till iOS med tidigare native-anpassningar; ingen signerad build eller fysisk enhet har testats här.

Verifierat: centrerad placering, nästan full höjd och hela aktuella PDF-sidan synlig på 1400/768/390 px, mus- och CDP-touchdrag, X utan Tillbaka, alla navigeringsknappar synliga utan överlapp och återställd arbetsvy efter stängning. Full serviceöversiktsregression med faktisk export, pixelidentisk kundmall, länkar, återöppning och offline passerar.

Test: tests/controlflow-customer-floating-v310.cjs. Webb och iOS: version 2.4.310.
