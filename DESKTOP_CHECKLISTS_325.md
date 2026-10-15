# Tillsyno v2.4.325 – tydligare checklistval på dator

Godkänt 15 oktober 2026: förstora checklistvyn samtidigt för Dörrautomatik/Lås, Säkerhetsservice och Brandsäkerhet. Samma två kolumner och funktioner, större text (18/14 px), ikonytor (40 px), kryssrutor (24 px) och Fortsätt till ritning/övriga sidknappar (16 px). Kort får minst 110 px höjd för läsbarhet. CE-ingången i Dörrautomatik/Lås får motsvarande text och ikon.

Endast CSS i data-stage=folder på dator med minst 1100 px, hover och precis pekare; telefon-/surfplatteval undantas. Områdesval, paletter, protokollinnehåll, PDF och projektdata bevaras. Gemensam versions-/cachehöjning och motsvarande iOS-källa. Kontrollflödet är åter låst.

Verifierat i Chromium: 66 före/efter-vyer över tre områden, två datorstorlekar i sju teman samt telefon/iPad/liggande iPad/surfplatteval med mus i två teman. Samtliga 24 telefon-/iPad-bilder är pixelidentiska. Text och kontroller ryms inom korten; kolumnbredder och färger bevaras; inga runtime-fel. Val bevaras vid byte mellan alla tre mapparna och Fortsätt aktiveras efter val. Blandval automation,alarm,fire_panel öppnar revisionsrutten med rätt protokoll. Alla tre datorvyer bildgranskade. Ingen fysisk enhet eller ny signerad TestFlight-build verifierad.
