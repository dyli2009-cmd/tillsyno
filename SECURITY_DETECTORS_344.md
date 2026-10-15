# Säkerhetsservice – Detektorer, v2.4.344

Beställt och publicering godkänd av användaren 15 oktober 2026.

- Eget val under Säkerhetsservice och egen flik Detektorer efter protokollval.
- Placera en detektorikon per fysisk detektor. Tryck på ikon eller etikett för att redigera namn/kod, placering, bedömning och anmärkning.
- Nummer börjar på 1 och fortsätter utan gräns vid 100. Lägsta lediga positiva nummer används; andra objekt och befintliga detektorer numreras inte om.
- Grå: Ej kontrollerad. Grön: Godkänd. Orange: Anmärkning. Röd: Ej godkänd.
- En funktionskontroll lagrar bedömning och anmärkning i befintligt checkformat. Befintlig översikt, åtgärdsregistrering, lokal lagring och arbets-PDF används.
- Ikon och nummer/kod följer med i ritnings-PDF; avvikelser följer med i rapporten. PDF återöppnas med samma kontrolluppgifter.
- Blandade val med Dörrautomatik/Lås stöds i produktionsrevisionen.
- Samma modul och texter i webb och iOS-källan. Native beroenden, export och laddning bevaras.
- Offlinecachen inkluderar den nya JS/CSS-modulen.

## Verifiering

`node tests/security-detectors-v344.cjs`: sex webbläsarflöden, dator/iPad-/telefonstorlek, både säkerhetsruntime och blandad revisionsruntime. Faktisk placering, redigering, fyra färger, 101 löpnummer, luckor, översikt, PDF-text, export/återöppning, radering och ny service.

`NATIVE_DIR=... DARK_THEME=1 node tests/security-detectors-v344.cjs`: samma beteendetester med iOS-källans ändrade filer och mörkt tema. CDN-biblioteken levereras från lokala kopior i testet; native filer behålls som tidigare. Ingen fysisk iOS-enhet, Xcode-build eller TestFlight verifierad.

`node tests/customer-preview-theme-v322.cjs`: 174 befintliga kundmalls-/exportkontroller i sju teman och tre enhetsstorlekar, utan runtime-fel.

Det äldre statiska testet `tests/security-workflow.cjs` stannar vid sin redan felaktiga baseline-assertion om den bokstavliga strängen `app:'security-service',version:2`. Samma fel finns i oförändrad HEAD före v344. Detektorns verkliga PDF-export och återöppning verifieras i de nya beteendetesterna.
