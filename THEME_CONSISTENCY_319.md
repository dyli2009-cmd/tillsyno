# Tillsyno v2.4.319 – temaval genom arbetsflödena

Beställt 15 oktober 2026: temavalet på Hem ska gälla även Kontrollflödets revision/projekt/dörrar/översikt/protokoll, fristående dörrautomatik och Säkerhetsservice, CE-märkning och Ritningsverktyg. Alla enheter får samma palett; telefon och iPad behåller sin layout. Befintlig större datorlayout bevaras.

Datorregeln i v318 skrev över samtliga paletter med en fast blågrå palett. Den överskrivningen har tagits bort. Inre projektkort, protokollets objektuppgifter, översikt, CE-projekt och dokumentmappar samt ritningsverktygets fasta hero-/kontrollfärger använder nu temavariabler. Produktionsrevisionens temakopia hålls identisk med rotfilen och motsvarande iOS-källor.

Ingen ändring av projektformat, kontrollpunkter, statusberäkning, navigation, autentisering eller PDF-runtime. PDF-sidor, fält på vita PDF-original, signaturbläck och statusmarkeringar är undantagna från nya ytfärgsregler. Frysta testfiler bevaras.

Verifiering: sju paletter vid telefon-, iPad- och datorinställning i Chromium. Projektfält, rubriker, protokoll/objektuppgifter, verkligt öppnad översikt, säkerhetsprojekt, CE-projekt/ny dörr/dokumentmappar och ritningsverktyg kontrollerade inklusive omladdning. Bildgranskning hittade och rättade kvarvarande vit objektpanel. Befintligt test av tre resultat/statusknappar, egna kontrollpunkter och undo passerar. Produktionsrouting, blandade protokoll, tidigare arbetsfil och PDF-export/återöppning passerar. Kundförhandsvisning är pixelidentisk med exporterad PDF; serviceöversikt, placering, undo och offlineåteröppning passerar.

Webb och iOS-källa speglas till v2.4.319. Verifiering är webbläsarsimulering, inte fysisk iPhone/iPad eller ny signerad TestFlight-build. Native-källan saknar fortsatt CE-modulen.

Känd separat begränsning: äldre fristående security.html/security.js har ett befintligt onclick-fel vid saknad secToggleOverlays-knapp. Samma fel verifierades före och efter temarättningen; inget nytt runtime-fel tillkommer. Ordinarie Kontrollflöde och revisionsflödet passerar sina runtime-/exporttester.
