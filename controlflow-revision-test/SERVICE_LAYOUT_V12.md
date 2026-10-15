# Serviceöversikt och protokoll – TEST v12

## Resultat av service

- Nya översikter börjar i Liggande format: samtliga sex statusantal på en rad, med rubrik och klickbar hänvisning till anmärkningsöversikten.
- Verktygsraden har Format: Liggande / Kompakt. Äldre projekt utan layoutfält behåller Kompakt tills användaren väljer annat.
- Båda formaten kan flyttas och skalas. Ta bort översikt är tydligt markerad i verktygsraden som öppnas genom tryck på rutan eller Ändra serviceöversikt i verktygsmenyn.
- project.serviceOverview.layout sparas med placeringen i lokal lagring och arbets-PDF. Kundmall och export använder samma vektorkort och länk.

## Protokoll i appen

Ingår ej ligger till höger på kontrollpunktens rubrikrad. Klart utan anmärkning och Klart med anmärkning ligger bredvid varandra på egen rad med bockrutor. Valet med anmärkning öppnar befintliga anmärkningsfält. Kontrollpunkternas innehåll, sparade svar, statusregler och kundprotokollets PDF-layout är oförändrade.

## Verifiering

Chromium: 320/390/768/1200 px, rubrikplacering, två svar per rad, status/anmärkningsfält och ingen horisontell scroll. Serviceöversikt: formatbyte, flytt, storlek, liveantal, ångra/gör om, borttagning, lokal lagring, arbets-PDF/ny service och offline. Faktisk exporterad PDF jämförs pixel för pixel mot kundmallen; länken går till anmärkningsöversikten. Både kompakt och liggande samt 90 graders ritningsrotation kontrolleras. Historiska runtime-filer och låst import behålls.

Tester: tests/controlflow-service-overview-v12.cjs och tests/controlflow-checklist-v12.cjs.
