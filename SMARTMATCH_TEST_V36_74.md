# SmartMatch TEST v36.74 – Ej kontrollerat alla

11 oktober 2026. Fristående SmartMatch TEST.

Ny knapp bredvid ✓ Godkänn alla på egenkontroll för dörrautomatik: **↺ Ej kontrollerat alla**.

När användaren öppnar en automatik och väljer den nya knappen nollställs alla ordinarie kontrollpunkters resultat och tillhörande punktanmärkningar **endast på den aktuellt valda automatiken**. Procent blir 0 %, status Ej kontrollerad och den valda automatikens ritningsmarkör uppdateras. Lokal projektsparning sker som vanligt. Övriga automatiker, deras checklistor, projektets uppgifter, allmänna anmärkningar, GS-kopplingar och SLR-dokument ändras inte.

✓ Godkänn alla finns kvar oförändrad, två knappar ryms på mobil via responsiv flexrad. Den befintliga separationslogiken från v36.73 bibehålls. Den fristående DA/GS-modulen och övriga moduler från v36.73/v36.71 återanvänds utan funktionell ändring.

Validering: JS-syntax, unika HTML-ID, versionsreferenser och kontrollerat test med flera separata automatiker. Ej provat med användarens riktiga PDF eller fysisk Safari. v36.73 finns kvar för återgång. Kontrollflödet och iOS/TestFlight orörda.
