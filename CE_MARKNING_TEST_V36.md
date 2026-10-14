# CE TEST 36 – Egenkontroll Standard visar och scrollar alla PDF-sidor

- Flyttar den flersidiga PDF-redigeraren utanför den hopfällbara dokumentmappen för att undvika klippning av sidor på iPad/Safari.
- Egen scrollruta med fast visningshöjd (iPad/desktop max 68dvh, mobil 64dvh), vertikal och horisontell rullning samt fungerande touch-skroll. Alla PDF-sidor staplas under varandra.
- Sideräknare Föregående/Nästa sida använder nu scrollTop på PDF-rutan i stället för scrollIntoView på hela dialogen.
- Visar importerat PDF-filnamn och antal sidor, till exempel Egenkontroll svängdörr · 5 sidor.
- PDF-sidantal jämförs mellan PDF.js och pdf-lib. Om PDF.js hittar färre sidor görs en temporär normalisering för visningen, utan att ersätta det sparade originalet.
- Om den valda Egenkontrollmallen verkligen bara har en sida visas en förklaring och knappen Välj fullständig PDF som öppnar import av komplett flersidig originalmall. Appen hittar inte på saknade sidor.
- Tidigare klickrutor, pågående dörrdata, standardval, PDF-export och andra flöden ändras inte.

Test: JavaScript-syntax verifierad; simulerad femsidig PDF renderade 5 sidor utan fel; ensidig PDF renderade 1 sida med varning. Visuell kontroll på faktisk iPad behövs.
