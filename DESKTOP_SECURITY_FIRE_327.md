# Tillsyno v2.4.327 – PDF-start för Säkerhetsservice och Brandsäkerhet

2026-10-15, Tillsyno v2.4.327: Beställd rättning av datorns PDF-start för Säkerhetsservice och Brandsäkerhet. Samma DOM-presentation som i revisionen aktiveras även i ordinarie all-in-one.js. Rätt områdesnamn och valda checklistor visas, befintliga större CSS-mått återanvänds. Routing, PDF, projektdata och telefon/iPad bevaras. Kontrollflödet är åter LÅST.

Orsak: v326 aktiverade desktop-kontexten endast i revisionsrutten, men rena säkerhets-/brandval använder rotens runtime. Ingen ändring av den routingen.

Verifierat: 12 före/efter-flöden i Chromium, två områden och två teman på dator, telefon och iPad. Dator visar rätt områdesnamn och checklistnamn med 32 px huvudrubrik. Samtliga åtta telefon-/iPad-bilder är pixelidentiska. Protokollval bevaras och ingen horisontell överströmning. Ingen fysisk enhet eller ny TestFlight-build testad.
