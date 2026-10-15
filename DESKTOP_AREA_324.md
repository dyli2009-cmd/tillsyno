# Tillsyno v2.4.324 – tydligare områdesval på dator

Godkänt 15 oktober 2026: större rubriker, beskrivningstext och ikoner i datorns områdesval för Dörrautomatik/Lås, Säkerhetsservice och Brandsäkerhet. Tre kort bredvid varandra och befintliga kortmått bevaras. Instegsrubrik 28 px, korttitlar 20 px, beskrivningar 14 px och ikonytor 56 px. Den dekorativa pilen placeras separat i hörnet så att radbrytning inte förstorar korten.

Endast CSS under data-stage=folders på dator med minst 1100 px, hover och precis pekare; telefon/surfplatteval undantas. Ingen ändring av checkliststadiet, paletter, navigation, kontrollpunkter, PDF eller projektdata. Gemensam versions-/cachehöjning och motsvarande iOS-källa. Kontrollflödet är åter låst.

Verifiering: 42 före/efter-fall i Chromium, sju teman över sex enhetsinställningar. 28 telefon-/iPad-bilder är pixelidentiska. Dator vid 1440x900 och 1100x768: oförändrad kort-/dialogbredd, alla tre kort fortsatt 198 px höga, större text/ikoner, samma färger, ingen horisontell överströmning och inga runtime-fel. Öppning av Dörrautomatik/Lås bevarar checklistornas textstorlek. Datorvyn bildgranskad. Ingen fysisk enhet eller ny TestFlight-build verifierad.
