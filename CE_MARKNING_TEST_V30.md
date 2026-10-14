# CE-märkning TEST 30 – datum, produktlista och underskrift

Datum i Loggbok, EG-försäkran, Egenkontroll och andra PDF-mallar:
- Vänsterställda datum i redigeringsvyn och PDF-exporten; text skrivs från fältets vänsterkant i stället för mitten.
- EG-datum hämtas från projektets EG-datum eller projektets vanliga datum. Loggbokens installationsdatum använder projektets installationsdatum. Framtida serviceloggsrader förblir tomma.
- Egenkontrollens punktdatum fylls om motsvarande punkt är vald och har signatur. Manuella datum skrivs inte över.

Produktlista:
- En enkel ifyllbar tabell med Typ, Fabrikat, Produkt/modell, Antal och Ta bort. En PDF per dörr.
- Lås, Handtag, Dörrautomatik, Sensor, Impulsgivare, Beslag och Övrigt kan väljas.
- Ny produkt, Hämta från dörr och Spara produktlista PDF.
- Fabrikat lagras separat i brand, tidigare noteringar bevaras. Layouten är mobil- och iPad-anpassad.

Projektunderskrift:
- Under Projektuppgifter: signeringsdatum, dag/månad/år eller månad/år och fontval Handstil/Kursiv/Vanlig/Skrivmaskin.
- Daterad signatur visas med signatur överst och datum under i större signaturrutor.
- Signeringsdatum och utseende lagras i CE-projektets JSON och följer PDF-exporten.
- Handstil ritas som en lokal liten PNG med enhetens system-font och bäddas in i PDF, utan externa fontfiler.

Verifiering: JS-syntax, datumformat, produktfält och PDF-lib-vänsterjustering fungerar. Praktisk visuell kontroll på kundens egna originalmall återstår.